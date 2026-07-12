import { NextRequest } from 'next/server';
import { requireAuth, requireRole, UserRole, handleAuthError } from '@/lib/rbac';
import {
  listVehicles,
  createVehicle,
  createVehicleSchema,
  handleServiceError,
} from '@/services/vehicle.service';
import { VehicleStatus } from '@/app/generated/prisma/client';

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as VehicleStatus | null;
    const type = searchParams.get('type');
    const region = searchParams.get('region');
    const vehicles = await listVehicles({
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(region ? { region } : {}),
    });
    return Response.json(vehicles);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    requireRole(req, UserRole.FLEET_MANAGER);
    const body = await req.json();
    const parsed = createVehicleSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const vehicle = await createVehicle(parsed.data);
    return Response.json(vehicle, { status: 201 });
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}
