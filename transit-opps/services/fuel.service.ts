import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ServiceError } from './vehicle.service';

export const createFuelLogSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle is required'),
  liters: z.number().positive('Liters must be > 0'),
  cost: z.number().min(0, 'Cost must be ≥ 0'),
  date: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  tripId: z.string().optional(),
});

export async function listFuelLogs(filters?: { vehicleId?: string; tripId?: string }) {
  return prisma.fuelLog.findMany({
    where: {
      ...(filters?.vehicleId ? { vehicleId: filters.vehicleId } : {}),
      ...(filters?.tripId ? { tripId: filters.tripId } : {}),
    },
    include: {
      vehicle: { select: { id: true, registrationNumber: true, name: true } },
      trip: { select: { id: true, source: true, destination: true } },
    },
    orderBy: { date: 'desc' },
  });
}

export async function createFuelLog(data: z.infer<typeof createFuelLogSchema>) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } });
  if (!vehicle) throw new ServiceError('Vehicle not found', 404);

  return prisma.fuelLog.create({
    data: {
      vehicleId: data.vehicleId,
      liters: data.liters,
      cost: data.cost,
      date: data.date ? new Date(data.date) : new Date(),
      ...(data.tripId ? { tripId: data.tripId } : {}),
    },
    include: {
      vehicle: { select: { id: true, registrationNumber: true, name: true } },
    },
  });
}
