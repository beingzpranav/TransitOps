import { NextRequest } from 'next/server';
import { requireRole, UserRole, handleAuthError } from '@/lib/rbac';
import {
  getFuelEfficiency,
  getOperationalCost,
  getFleetUtilization,
  getVehicleROI,
} from '@/services/report.service';
import { handleServiceError } from '@/services/vehicle.service';
import { Parser } from 'json2csv';

export async function GET(req: NextRequest) {
  try {
    requireRole(req, UserRole.FLEET_MANAGER, UserRole.FINANCIAL_ANALYST);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') ?? 'fuel_efficiency';
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;
    const vehicleId = searchParams.get('vehicleId') ?? undefined;
    const format = searchParams.get('format') ?? 'json';
    const dateRange = from || to ? { from, to } : undefined;

    let data: unknown[];

    switch (type) {
      case 'fuel_efficiency':
        data = await getFuelEfficiency(vehicleId, dateRange);
        break;
      case 'operational_cost':
        data = await getOperationalCost(vehicleId, dateRange);
        break;
      case 'fleet_utilization':
        data = await getFleetUtilization(dateRange);
        break;
      case 'vehicle_roi':
        data = await getVehicleROI();
        break;
      default:
        return Response.json({ error: 'Unknown report type' }, { status: 400 });
    }

    if (format === 'csv') {
      const parser = new Parser();
      const csv = parser.parse(data as object[]);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return Response.json({ type, data });
  } catch (err) {
    return handleAuthError(err) ?? handleServiceError(err);
  }
}
