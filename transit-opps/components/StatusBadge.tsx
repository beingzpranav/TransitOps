'use client';

import { cn } from '@/lib/utils';

type VehicleStatus = 'Available' | 'OnTrip' | 'InShop' | 'Retired';
type DriverStatus = 'Available' | 'OnTrip' | 'OffDuty' | 'Suspended';
type TripStatus = 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';

type StatusType = VehicleStatus | DriverStatus | TripStatus;

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  Available: { label: 'Available', className: 'badge-available' },
  OnTrip: { label: 'On Trip', className: 'badge-ontrip' },
  InShop: { label: 'In Shop', className: 'badge-inshop' },
  Retired: { label: 'Retired', className: 'badge-retired' },
  OffDuty: { label: 'Off Duty', className: 'badge-offduty' },
  Suspended: { label: 'Suspended', className: 'badge-suspended' },
  Draft: { label: 'Draft', className: 'badge-draft' },
  Dispatched: { label: 'Dispatched', className: 'badge-dispatched' },
  Completed: { label: 'Completed', className: 'badge-completed' },
  Cancelled: { label: 'Cancelled', className: 'badge-cancelled' },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: 'badge-draft' };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
