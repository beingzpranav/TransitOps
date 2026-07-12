'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface InAppNotification {
  id: string;
  message: string;
  triggerEvent: string;
  createdAt: string;
}

export function useNotifications() {
  return useQuery<InAppNotification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get<InAppNotification[]>('/notifications'),
    refetchInterval: 3000, // Poll every 3 seconds for live notifications!
  });
}

export function useClearNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete('/notifications'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
