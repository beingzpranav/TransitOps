import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { VehicleStatus, DriverStatus, TripStatus } from '@/app/generated/prisma/client';
import { ServiceError } from './vehicle.service';

// ─── Validation Schemas ────────────────────────────────────────────────────

export const createTripSchema = z.object({
  source: z.string().min(1, 'Source is required'),
  destination: z.string().min(1, 'Destination is required'),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  driverId: z.string().min(1, 'Driver is required'),
  cargoWeight: z.number().positive('Cargo weight must be > 0'),
  plannedDistance: z.number().positive('Planned distance must be > 0'),
  revenuePerTrip: z.number().min(0).optional(),
});

export const completeTripSchema = z.object({
  finalOdometer: z.number().min(0, 'Final odometer must be ≥ 0'),
  fuelConsumed: z.number().min(0, 'Fuel consumed must be ≥ 0'),
  fuelCost: z.number().min(0, 'Fuel cost must be ≥ 0'),
  revenuePerTrip: z.number().min(0).optional(),
});

// ─── Validation Helpers ────────────────────────────────────────────────────

async function validateTripPrerequisites(vehicleId: string, driverId: string, cargoWeight: number) {
  const [vehicle, driver] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id: vehicleId } }),
    prisma.driver.findUnique({ where: { id: driverId } }),
  ]);

  if (!vehicle) throw new ServiceError('Vehicle not found', 404);
  if (!driver) throw new ServiceError('Driver not found', 404);

  // Vehicle must be Available
  if (vehicle.status !== VehicleStatus.Available) {
    throw new ServiceError(
      `Vehicle is not available for dispatch (current status: ${vehicle.status})`,
      400
    );
  }

  // Driver must not be suspended
  if (driver.status === DriverStatus.Suspended) {
    throw new ServiceError('Cannot assign a suspended driver to a trip', 400);
  }

  // Driver must be Available
  if (driver.status !== DriverStatus.Available) {
    throw new ServiceError(
      `Driver is not available for dispatch (current status: ${driver.status})`,
      400
    );
  }

  // Driver license must not be expired
  if (new Date(driver.licenseExpiry) < new Date()) {
    throw new ServiceError(
      `Driver's license expired on ${driver.licenseExpiry.toISOString().split('T')[0]}`,
      400
    );
  }

  // Cargo weight must not exceed vehicle capacity
  if (cargoWeight > vehicle.maxLoadCapacity) {
    throw new ServiceError(
      `Cargo weight (${cargoWeight} kg) exceeds vehicle's max load capacity (${vehicle.maxLoadCapacity} kg)`,
      400
    );
  }

  return { vehicle, driver };
}

// ─── Service Functions ─────────────────────────────────────────────────────

