import { NextRequest } from 'next/server';
import { requireAuth, requireRole, UserRole, handleAuthError } from '@/lib/rbac';
import {
  listMaintenance,
  openMaintenance,
  createMaintenanceSchema,
} from '@/services/maintenance.service';
import { handleServiceError } from '@/services/vehicle.service';

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get('vehicleId') ?? undefined;
    const logs = await listMaintenance(vehicleId);
    return Response.json(logs);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    requireRole(req, UserRole.FLEET_MANAGER);
    const body = await req.json();
    const parsed = createMaintenanceSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const log = await openMaintenance(parsed.data);
    return Response.json(log, { status: 201 });
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}
