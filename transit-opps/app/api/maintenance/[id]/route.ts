import { NextRequest } from 'next/server';
import { requireAuth, requireRole, UserRole, handleAuthError } from '@/lib/rbac';
import {
  getMaintenance,
  closeMaintenance,
} from '@/services/maintenance.service';
import { handleServiceError } from '@/services/vehicle.service';

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    requireAuth(req);
    const { id } = await params;
    const record = await getMaintenance(id);
    return Response.json(record);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    requireRole(req, UserRole.FLEET_MANAGER);
    const { id } = await params;
    const record = await closeMaintenance(id);
    return Response.json(record);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}
