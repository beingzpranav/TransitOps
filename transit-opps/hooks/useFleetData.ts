'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  description: string;
  cost: number;
  dateOpened: string;
  dateClosed?: string;
  isActive: boolean;
  vehicle?: { id: string; registrationNumber: string; name: string };
  createdAt: string;
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  tripId?: string;
  liters: number;
  cost: number;
  date: string;
  vehicle?: { id: string; registrationNumber: string; name: string };
  trip?: { id: string; source: string; destination: string };
  createdAt: string;
}

export interface Expense {
  id: string;
  vehicleId: string;
  type: string;
  amount: number;
  date: string;
  notes?: string;
  vehicle?: { id: string; registrationNumber: string; name: string };
  createdAt: string;
}

export function useMaintenance(vehicleId?: string) {
  return useQuery<MaintenanceLog[]>({
    queryKey: ['maintenance', vehicleId],
    queryFn: () =>
      api.get<MaintenanceLog[]>(`/maintenance${vehicleId ? `?vehicleId=${vehicleId}` : ''}`),
  });
}

export function useOpenMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { vehicleId: string; description: string; cost: number }) =>
      api.post('/maintenance', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useCloseMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/maintenance/${id}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useFuelLogs(vehicleId?: string) {
  return useQuery<FuelLog[]>({
    queryKey: ['fuel', vehicleId],
    queryFn: () =>
      api.get<FuelLog[]>(`/fuel${vehicleId ? `?vehicleId=${vehicleId}` : ''}`),
  });
}

export function useCreateFuelLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { vehicleId: string; liters: number; cost: number; date?: string }) =>
      api.post('/fuel', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fuel'] }),
  });
}

export function useExpenses(vehicleId?: string) {
  return useQuery<Expense[]>({
    queryKey: ['expenses', vehicleId],
    queryFn: () =>
      api.get<Expense[]>(`/expenses${vehicleId ? `?vehicleId=${vehicleId}` : ''}`),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { vehicleId: string; type: string; amount: number; notes?: string }) =>
      api.post('/expenses', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}
