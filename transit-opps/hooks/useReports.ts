'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DashboardKPIs {
  totalVehicles: number;
  activeVehicles: number;
  availableVehicles: number;
  vehiclesInMaintenance: number;
  vehiclesOnTrip: number;
  activeTrips: number;
  pendingTrips: number;
  driversOnDuty: number;
  totalDrivers: number;
  fleetUtilization: number;
}

export function useDashboard(filters?: { vehicleType?: string; status?: string; region?: string }) {
  const params = new URLSearchParams();
  if (filters?.vehicleType) params.set('vehicleType', filters.vehicleType);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.region) params.set('region', filters.region);
  const query = params.toString();

  return useQuery<DashboardKPIs>({
    queryKey: ['dashboard', filters],
    queryFn: () => api.get<DashboardKPIs>(`/dashboard${query ? `?${query}` : ''}`),
    refetchInterval: 60000, // Auto-refresh every minute
  });
}

export interface ReportData {
  type: string;
  data: unknown[];
}

export function useReport(
  type: 'fuel_efficiency' | 'operational_cost' | 'fleet_utilization' | 'vehicle_roi',
  filters?: { from?: string; to?: string; vehicleId?: string }
) {
  const params = new URLSearchParams({ type });
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);
  if (filters?.vehicleId) params.set('vehicleId', filters.vehicleId);

  return useQuery<ReportData>({
    queryKey: ['reports', type, filters],
    queryFn: () => api.get<ReportData>(`/reports?${params.toString()}`),
  });
}
