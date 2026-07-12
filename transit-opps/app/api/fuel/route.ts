import { NextRequest } from 'next/server';
import { requireAuth, requireRole, UserRole, handleAuthError } from '@/lib/rbac';
import { listFuelLogs, createFuelLog, createFuelLogSchema } from '@/services/fuel.service';
import { handleServiceError } from '@/services/vehicle.service';

export async function GET(req: NextRequest) {
  try {
    requireRole(req, UserRole.FLEET_MANAGER, UserRole.FINANCIAL_ANALYST);
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get('vehicleId') ?? undefined;
    const tripId = searchParams.get('tripId') ?? undefined;
    const logs = await listFuelLogs({ vehicleId, tripId });
    return Response.json(logs);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    requireRole(req, UserRole.FLEET_MANAGER, UserRole.FINANCIAL_ANALYST);
    const body = await req.json();
    const parsed = createFuelLogSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const log = await createFuelLog(parsed.data);
    return Response.json(log, { status: 201 });
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}
