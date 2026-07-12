import { NextRequest } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/rbac';
import { getTripTimeline } from '@/services/trip.service';
import { handleServiceError } from '@/services/vehicle.service';

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    requireAuth(req);
    const { id } = await params;
    const timeline = await getTripTimeline(id);
    return Response.json({ timeline });
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}
