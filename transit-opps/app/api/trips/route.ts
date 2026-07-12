import { NextRequest } from 'next/server';
import { requireAuth, requireRole, UserRole, handleAuthError } from '@/lib/rbac';
import { listTrips, createTrip, createTripSchema } from '@/services/trip.service';
import { handleServiceError } from '@/services/vehicle.service';
import { TripStatus } from '@/app/generated/prisma/client';

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as TripStatus | null;
    const vehicleId = searchParams.get('vehicleId');
    const driverId = searchParams.get('driverId');

    // DISPATCHER sees only their own trips
    const createdById =
      user.role === UserRole.DISPATCHER ? user.userId : searchParams.get('createdById') ?? undefined;

    const trips = await listTrips({
      ...(status ? { status } : {}),
      ...(vehicleId ? { vehicleId } : {}),
      ...(driverId ? { driverId } : {}),
      ...(createdById ? { createdById } : {}),
    });
    return Response.json(trips);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = requireRole(req, UserRole.FLEET_MANAGER, UserRole.DISPATCHER);
    const body = await req.json();
    const parsed = createTripSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const trip = await createTrip(parsed.data, user.userId);
    return Response.json(trip, { status: 201 });
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}
