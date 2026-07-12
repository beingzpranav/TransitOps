import { NextRequest } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/rbac';
import { startTrip } from '@/services/trip.service';
import { handleServiceError } from '@/services/vehicle.service';

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(req);
    if (!user.driverId) {
      return Response.json({ error: 'Forbidden — only drivers can start trips' }, { status: 403 });
    }
    const { id } = await params;
    const trip = await startTrip(id, user.driverId);
    return Response.json(trip);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}
