import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { VehicleStatus } from '@/app/generated/prisma/client';

// ─── Validation Schemas ────────────────────────────────────────────────────

export const createVehicleSchema = z.object({
  registrationNumber: z.string().min(1, 'Registration number is required'),
  name: z.string().min(1, 'Vehicle name is required'),
  type: z.string().min(1, 'Vehicle type is required'),
  maxLoadCapacity: z.number().positive('Max load capacity must be > 0'),
  odometer: z.number().min(0, 'Odometer must be ≥ 0').default(0),
  acquisitionCost: z.number().min(0, 'Acquisition cost must be ≥ 0'),
  region: z.string().optional(),
});

export const updateVehicleSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  maxLoadCapacity: z.number().positive().optional(),
  odometer: z.number().min(0).optional(),
  acquisitionCost: z.number().min(0).optional(),
  region: z.string().optional(),
  status: z.enum(['Retired']).optional(), // Only manual status change allowed
});

// ─── Service Functions ─────────────────────────────────────────────────────

export async function listVehicles(filters?: {
  status?: VehicleStatus;
  type?: string;
  region?: string;
}) {
  return prisma.vehicle.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.type ? { type: filters.type } : {}),
      ...(filters?.region ? { region: filters.region } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getVehicle(id: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      trips: { orderBy: { createdAt: 'desc' }, take: 10 },
      maintenanceLogs: { orderBy: { dateOpened: 'desc' }, take: 5 },
      fuelLogs: { orderBy: { date: 'desc' }, take: 10 },
      expenses: { orderBy: { date: 'desc' }, take: 10 },
    },
  });
  if (!vehicle) throw new ServiceError('Vehicle not found', 404);
  return vehicle;
}

export async function createVehicle(data: z.infer<typeof createVehicleSchema>) {
  // Check unique registration number
  const existing = await prisma.vehicle.findUnique({
    where: { registrationNumber: data.registrationNumber },
  });
  if (existing) {
    throw new ServiceError(
      `A vehicle with registration number "${data.registrationNumber}" already exists`,
      409
    );
  }

  return prisma.vehicle.create({ data });
}

export async function updateVehicle(
  id: string,
  data: z.infer<typeof updateVehicleSchema>
) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) throw new ServiceError('Vehicle not found', 404);

  // Cannot manually change status of OnTrip or InShop vehicles (system-managed)
  if (
    data.status === 'Retired' &&
    (vehicle.status === VehicleStatus.OnTrip || vehicle.status === VehicleStatus.InShop)
  ) {
    throw new ServiceError(
      'Cannot retire a vehicle that is currently On Trip or In Shop',
      400
    );
  }

  return prisma.vehicle.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.maxLoadCapacity !== undefined ? { maxLoadCapacity: data.maxLoadCapacity } : {}),
      ...(data.odometer !== undefined ? { odometer: data.odometer } : {}),
      ...(data.acquisitionCost !== undefined ? { acquisitionCost: data.acquisitionCost } : {}),
      ...(data.region !== undefined ? { region: data.region } : {}),
      ...(data.status === 'Retired' ? { status: VehicleStatus.Retired } : {}),
    },
  });
}

export async function retireVehicle(id: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) throw new ServiceError('Vehicle not found', 404);
  if (vehicle.status === VehicleStatus.OnTrip || vehicle.status === VehicleStatus.InShop) {
    throw new ServiceError('Cannot retire a vehicle that is On Trip or In Shop', 400);
  }
  return prisma.vehicle.update({ where: { id }, data: { status: VehicleStatus.Retired } });
}

// ─── Error Class ───────────────────────────────────────────────────────────

export class ServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export function handleServiceError(err: unknown): Response {
  if (err instanceof ServiceError) {
    return Response.json({ error: err.message }, { status: err.statusCode });
  }
  console.error(err);
  return Response.json({ error: 'Internal server error' }, { status: 500 });
}
