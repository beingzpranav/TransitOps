import { prisma } from '@/lib/prisma';
import { TripStatus, VehicleStatus } from '@/app/generated/prisma/client';

interface DateRange {
  from?: string;
  to?: string;
}

function buildDateFilter(dateRange?: DateRange) {
  if (!dateRange?.from && !dateRange?.to) return undefined;
  return {
    gte: dateRange.from ? new Date(dateRange.from) : undefined,
    lte: dateRange.to ? new Date(dateRange.to) : undefined,
  };
}

// ─── Fuel Efficiency per Vehicle ───────────────────────────────────────────

export async function getFuelEfficiency(vehicleId?: string, dateRange?: DateRange) {
  const vehicles = await prisma.vehicle.findMany({
    where: vehicleId ? { id: vehicleId } : {},
    include: {
      trips: {
        where: {
          status: TripStatus.Completed,
          ...(dateRange ? { createdAt: buildDateFilter(dateRange) } : {}),
        },
        select: { plannedDistance: true, fuelConsumed: true },
      },
    },
  });

  return vehicles.map((v) => {
    const totalDistance = v.trips.reduce((sum, t) => sum + t.plannedDistance, 0);
    const totalFuel = v.trips.reduce((sum, t) => sum + (t.fuelConsumed ?? 0), 0);
    return {
      vehicleId: v.id,
      vehicleName: v.name,
      registrationNumber: v.registrationNumber,
      totalDistance,
      totalFuel,
      efficiency: totalFuel > 0 ? +(totalDistance / totalFuel).toFixed(2) : null,
      tripCount: v.trips.length,
    };
  });
}

// ─── Operational Cost per Vehicle ─────────────────────────────────────────

export async function getOperationalCost(vehicleId?: string, dateRange?: DateRange) {
  const vehicles = await prisma.vehicle.findMany({
    where: vehicleId ? { id: vehicleId } : {},
    include: {
      fuelLogs: {
        where: dateRange ? { date: buildDateFilter(dateRange) } : {},
        select: { cost: true },
      },
      maintenanceLogs: {
        where: dateRange ? { dateOpened: buildDateFilter(dateRange) } : {},
        select: { cost: true },
      },
      expenses: {
        where: dateRange ? { date: buildDateFilter(dateRange) } : {},
        select: { amount: true, type: true },
      },
    },
  });

  return vehicles.map((v) => {
    const fuelCost = v.fuelLogs.reduce((sum, f) => sum + f.cost, 0);
    const maintenanceCost = v.maintenanceLogs.reduce((sum, m) => sum + m.cost, 0);
    const expenseCost = v.expenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      vehicleId: v.id,
      vehicleName: v.name,
      registrationNumber: v.registrationNumber,
      acquisitionCost: v.acquisitionCost,
      fuelCost: +fuelCost.toFixed(2),
      maintenanceCost: +maintenanceCost.toFixed(2),
      expenseCost: +expenseCost.toFixed(2),
      totalOperationalCost: +(fuelCost + maintenanceCost + expenseCost).toFixed(2),
    };
  });
}

// ─── Fleet Utilization Over Time ──────────────────────────────────────────

export async function getFleetUtilization(dateRange?: DateRange) {
  const trips = await prisma.trip.findMany({
    where: {
      status: { in: [TripStatus.Dispatched, TripStatus.Completed] },
      ...(dateRange ? { createdAt: buildDateFilter(dateRange) } : {}),
    },
    select: { createdAt: true, updatedAt: true, status: true },
    orderBy: { createdAt: 'asc' },
  });

  const totalVehicles = await prisma.vehicle.count({
    where: { status: { not: VehicleStatus.Retired } },
  });

  // Group by day
  const byDay: Record<string, number> = {};
  for (const trip of trips) {
    const day = trip.createdAt.toISOString().split('T')[0];
    byDay[day] = (byDay[day] ?? 0) + 1;
  }

  return Object.entries(byDay).map(([date, activeTrips]) => ({
    date,
    activeTrips,
    totalVehicles,
    utilization: totalVehicles > 0 ? +((activeTrips / totalVehicles) * 100).toFixed(1) : 0,
  }));
}

// ─── Vehicle ROI ──────────────────────────────────────────────────────────

export async function getVehicleROI() {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      trips: {
        where: { status: TripStatus.Completed },
        select: { revenuePerTrip: true },
      },
      fuelLogs: { select: { cost: true } },
      maintenanceLogs: { select: { cost: true } },
    },
  });

  return vehicles.map((v) => {
    const revenue = v.trips.reduce((sum, t) => sum + (t.revenuePerTrip ?? 0), 0);
    const fuelCost = v.fuelLogs.reduce((sum, f) => sum + f.cost, 0);
    const maintenanceCost = v.maintenanceLogs.reduce((sum, m) => sum + m.cost, 0);
    const totalCost = fuelCost + maintenanceCost;
    const roi =
      v.acquisitionCost > 0
        ? +((revenue - totalCost) / v.acquisitionCost * 100).toFixed(2)
        : null;

    return {
      vehicleId: v.id,
      vehicleName: v.name,
      registrationNumber: v.registrationNumber,
      acquisitionCost: v.acquisitionCost,
      revenue: +revenue.toFixed(2),
      totalCost: +totalCost.toFixed(2),
      roi,
      tripCount: v.trips.length,
    };
  });
}

// ─── Dashboard KPIs ───────────────────────────────────────────────────────

export async function getDashboardKPIs(filters?: {
  vehicleType?: string;
  status?: string;
  region?: string;
}) {
  const vehicleWhere = {
    ...(filters?.vehicleType ? { type: filters.vehicleType } : {}),
    ...(filters?.region ? { region: filters.region } : {}),
  };

  const [
    totalVehicles,
    activeVehicles,
    availableVehicles,
    vehiclesInMaintenance,
    vehiclesOnTrip,
    activeTrips,
    pendingTrips,
    driversOnDuty,
    totalDrivers,
  ] = await Promise.all([
    prisma.vehicle.count({ where: vehicleWhere }),
    prisma.vehicle.count({ where: { ...vehicleWhere, status: { not: VehicleStatus.Retired } } }),
    prisma.vehicle.count({ where: { ...vehicleWhere, status: VehicleStatus.Available } }),
    prisma.vehicle.count({ where: { ...vehicleWhere, status: VehicleStatus.InShop } }),
    prisma.vehicle.count({ where: { ...vehicleWhere, status: VehicleStatus.OnTrip } }),
    prisma.trip.count({ where: { status: TripStatus.Dispatched } }),
    prisma.trip.count({ where: { status: TripStatus.Draft } }),
    prisma.driver.count({ where: { status: 'OnTrip' } }),
    prisma.driver.count(),
  ]);

  const fleetUtilization =
    activeVehicles > 0 ? +((vehiclesOnTrip / activeVehicles) * 100).toFixed(1) : 0;

  return {
    totalVehicles,
    activeVehicles,
    availableVehicles,
    vehiclesInMaintenance,
    vehiclesOnTrip,
    activeTrips,
    pendingTrips,
    driversOnDuty,
    totalDrivers,
    fleetUtilization,
  };
}
