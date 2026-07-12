'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SystemSettings {
  id: string;
  depotName: string;
  currency: string;
  distanceUnit: string;
  updatedAt: string;
}

export function useSettings() {
  return useQuery<SystemSettings>({
    queryKey: ['settings'],
    queryFn: () => api.get<SystemSettings>('/settings'),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SystemSettings>) => api.put<SystemSettings>('/settings', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}
