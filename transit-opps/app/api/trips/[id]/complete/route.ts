import { NextRequest } from 'next/server';
import { requireRole, UserRole, handleAuthError } from '@/lib/rbac';
import { completeTrip, completeTripSchema, getTrip } from '@/services/trip.service';
import { handleServiceError } from '@/services/vehicle.service';

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = requireRole(req, UserRole.FLEET_MANAGER, UserRole.DISPATCHER, UserRole.DRIVER);
    const { id } = await params;

    // Drivers may only complete their own assigned trip
    if (user.role === UserRole.DRIVER) {
      const trip = await getTrip(id);
      if (trip.driverId !== user.driverId) {
        return Response.json({ error: 'Forbidden — you can only complete your own trips' }, { status: 403 });
      }
    }

    const body = await req.json();
    const parsed = completeTripSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const trip = await completeTrip(id, parsed.data);
    return Response.json(trip);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}

