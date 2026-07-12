import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { VehicleStatus, DriverStatus, TripStatus } from '@/app/generated/prisma/client';
import { ServiceError } from './vehicle.service';
import { sendEmail } from '@/lib/mail';
import { createNotification } from '@/lib/notifications';

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
      fuelLogs: true,
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
  // Guard: verify the caller's userId still exists (catches stale JWTs after DB resets)
  const userExists = await prisma.user.findUnique({ where: { id: createdById }, select: { id: true } });
  if (!userExists) {
    throw new ServiceError('Session expired — please log out and log back in', 401);
  }

  // Validate prerequisites (pre-transaction check — full atomic check happens on dispatch)
  await validateTripPrerequisites(data.vehicleId, data.driverId, data.cargoWeight);

  const trip = await prisma.trip.create({
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
      driver: { select: { id: true, name: true, email: true } },
    },
  });

  if (trip.driver?.email) {
    sendEmail({
      to: trip.driver.email,
      subject: `New Trip Assignment (Draft): ${trip.source} to ${trip.destination}`,
      templateName: 'trip_created',
      props: {
        driverName: trip.driver.name,
        source: trip.source,
        destination: trip.destination,
        vehicleReg: trip.vehicle.registrationNumber,
        vehicleName: trip.vehicle.name,
        cargoWeight: trip.cargoWeight,
        plannedDistance: trip.plannedDistance,
      },
      triggerEvent: 'Trip Created',
    }).catch((err) => {
      console.error('Failed to trigger driver assignment email:', err);
    });
  }

  return trip;
}


