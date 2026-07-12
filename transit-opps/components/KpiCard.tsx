'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-500',
  trend,
  className,
}: KpiCardProps) {
  return (
    <div className={cn('kpi-card animate-fade-in', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={cn('flex items-center gap-1 mt-2 text-xs font-medium',
              trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'
            )}>
              <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-full bg-[#f7f7f7] text-[#222222] flex items-center justify-center shrink-0">
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
    </div>
  );
}
