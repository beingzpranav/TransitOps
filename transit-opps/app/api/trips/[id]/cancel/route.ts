import { NextRequest } from 'next/server';
import { requireRole, UserRole, handleAuthError } from '@/lib/rbac';
import { cancelTrip } from '@/services/trip.service';
import { handleServiceError } from '@/services/vehicle.service';

interface Params { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    requireRole(req, UserRole.FLEET_MANAGER, UserRole.DISPATCHER);
    const { id } = await params;
    const result = await cancelTrip(id);
    return Response.json(result);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}
