'use client';

import { useMemo } from 'react';
import { MapPin, CheckCircle2, Clock, Fuel, TrendingUp, Package, Navigation, CalendarDays } from 'lucide-react';
import { useTrips } from '@/hooks/useTrips';
import { StatusBadge } from '@/components/StatusBadge';
import Link from 'next/link';

interface DriverDashboardProps {
  driverName: string;
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1 leading-none">{value}</p>
        {subtitle && <p className="text-[11px] text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gray-50 ${iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

export function DriverDashboard({ driverName }: DriverDashboardProps) {
  const { data: trips = [], isLoading } = useTrips();

  const stats = useMemo(() => {
    const completed = trips.filter((t) => t.status === 'Completed');
    const active = trips.find((t) => t.status === 'Dispatched');
    const pending = trips.filter((t) => t.status === 'Draft');
    const totalKm = completed.reduce((sum, t) => sum + (t.plannedDistance ?? 0), 0);
    const totalFuel = completed.reduce((sum, t) => sum + (t.fuelConsumed ?? 0), 0);
    const totalRevenue = completed.reduce((sum, t) => sum + (t.revenuePerTrip ?? 0), 0);
    const totalCargo = trips.reduce((sum, t) => sum + t.cargoWeight, 0);
    return { completed, active, pending, totalKm, totalFuel, totalRevenue, totalCargo };
  }, [trips]);

  const recentCompleted = [...stats.completed].reverse().slice(0, 5);
  const firstName = driverName?.split(' ')[0] ?? 'Driver';

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's your driving activity overview</p>
        </div>
        <Link
          href="/dashboard/trips"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff385c] text-white text-sm font-semibold hover:bg-[#e0314f] transition-colors shadow-sm w-fit"
        >
          <Navigation className="w-4 h-4" />
          My Trips
        </Link>
      </div>

      {/* Active Trip Banner */}
      {!isLoading && stats.active ? (
        <div className="bg-gradient-to-r from-[#ff385c] to-[#e0314f] rounded-2xl p-5 text-white shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                Active Trip
              </span>
              <p className="text-lg font-bold mt-1 truncate">
                {stats.active.source}
                <span className="mx-2 opacity-70">→</span>
                {stats.active.destination}
              </p>
              <p className="text-sm opacity-80">
                Vehicle:{' '}
                <span className="font-semibold">{stats.active.vehicle?.registrationNumber ?? '—'}</span>
                {' · '}
                {stats.active.plannedDistance.toLocaleString()} km planned
                {' · '}
                {stats.active.cargoWeight.toLocaleString()} kg cargo
              </p>
            </div>
            <Link
              href={`/dashboard/trips/${stats.active.id}`}
              className="shrink-0 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold transition-colors"
            >
              View →
            </Link>
          </div>
        </div>
      ) : (
        !isLoading && (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-5 flex items-center gap-3 text-gray-400">
            <Navigation className="w-5 h-5 shrink-0" />
            <p className="text-sm">No active trip right now. You're ready for dispatch.</p>
          </div>
        )
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Trips Completed"
          value={isLoading ? '—' : stats.completed.length}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          subtitle="All time"
        />
        <StatCard
          label="Pending Trips"
          value={isLoading ? '—' : stats.pending.length}
          icon={Clock}
          iconColor="text-amber-500"
          subtitle="Awaiting dispatch"
        />
        <StatCard
          label="KM Driven"
          value={isLoading ? '—' : stats.totalKm.toLocaleString()}
          icon={MapPin}
          iconColor="text-blue-500"
          subtitle="Completed trips"
        />
        <StatCard
          label="Fuel Used (L)"
          value={isLoading ? '—' : stats.totalFuel.toFixed(0)}
          icon={Fuel}
          iconColor="text-orange-500"
          subtitle="From completed trips"
        />
        <StatCard
          label="Revenue Generated"
          value={isLoading ? '—' : `₹${stats.totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          iconColor="text-[#ff385c]"
          subtitle="Completed trips"
        />
        <StatCard
          label="Total Cargo (kg)"
          value={isLoading ? '—' : stats.totalCargo.toLocaleString()}
          icon={Package}
          iconColor="text-violet-500"
          subtitle="All trips"
        />
      </div>

      {/* Recent Completed Trips */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Recent Completed Trips</h3>
          </div>
          <Link href="/dashboard/trips" className="text-xs text-blue-600 hover:underline">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left">Route</th>
                <th className="text-left">Vehicle</th>
                <th className="text-right">Distance (km)</th>
                <th className="text-right">Fuel (L)</th>
                <th className="text-right">Revenue</th>
                <th className="text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(6).fill(0).map((_, j) => (
                      <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : recentCompleted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">
                    No completed trips yet
                  </td>
                </tr>
              ) : (
                recentCompleted.map((trip) => (
                  <tr key={trip.id}>
                    <td className="font-medium">
                      <Link href={`/dashboard/trips/${trip.id}`} className="hover:text-[#ff385c] transition-colors">
                        {trip.source}
                        <span className="text-gray-400 mx-1">→</span>
                        {trip.destination}
                      </Link>
                    </td>
                    <td className="text-gray-600">{trip.vehicle?.registrationNumber ?? '—'}</td>
                    <td className="text-gray-600 text-right">{trip.plannedDistance.toLocaleString()}</td>
                    <td className="text-gray-600 text-right">{trip.fuelConsumed?.toFixed(1) ?? '—'}</td>
                    <td className="text-gray-600 text-right">
                      {trip.revenuePerTrip ? `₹${trip.revenuePerTrip.toLocaleString()}` : '—'}
                    </td>
                    <td><StatusBadge status={trip.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending / Upcoming Trips */}
      {!isLoading && stats.pending.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Upcoming / Pending Trips</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th className="text-left">Route</th>
                  <th className="text-left">Vehicle</th>
                  <th className="text-right">Distance (km)</th>
                  <th className="text-right">Cargo (kg)</th>
                  <th className="text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.pending.map((trip) => (
                  <tr key={trip.id}>
                    <td className="font-medium">
                      <Link href={`/dashboard/trips/${trip.id}`} className="hover:text-[#ff385c] transition-colors">
                        {trip.source}
                        <span className="text-gray-400 mx-1">→</span>
                        {trip.destination}
                      </Link>
                    </td>
                    <td className="text-gray-600">{trip.vehicle?.registrationNumber ?? '—'}</td>
                    <td className="text-gray-600 text-right">{trip.plannedDistance.toLocaleString()}</td>
                    <td className="text-gray-600 text-right">{trip.cargoWeight.toLocaleString()}</td>
                    <td><StatusBadge status={trip.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
