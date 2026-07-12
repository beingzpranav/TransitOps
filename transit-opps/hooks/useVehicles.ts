'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Vehicle {
  id: string;
  registrationNumber: string;
  name: string;
  type: string;
  maxLoadCapacity: number;
  odometer: number;
  acquisitionCost: number;
  status: 'Available' | 'OnTrip' | 'InShop' | 'Retired';
  region?: string;
  createdAt: string;
  updatedAt: string;
}

export function useVehicles(filters?: { status?: string; type?: string; region?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.type) params.set('type', filters.type);
  if (filters?.region) params.set('region', filters.region);
  const query = params.toString();

  return useQuery<Vehicle[]>({
    queryKey: ['vehicles', filters],
    queryFn: () => api.get<Vehicle[]>(`/vehicles${query ? `?${query}` : ''}`),
  });
}

export function useVehicle(id: string) {
  return useQuery<Vehicle>({
    queryKey: ['vehicle', id],
    queryFn: () => api.get<Vehicle>(`/vehicles/${id}`),
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Vehicle>) => api.post<Vehicle>('/vehicles', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vehicle> }) =>
      api.put<Vehicle>(`/vehicles/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useRetireVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}
