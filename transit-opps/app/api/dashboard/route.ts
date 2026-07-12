import { NextRequest } from 'next/server';
import { requireAuth, handleAuthError } from '@/lib/rbac';
import { getDashboardKPIs } from '@/services/report.service';
import { handleServiceError } from '@/services/vehicle.service';

export async function GET(req: NextRequest) {
  try {
    requireAuth(req);
    const { searchParams } = new URL(req.url);
    const vehicleType = searchParams.get('vehicleType') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const region = searchParams.get('region') ?? undefined;
    const kpis = await getDashboardKPIs({ vehicleType, status, region });
    return Response.json(kpis);
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}
