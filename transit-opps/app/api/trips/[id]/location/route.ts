import { NextRequest } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/rbac';
import { recordLocationPing } from '@/services/trip.service';
import { handleServiceError } from '@/services/vehicle.service';
import { z } from 'zod';

interface Params { params: Promise<{ id: string }> }

const locationSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = requireAuth(req);
    if (!user.driverId) {
      return Response.json({ error: 'Forbidden — only drivers can submit location logs' }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json();
    const parsed = locationSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: 'Invalid coordinates format' }, { status: 400 });
    }
    const latitude = parsed.data.latitude ?? parsed.data.lat;
    const longitude = parsed.data.longitude ?? parsed.data.lng;
    if (latitude === undefined || longitude === undefined) {
      return Response.json({ error: 'Invalid coordinates. Require latitude/longitude or lat/lng.' }, { status: 400 });
    }
    const log = await recordLocationPing(id, user.driverId, latitude, longitude);
    return Response.json(log, { status: 201 });
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}
