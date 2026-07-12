'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiry: string;
  contactNumber: string;
  email?: string | null;
  safetyScore?: number;
  status: 'Available' | 'OnTrip' | 'OffDuty' | 'Suspended';
  createdAt: string;
  updatedAt: string;
}

export function useDrivers(filters?: { status?: string; licenseCategory?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.licenseCategory) params.set('licenseCategory', filters.licenseCategory);
  const query = params.toString();

  return useQuery<Driver[]>({
    queryKey: ['drivers', filters],
    queryFn: () => api.get<Driver[]>(`/drivers${query ? `?${query}` : ''}`),
  });
}

export function useDriver(id: string) {
  return useQuery<Driver>({
    queryKey: ['driver', id],
    queryFn: () => api.get<Driver>(`/drivers/${id}`),
    enabled: !!id,
  });
}

export function useCreateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Driver>) => api.post<Driver>('/drivers', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  });
}

export function useUpdateDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Driver> }) =>
      api.put<Driver>(`/drivers/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  });
}

export function useSuspendDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/drivers/${id}`, { action: 'suspend' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drivers'] }),
  });
}
