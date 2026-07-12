'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicleId: string;
  driverId: string;
  createdById: string;
  cargoWeight: number;
  plannedDistance: number;
  status: 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';
  finalOdometer?: number;
  fuelConsumed?: number;
  revenuePerTrip?: number;
  vehicle?: { id: string; registrationNumber: string; name: string };
  driver?: { id: string; name: string; licenseNumber: string };
  createdBy?: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export function useTrips(filters?: { status?: string; vehicleId?: string; driverId?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.vehicleId) params.set('vehicleId', filters.vehicleId);
  if (filters?.driverId) params.set('driverId', filters.driverId);
  const query = params.toString();

  return useQuery<Trip[]>({
    queryKey: ['trips', filters],
    queryFn: () => api.get<Trip[]>(`/trips${query ? `?${query}` : ''}`),
  });
}

export function useTrip(id: string) {
  return useQuery<Trip>({
    queryKey: ['trip', id],
    queryFn: () => api.get<Trip>(`/trips/${id}`),
    enabled: !!id,
  });
}

export function useCreateTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Trip>) => api.post<Trip>('/trips', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trips'] }),
  });
}

export function useDispatchTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/trips/${id}/dispatch`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCompleteTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { finalOdometer: number; fuelConsumed: number; fuelCost: number; revenuePerTrip?: number };
    }) => api.post(`/trips/${id}/complete`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCancelTrip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/trips/${id}/cancel`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trips'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
