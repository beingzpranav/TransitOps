import { NextRequest } from 'next/server';
import { requireAuth, requireRole, UserRole, handleAuthError } from '@/lib/rbac';
import {
  getVehicle,
  updateVehicle,
  retireVehicle,
  updateVehicleSchema,
  handleServiceError,
} from '@/services/vehicle.service';

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    requireAuth(req);
    const { id } = await params;
    const vehicle = await getVehicle(id);
    return Response.json(vehicle);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    requireRole(req, UserRole.FLEET_MANAGER);
    const { id } = await params;
    const body = await req.json();
    const parsed = updateVehicleSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const vehicle = await updateVehicle(id, parsed.data);
    return Response.json(vehicle);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    requireRole(req, UserRole.FLEET_MANAGER);
    const { id } = await params;
    const vehicle = await retireVehicle(id);
    return Response.json(vehicle);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}
