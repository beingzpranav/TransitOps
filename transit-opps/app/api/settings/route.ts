import { NextRequest } from 'next/server';
import { requireAuth, requireRole, UserRole, handleAuthError } from '@/lib/rbac';
import {
  getSystemSettings,
  updateSystemSettings,
  systemSettingSchema,
} from '@/services/settings.service';
import { handleServiceError } from '@/services/vehicle.service';

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const settings = await getSystemSettings();
    return Response.json(settings);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    requireRole(req, UserRole.FLEET_MANAGER);
    const body = await req.json();
    const parsed = systemSettingSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const settings = await updateSystemSettings(parsed.data);
    return Response.json(settings);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}
