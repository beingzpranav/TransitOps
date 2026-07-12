import { NextRequest } from 'next/server';
import { requireAuth, requireRole, UserRole, handleAuthError } from '@/lib/rbac';
import {
  listDrivers,
  createDriver,
  createDriverSchema,
} from '@/services/driver.service';
import { handleServiceError } from '@/services/vehicle.service';
import { DriverStatus } from '@/app/generated/prisma/client';

export async function GET(req: NextRequest) {
  try {
    requireRole(req, UserRole.FLEET_MANAGER, UserRole.SAFETY_OFFICER);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as DriverStatus | null;
    const licenseCategory = searchParams.get('licenseCategory');
    const drivers = await listDrivers({
      ...(status ? { status } : {}),
      ...(licenseCategory ? { licenseCategory } : {}),
    });
    return Response.json(drivers);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    requireRole(req, UserRole.FLEET_MANAGER, UserRole.SAFETY_OFFICER);
    const body = await req.json();
    const parsed = createDriverSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const driver = await createDriver(parsed.data);
    return Response.json(driver, { status: 201 });
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}