export async function dispatchTrip(tripId: string) {
  // Run everything in a single transaction to prevent double-booking
  const updatedTrip = await prisma.$transaction(async (tx) => {
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
    const [res] = await Promise.all([
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

    // Trigger basic in-app notification
    createNotification(
      `Trip from ${trip.source} to ${trip.destination} has been dispatched.`,
      'Trip Dispatched'
    );

    return res;
  });

  // Asynchronously trigger driver dispatch email notification
  try {
    const fullTrip = await prisma.trip.findUnique({
      where: { id: updatedTrip.id },
      include: { driver: true, vehicle: true, createdBy: true },
    });
    if (fullTrip && fullTrip.driver) {
      // Email to driver (only if they have an email on file)
      if (fullTrip.driver.email) {
        sendEmail({
          to: fullTrip.driver.email,
          subject: `New Trip Assignment: ${fullTrip.source} to ${fullTrip.destination}`,
          templateName: 'trip_dispatched',
          props: {
            driverName: fullTrip.driver.name,
            source: fullTrip.source,
            destination: fullTrip.destination,
            vehicleReg: fullTrip.vehicle.registrationNumber,
            vehicleName: fullTrip.vehicle.name,
            cargoWeight: fullTrip.cargoWeight,
            plannedDistance: fullTrip.plannedDistance,
          },
          triggerEvent: 'Trip Dispatched',
        });
      }

      // Email to dispatcher/creator
      if (fullTrip.createdBy?.email) {
        sendEmail({
          to: fullTrip.createdBy.email,
          subject: `Trip Dispatched Confirmation: ${fullTrip.source} to ${fullTrip.destination}`,
          templateName: 'trip_dispatched',
          props: {
            driverName: fullTrip.driver.name,
            source: fullTrip.source,
            destination: fullTrip.destination,
            vehicleReg: fullTrip.vehicle.registrationNumber,
            vehicleName: fullTrip.vehicle.name,
            cargoWeight: fullTrip.cargoWeight,
            plannedDistance: fullTrip.plannedDistance,
          },
          triggerEvent: 'Trip Dispatched',
        });
      }
    }
  } catch (err) {
    console.error('Failed to send trip dispatch email:', err);
  }

  return updatedTrip;
}

export async function completeTrip(
  tripId: string,
  data: z.infer<typeof completeTripSchema>
) {
  const updatedTrip = await prisma.$transaction(async (tx) => {
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
    const [res] = await Promise.all([
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

    // Trigger basic in-app notification
    createNotification(
      `Trip from ${trip.source} to ${trip.destination} has been completed successfully.`,
      'Trip Completed'
    );

    return res;
  });

  // Asynchronously trigger completed email notification to the manager/dispatcher
  try {
    const fullTrip = await prisma.trip.findUnique({
      where: { id: updatedTrip.id },
      include: { driver: true, vehicle: true, createdBy: true },
    });
    if (fullTrip && fullTrip.driver) {
      // Email to the creator's respective email id
      if (fullTrip.createdBy?.email) {
        sendEmail({
          to: fullTrip.createdBy.email,
          subject: `Trip Completed Summary: ${fullTrip.source} to ${fullTrip.destination}`,
          templateName: 'trip_completed',
          props: {
            tripId: fullTrip.id,
            source: fullTrip.source,
            destination: fullTrip.destination,
            driverName: fullTrip.driver.name,
            vehicleReg: fullTrip.vehicle.registrationNumber,
            vehicleName: fullTrip.vehicle.name,
            finalOdometer: data.finalOdometer,
            fuelConsumed: data.fuelConsumed,
            fuelCost: data.fuelCost,
            revenue: updatedTrip.revenuePerTrip ?? 0,
          },
          triggerEvent: 'Trip Completed',
        });
      }

      // Also send a copy of the completed trip summary (invoice) directly to the driver
      if (fullTrip.driver.email) {
        sendEmail({
          to: fullTrip.driver.email,
          subject: `Trip Completed Invoice: ${fullTrip.source} to ${fullTrip.destination}`,
          templateName: 'trip_completed',
          props: {
            tripId: fullTrip.id,
            source: fullTrip.source,
            destination: fullTrip.destination,
            driverName: fullTrip.driver.name,
            vehicleReg: fullTrip.vehicle.registrationNumber,
            vehicleName: fullTrip.vehicle.name,
            finalOdometer: data.finalOdometer,
            fuelConsumed: data.fuelConsumed,
            fuelCost: data.fuelCost,
            revenue: updatedTrip.revenuePerTrip ?? 0,
          },
          triggerEvent: 'Trip Completed',
        });
      }

      // Also send a copy to all Fleet Managers on their respective email ids
      const managers = await prisma.user.findMany({
        where: { role: 'FLEET_MANAGER', email: { not: fullTrip.createdBy?.email } },
      });
      for (const m of managers) {
        sendEmail({
          to: m.email,
          subject: `[Fleet Ops Alert] Trip Completed Summary: ${fullTrip.source} to ${fullTrip.destination}`,
          templateName: 'trip_completed',
          props: {
            tripId: fullTrip.id,
            source: fullTrip.source,
            destination: fullTrip.destination,
            driverName: fullTrip.driver.name,
            vehicleReg: fullTrip.vehicle.registrationNumber,
            vehicleName: fullTrip.vehicle.name,
            finalOdometer: data.finalOdometer,
            fuelConsumed: data.fuelConsumed,
            fuelCost: data.fuelCost,
            revenue: updatedTrip.revenuePerTrip ?? 0,
          },
          triggerEvent: 'Trip Completed',
        });
      }
    }
  } catch (err) {
    console.error('Failed to send trip completed email:', err);
  }

  return updatedTrip;
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

    // Trigger basic in-app notification
    createNotification(
      `Trip from ${trip.source} to ${trip.destination} has been cancelled.`,
      'Trip Cancelled'
    );

    return { id: tripId, status: TripStatus.Cancelled };
  });
}

export async function startTrip(tripId: string, driverId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) throw new ServiceError('Trip not found', 404);

  // verify ownership
  if (trip.driverId !== driverId) {
    throw new ServiceError('Forbidden — you are not the driver assigned to this trip', 403);
  }

  // check status and actualStartTime
  if (trip.status !== TripStatus.Dispatched) {
    throw new ServiceError(`Trip must be in Dispatched status to start (current: ${trip.status})`, 400);
  }

  if (trip.actualStartTime !== null) {
    throw new ServiceError('Trip has already started', 400);
  }

  // Atomic update
  const updatedTrip = await prisma.trip.update({
    where: { id: tripId },
    data: { actualStartTime: new Date() },
  });

  // Trigger basic in-app notification
  createNotification(
    `Driver has started the trip from ${trip.source} to ${trip.destination}.`,
    'Trip Started'
  );

  return updatedTrip;
}

export async function recordLocationPing(
  tripId: string,
  driverId: string,
  latitude: number,
  longitude: number
) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) throw new ServiceError('Trip not found', 404);

  // verify ownership
  if (trip.driverId !== driverId) {
    throw new ServiceError('Forbidden — you are not the driver assigned to this trip', 403);
  }

  // check status
  if (trip.status !== TripStatus.Dispatched) {
    throw new ServiceError(`Trip must be in progress (Dispatched) to record location (current: ${trip.status})`, 400);
  }

  const log = await prisma.tripLocationLog.create({
    data: {
      tripId,
      latitude,
      longitude,
      timestamp: new Date(),
    },
  });

  return log;
}

export async function getTripTimeline(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) throw new ServiceError('Trip not found', 404);

  const logs = await prisma.tripLocationLog.findMany({
    where: { tripId },
    orderBy: { timestamp: 'asc' },
  });

  return logs
    .map((log) => ({
      id: log.id,
      hour: log.id, // Using the unique log ID to prevent React key conflicts
      lat: log.latitude,
      lng: log.longitude,
      capturedAt: log.timestamp.toISOString(),
      timestamp: log.timestamp,
      latitude: log.latitude,
      longitude: log.longitude,
    }))
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // descending order (latest first)
}

