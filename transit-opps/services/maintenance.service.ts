import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { VehicleStatus } from '@/app/generated/prisma/client';
import { ServiceError } from './vehicle.service';
import { sendEmail } from '@/lib/mail';
import { createNotification } from '@/lib/notifications';

// ─── Validation Schemas ────────────────────────────────────────────────────

export const createMaintenanceSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  description: z.string().min(1, 'Description is required'),
  cost: z.number().min(0, 'Cost must be ≥ 0'),
  dateOpened: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
});

// ─── Service Functions ─────────────────────────────────────────────────────

export async function listMaintenance(vehicleId?: string) {
  return prisma.maintenanceLog.findMany({
    where: vehicleId ? { vehicleId } : {},
    include: {
      vehicle: { select: { id: true, registrationNumber: true, name: true } },
    },
    orderBy: { dateOpened: 'desc' },
  });
}

export async function getMaintenance(id: string) {
  const record = await prisma.maintenanceLog.findUnique({
    where: { id },
    include: { vehicle: true },
  });
  if (!record) throw new ServiceError('Maintenance record not found', 404);
  return record;
}

export async function openMaintenance(data: z.infer<typeof createMaintenanceSchema>) {
  const log = await prisma.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findUnique({ where: { id: data.vehicleId } });
    if (!vehicle) throw new ServiceError('Vehicle not found', 404);

    if (vehicle.status === VehicleStatus.OnTrip) {
      throw new ServiceError('Cannot open maintenance on a vehicle that is currently On Trip', 400);
    }
    if (vehicle.status === VehicleStatus.Retired) {
      throw new ServiceError('Cannot open maintenance on a retired vehicle', 400);
    }

    const [res] = await Promise.all([
      tx.maintenanceLog.create({
        data: {
          vehicleId: data.vehicleId,
          description: data.description,
          cost: data.cost,
          dateOpened: data.dateOpened ? new Date(data.dateOpened) : new Date(),
          isActive: true,
        },
        include: {
          vehicle: { select: { id: true, registrationNumber: true, name: true } },
        },
      }),
      tx.vehicle.update({
        where: { id: data.vehicleId },
        data: { status: VehicleStatus.InShop },
      }),
    ]);

    // Trigger basic in-app notification
    createNotification(
      `Maintenance opened: Vehicle ${res.vehicle.registrationNumber} (${res.vehicle.name}) is now In Shop.`,
      'Maintenance Opened'
    );

    return res;
  });

  // Asynchronously trigger maintenance opened email to all respective managers/safety officers
  try {
    const targets = await prisma.user.findMany({
      where: { role: { in: ['FLEET_MANAGER', 'SAFETY_OFFICER'] } },
    });
    for (const u of targets) {
      sendEmail({
        to: u.email,
        subject: `Maintenance Opened: Vehicle ${log.vehicle.registrationNumber} is In Shop`,
        templateName: 'maintenance_opened',
        props: {
          vehicleReg: log.vehicle.registrationNumber,
          vehicleName: log.vehicle.name,
          description: log.description,
          cost: log.cost,
        },
        triggerEvent: 'Maintenance Opened',
      });
    }
  } catch (err) {
    console.error('Failed to send maintenance opened email:', err);
  }

  return log;
}

export async function closeMaintenance(id: string) {
  const updatedRecord = await prisma.$transaction(async (tx) => {
    const record = await tx.maintenanceLog.findUnique({
      where: { id },
      include: { vehicle: true },
    });
    if (!record) throw new ServiceError('Maintenance record not found', 404);
    if (!record.isActive) throw new ServiceError('Maintenance record is already closed', 400);

    const vehicle = record.vehicle;

    // Restore to Available UNLESS the vehicle is Retired
    const newVehicleStatus =
      vehicle.status === VehicleStatus.Retired
        ? VehicleStatus.Retired
        : VehicleStatus.Available;

    const [res] = await Promise.all([
      tx.maintenanceLog.update({
        where: { id },
        data: { isActive: false, dateClosed: new Date() },
        include: {
          vehicle: { select: { id: true, registrationNumber: true, name: true } },
        },
      }),
      tx.vehicle.update({
        where: { id: vehicle.id },
        data: { status: newVehicleStatus },
      }),
    ]);

    // Trigger basic in-app notification
    createNotification(
      `Maintenance closed: Vehicle ${res.vehicle.registrationNumber} (${res.vehicle.name}) is now ${newVehicleStatus.toLowerCase()}.`,
      'Maintenance Closed'
    );

    return res;
  });

  // Asynchronously trigger maintenance closed email to all respective managers/safety officers
  try {
    const targets = await prisma.user.findMany({
      where: { role: { in: ['FLEET_MANAGER', 'SAFETY_OFFICER'] } },
    });
    for (const u of targets) {
      sendEmail({
        to: u.email,
        subject: `Maintenance Closed: Vehicle ${updatedRecord.vehicle.registrationNumber} is Available`,
        templateName: 'maintenance_closed',
        props: {
          vehicleReg: updatedRecord.vehicle.registrationNumber,
          vehicleName: updatedRecord.vehicle.name,
          description: updatedRecord.description,
          cost: updatedRecord.cost,
          dateOpened: updatedRecord.dateOpened.toISOString(),
        },
        triggerEvent: 'Maintenance Closed',
      });
    }
  } catch (err) {
    console.error('Failed to send maintenance closed email:', err);
  }

  return updatedRecord;
}
