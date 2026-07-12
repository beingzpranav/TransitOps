import { NextRequest } from 'next/server';
import { requireAuth, requireRole, UserRole, handleAuthError } from '@/lib/rbac';
import {
  getDriver,
  updateDriver,
  suspendDriver,
  updateDriverSchema,
} from '@/services/driver.service';
import { handleServiceError } from '@/services/vehicle.service';

interface Params { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    requireAuth(req);
    const { id } = await params;
    const driver = await getDriver(id);
    return Response.json(driver);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    requireRole(req, UserRole.FLEET_MANAGER, UserRole.SAFETY_OFFICER);
    const { id } = await params;
    const body = await req.json();
    const parsed = updateDriverSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const driver = await updateDriver(id, parsed.data);
    return Response.json(driver);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}

// PATCH /api/drivers/[id] — suspend action (Safety Officer or Fleet Manager)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    requireRole(req, UserRole.FLEET_MANAGER, UserRole.SAFETY_OFFICER);
    const { id } = await params;
    const body = await req.json();
    if (body.action === 'suspend') {
      const driver = await suspendDriver(id);
      return Response.json(driver);
    }
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}
