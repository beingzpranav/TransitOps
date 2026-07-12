import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { DriverStatus } from '@/app/generated/prisma/client';
import { ServiceError } from './vehicle.service';

// ─── Validation Schemas ────────────────────────────────────────────────────

export const createDriverSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  licenseNumber: z.string().min(1, 'License number is required'),
  licenseCategory: z.string().min(1, 'License category is required'),
  licenseExpiry: z.string().datetime({ offset: true }).or(z.string().date()),
  contactNumber: z.string().min(1, 'Contact number is required'),
  safetyScore: z.number().min(0).max(100).optional(),
  status: z.enum(['Available', 'OffDuty']).default('Available'),
});

export const updateDriverSchema = z.object({
  name: z.string().min(1).optional(),
  licenseNumber: z.string().min(1).optional(),
  licenseCategory: z.string().min(1).optional(),
  licenseExpiry: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  contactNumber: z.string().min(1).optional(),
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
      ...data,
      licenseExpiry: new Date(data.licenseExpiry),
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

  return prisma.driver.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.licenseNumber !== undefined ? { licenseNumber: data.licenseNumber } : {}),
      ...(data.licenseCategory !== undefined ? { licenseCategory: data.licenseCategory } : {}),
      ...(data.licenseExpiry !== undefined ? { licenseExpiry: new Date(data.licenseExpiry) } : {}),
      ...(data.contactNumber !== undefined ? { contactNumber: data.contactNumber } : {}),
      ...(data.safetyScore !== undefined ? { safetyScore: data.safetyScore } : {}),
      ...(data.status !== undefined ? { status: data.status as DriverStatus } : {}),
    },
  });
}

export async function suspendDriver(id: string) {
  const driver = await prisma.driver.findUnique({ where: { id } });
  if (!driver) throw new ServiceError('Driver not found', 404);
  return prisma.driver.update({ where: { id }, data: { status: DriverStatus.Suspended } });
}
