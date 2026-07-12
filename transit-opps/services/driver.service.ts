import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { DriverStatus } from '@/app/generated/prisma/client';
import { ServiceError } from './vehicle.service';
import { sendEmail } from '@/lib/mail';
import { createNotification } from '@/lib/notifications';

// ─── Validation Schemas ────────────────────────────────────────────────────

export const createDriverSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  licenseNumber: z.string().min(1, 'License number is required'),
  licenseCategory: z.string().min(1, 'License category is required'),
  licenseExpiry: z.string().datetime({ offset: true }).or(z.string().date()),
  contactNumber: z.string().min(1, 'Contact number is required').regex(/^\+91/, 'Contact number must start with +91'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  safetyScore: z.number().min(0).max(100).optional(),
  status: z.enum(['Available', 'OffDuty']).default('Available'),
});

export const updateDriverSchema = z.object({
  name: z.string().min(1).optional(),
  licenseNumber: z.string().min(1).optional(),
  licenseCategory: z.string().min(1).optional(),
  licenseExpiry: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  contactNumber: z.string().min(1).regex(/^\+91/, 'Contact number must start with +91').optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  safetyScore: z.number().min(0).max(100).optional(),
  status: z.enum(['Available', 'OffDuty', 'Suspended']).optional(),
});

// ─── Service Functions ─────────────────────────────────────────────────────

export async function listDrivers(filters?: {
  status?: DriverStatus;
  licenseCategory?: string;
}) {
  return prisma.driver.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.licenseCategory ? { licenseCategory: filters.licenseCategory } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getDriver(id: string) {
  const driver = await prisma.driver.findUnique({
    where: { id },
    include: { trips: { orderBy: { createdAt: 'desc' }, take: 10 } },
  });
  if (!driver) throw new ServiceError('Driver not found', 404);
  return driver;
}

export async function createDriver(data: z.infer<typeof createDriverSchema>) {
  const existing = await prisma.driver.findUnique({
    where: { licenseNumber: data.licenseNumber },
  });
  if (existing) {
    throw new ServiceError(
      `A driver with license number "${data.licenseNumber}" already exists`,
      409
    );
  }

  return prisma.driver.create({
    data: {
      name: data.name,
      licenseNumber: data.licenseNumber,
      licenseCategory: data.licenseCategory,
      licenseExpiry: new Date(data.licenseExpiry),
      contactNumber: data.contactNumber,
      email: data.email || null,
      safetyScore: data.safetyScore,
      status: data.status as DriverStatus,
    },
  });
}

export async function updateDriver(
  id: string,
  data: z.infer<typeof updateDriverSchema>
) {
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) throw new ServiceError('Driver not found', 404);

  // OnTrip is system-managed only
  if (data.status === 'Available' && driver.status === DriverStatus.OnTrip) {
    throw new ServiceError(
      'Cannot manually set a driver to Available while On Trip — complete or cancel the trip first',
      400
    );
  }

  const updatedDriver = await prisma.driver.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.licenseNumber !== undefined ? { licenseNumber: data.licenseNumber } : {}),
      ...(data.licenseCategory !== undefined ? { licenseCategory: data.licenseCategory } : {}),
      ...(data.licenseExpiry !== undefined ? { licenseExpiry: new Date(data.licenseExpiry) } : {}),
      ...(data.contactNumber !== undefined ? { contactNumber: data.contactNumber } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.safetyScore !== undefined ? { safetyScore: data.safetyScore } : {}),
      ...(data.status !== undefined ? { status: data.status as DriverStatus } : {}),
    },
  });

  if (data.status === 'Suspended' && driver.status !== DriverStatus.Suspended) {
    try {
      // Send to driver (if they have an email on file)
      if (updatedDriver.email) {
        sendEmail({
          to: updatedDriver.email,
          subject: `Compliance Alert: Your Driver Status is Suspended — ${updatedDriver.name}`,
          templateName: 'driver_suspended',
          props: {
            driverName: updatedDriver.name,
            licenseNumber: updatedDriver.licenseNumber,
            safetyScore: updatedDriver.safetyScore,
          },
          triggerEvent: 'Driver Suspended',
        });
      }

      // Also send to all safety officers
      const officers = await prisma.user.findMany({
        where: { role: 'SAFETY_OFFICER' },
      });
      for (const s of officers) {
        sendEmail({
          to: s.email,
          subject: `[Safety Alert] Driver Suspended: ${updatedDriver.name}`,
          templateName: 'driver_suspended',
          props: {
            driverName: updatedDriver.name,
            licenseNumber: updatedDriver.licenseNumber,
            safetyScore: updatedDriver.safetyScore,
          },
          triggerEvent: 'Driver Suspended',
        });
      }
      // Trigger basic in-app notification
      createNotification(
        `Driver ${updatedDriver.name} has been suspended.`,
        'Driver Suspended'
      );
    } catch (err) {
      console.error('Failed to send driver suspension email:', err);
    }
  }

  return updatedDriver;
}

export async function suspendDriver(id: string) {
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) throw new ServiceError('Driver not found', 404);
  const updatedDriver = await prisma.driver.update({ where: { id }, data: { status: DriverStatus.Suspended } });

  // Trigger suspension email to driver and safety officers
  try {
    // Send to driver (only if they have an email on record)
    if (updatedDriver.email) {
      sendEmail({
        to: updatedDriver.email,
        subject: `Compliance Alert: Your Driver Status is Suspended — ${updatedDriver.name}`,
        templateName: 'driver_suspended',
        props: {
          driverName: updatedDriver.name,
          licenseNumber: updatedDriver.licenseNumber,
          safetyScore: updatedDriver.safetyScore,
        },
        triggerEvent: 'Driver Suspended',
      });
    }

    // Also send to all safety officers
    const officers = await prisma.user.findMany({
      where: { role: 'SAFETY_OFFICER' },
    });
    for (const s of officers) {
      sendEmail({
        to: s.email,
        subject: `[Safety Alert] Driver Suspended: ${updatedDriver.name}`,
        templateName: 'driver_suspended',
        props: {
          driverName: updatedDriver.name,
          licenseNumber: updatedDriver.licenseNumber,
          safetyScore: updatedDriver.safetyScore,
        },
        triggerEvent: 'Driver Suspended',
      });
    }
    // Trigger basic in-app notification
    createNotification(
      `Driver ${updatedDriver.name} has been suspended.`,
      'Driver Suspended'
    );
  } catch (err) {
    console.error('Failed to send driver suspension email:', err);
  }

  return updatedDriver;
}