export async function listTrips(filters?: {
  status?: TripStatus;
  vehicleId?: string;
  driverId?: string;
  createdById?: string;
}) {
  return prisma.trip.findMany({
    where: {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.vehicleId ? { vehicleId: filters.vehicleId } : {}),
      ...(filters?.driverId ? { driverId: filters.driverId } : {}),
      ...(filters?.createdById ? { createdById: filters.createdById } : {}),
    },
    include: {
      vehicle: { select: { id: true, registrationNumber: true, name: true } },
      driver: { select: { id: true, name: true, licenseNumber: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTrip(id: string) {
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      vehicle: true,
      driver: true,
      createdBy: { select: { id: true, name: true, email: true } },
      fuelLogs: true,
    },
  });
  if (!trip) throw new ServiceError('Trip not found', 404);
  return trip;
}

export async function createTrip(
  data: z.infer<typeof createTripSchema>,
  createdById: string
) {
  // Validate prerequisites (pre-transaction check — full atomic check happens on dispatch)
  await validateTripPrerequisites(data.vehicleId, data.driverId, data.cargoWeight);

  return prisma.trip.create({
    data: {
      source: data.source,
      destination: data.destination,
      vehicleId: data.vehicleId,
      driverId: data.driverId,
      createdById,
      cargoWeight: data.cargoWeight,
      plannedDistance: data.plannedDistance,
      revenuePerTrip: data.revenuePerTrip,
      status: TripStatus.Draft,
    },
    include: {
      vehicle: { select: { id: true, registrationNumber: true, name: true } },
      driver: { select: { id: true, name: true } },
    },
  });
}

export async function dispatchTrip(tripId: string) {
  // Run everything in a single transaction to prevent double-booking
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, driver: true },
    });

    if (!trip) throw new ServiceError('Trip not found', 404);
    if (trip.status !== TripStatus.Draft) {
      throw new ServiceError(`Trip cannot be dispatched (current status: ${trip.status})`, 400);
    }

    // Re-validate all constraints atomically inside the transaction
    const { vehicle, driver } = trip;

    if (vehicle.status !== VehicleStatus.Available) {
      throw new ServiceError(
        `Vehicle is no longer available (status: ${vehicle.status})`,
        400
      );
    }
    if (driver.status === DriverStatus.Suspended) {
      throw new ServiceError('Driver is suspended and cannot be dispatched', 400);
    }
    if (driver.status !== DriverStatus.Available) {
      throw new ServiceError(
        `Driver is no longer available (status: ${driver.status})`,
        400
      );
    }
    if (new Date(driver.licenseExpiry) < new Date()) {
      throw new ServiceError("Driver's license has expired", 400);
    }
    if (trip.cargoWeight > vehicle.maxLoadCapacity) {
      throw new ServiceError('Cargo weight exceeds vehicle capacity', 400);
    }

    // Atomic: update trip + vehicle + driver in one transaction
    const [updatedTrip] = await Promise.all([
      tx.trip.update({
        where: { id: tripId },
        data: { status: TripStatus.Dispatched },
        include: {
          vehicle: { select: { id: true, registrationNumber: true, name: true } },
          driver: { select: { id: true, name: true } },
        },
      }),
      tx.vehicle.update({
        where: { id: vehicle.id },
        data: { status: VehicleStatus.OnTrip },
      }),
      tx.driver.update({
        where: { id: driver.id },
        data: { status: DriverStatus.OnTrip },
      }),
    ]);

    return updatedTrip;
  });
}

export async function completeTrip(
  tripId: string,
  data: z.infer<typeof completeTripSchema>
) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, driver: true },
    });

    if (!trip) throw new ServiceError('Trip not found', 404);
    if (trip.status !== TripStatus.Dispatched) {
      throw new ServiceError(`Only dispatched trips can be completed (current status: ${trip.status})`, 400);
    }

    const revenue = data.revenuePerTrip ?? trip.revenuePerTrip ?? undefined;

    // Atomic: complete trip + restore vehicle+driver + create fuel log
    const [updatedTrip] = await Promise.all([
      tx.trip.update({
        where: { id: tripId },
        data: {
          status: TripStatus.Completed,
          finalOdometer: data.finalOdometer,
          fuelConsumed: data.fuelConsumed,
          ...(revenue !== undefined ? { revenuePerTrip: revenue } : {}),
        },
        include: {
          vehicle: { select: { id: true, registrationNumber: true, name: true } },
          driver: { select: { id: true, name: true } },
        },
      }),
      tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: {
          status: VehicleStatus.Available,
          odometer: data.finalOdometer,
        },
      }),
      tx.driver.update({
        where: { id: trip.driverId },
        data: { status: DriverStatus.Available },
      }),
      tx.fuelLog.create({
        data: {
          vehicleId: trip.vehicleId,
          tripId: trip.id,
          liters: data.fuelConsumed,
          cost: data.fuelCost,
          date: new Date(),
        },
      }),
    ]);

    return updatedTrip;
  });
}

export async function cancelTrip(tripId: string) {
  return prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, driver: true },
    });

    if (!trip) throw new ServiceError('Trip not found', 404);
    if (
      trip.status !== TripStatus.Draft &&
      trip.status !== TripStatus.Dispatched
    ) {
      throw new ServiceError(
        `Trip cannot be cancelled (current status: ${trip.status})`,
        400
      );
    }

    const wasDispatched = trip.status === TripStatus.Dispatched;

    const ops: Promise<unknown>[] = [
      tx.trip.update({
        where: { id: tripId },
        data: { status: TripStatus.Cancelled },
      }),
    ];

    // Only restore vehicle+driver status if the trip was dispatched (they were locked)
    if (wasDispatched) {
      ops.push(
        tx.vehicle.update({
          where: { id: trip.vehicleId },
          data: { status: VehicleStatus.Available },
        }),
        tx.driver.update({
          where: { id: trip.driverId },
          data: { status: DriverStatus.Available },
        })
      );
    }

    await Promise.all(ops);

    return { id: tripId, status: TripStatus.Cancelled };
  });
}
