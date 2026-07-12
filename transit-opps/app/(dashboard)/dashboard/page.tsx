'use client';

import { useState } from 'react';
import {
  Truck, Users, MapPin, Wrench, Activity, Clock, BarChart3, RefreshCw
} from 'lucide-react';
import { useDashboard } from '@/hooks/useReports';
import { useTrips } from '@/hooks/useTrips';
import { KpiCard } from '@/components/KpiCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell, PieChart, Pie, Legend
} from 'recharts';

export default function DashboardPage() {
  const [filters, setFilters] = useState<{ vehicleType?: string; region?: string }>({});
  const { data: kpis, isLoading, refetch } = useDashboard(filters);
  const { data: trips } = useTrips();

  const recentTrips = trips?.slice(0, 5) ?? [];

  const utilizationData = kpis ? [
    { name: 'On Trip', value: kpis.vehiclesOnTrip, fill: '#3b82f6' },
    { name: 'Available', value: kpis.availableVehicles, fill: '#10b981' },
    { name: 'In Maintenance', value: kpis.vehiclesInMaintenance, fill: '#f59e0b' },
  ] : [];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fleet Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Live overview of your fleet operations</p>
        </div>
        <div className="flex items-center gap-3">
          <Select onValueChange={(v) => { const val = v as string | null; setFilters((f) => ({ ...f, vehicleType: val === 'all' || !val ? undefined : val })); }}>
            <SelectTrigger className="w-40 bg-white" id="filter-type">
              <SelectValue placeholder="Vehicle type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="Heavy Truck">Heavy Truck</SelectItem>
              <SelectItem value="Van">Van</SelectItem>
              <SelectItem value="Flatbed">Flatbed</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="bg-white"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="kpi-card animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : kpis ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Total Vehicles"
            value={kpis.totalVehicles}
            icon={Truck}
            iconColor="text-blue-500"
            subtitle={`${kpis.activeVehicles} active`}
          />
          <KpiCard
            title="Available Vehicles"
            value={kpis.availableVehicles}
            icon={Truck}
            iconColor="text-emerald-500"
            subtitle="Ready for dispatch"
          />
          <KpiCard
            title="In Maintenance"
            value={kpis.vehiclesInMaintenance}
            icon={Wrench}
            iconColor="text-amber-500"
            subtitle="In shop now"
          />
          <KpiCard
            title="Fleet Utilization"
            value={`${kpis.fleetUtilization}%`}
            icon={Activity}
            iconColor="text-violet-500"
            subtitle="Vehicles on trip"
          />
          <KpiCard
            title="Active Trips"
            value={kpis.activeTrips}
            icon={MapPin}
            iconColor="text-blue-500"
            subtitle="Currently dispatched"
          />
          <KpiCard
            title="Pending Trips"
            value={kpis.pendingTrips}
            icon={Clock}
            iconColor="text-orange-500"
            subtitle="Awaiting dispatch"
          />
          <KpiCard
            title="Drivers on Duty"
            value={kpis.driversOnDuty}
            icon={Users}
            iconColor="text-emerald-500"
            subtitle="Currently on trip"
          />
          <KpiCard
            title="Total Drivers"
            value={kpis.totalDrivers}
            icon={Users}
            iconColor="text-gray-500"
            subtitle="In the system"
          />
        </div>
      ) : null}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Utilization Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Vehicle Status Breakdown</h3>
          </div>
          {kpis && utilizationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={utilizationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {utilizationData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Vehicles']} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data</div>
          )}
        </div>

        {/* Fleet Summary Bar */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-gray-900 text-sm">Fleet at a Glance</h3>
          </div>
          {kpis ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { name: 'Total', count: kpis.totalVehicles, fill: '#e2e8f0' },
                { name: 'Active', count: kpis.activeVehicles, fill: '#3b82f6' },
                { name: 'Available', count: kpis.availableVehicles, fill: '#10b981' },
                { name: 'On Trip', count: kpis.vehiclesOnTrip, fill: '#6366f1' },
                { name: 'In Shop', count: kpis.vehiclesInMaintenance, fill: '#f59e0b' },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {[{ fill: '#e2e8f0' }, { fill: '#3b82f6' }, { fill: '#10b981' }, { fill: '#6366f1' }, { fill: '#f59e0b' }].map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 animate-pulse bg-gray-100 rounded-lg" />
          )}
        </div>
      </div>

      {/* Recent Trips */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">Recent Trips</h3>
          <a href="/dashboard/trips" className="text-xs text-blue-600 hover:underline">View all →</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left">Route</th>
                <th className="text-left">Vehicle</th>
                <th className="text-left">Driver</th>
                <th className="text-left">Status</th>
                <th className="text-left">Cargo (kg)</th>
              </tr>
            </thead>
            <tbody>
              {recentTrips.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400 text-sm">No trips yet</td>
                </tr>
              ) : (
                recentTrips.map((trip) => (
                  <tr key={trip.id}>
                    <td className="font-medium">
                      <span className="text-gray-900">{trip.source}</span>
                      <span className="text-gray-400 mx-1">→</span>
                      <span className="text-gray-900">{trip.destination}</span>
                    </td>
                    <td className="text-gray-600">{trip.vehicle?.registrationNumber ?? trip.vehicleId.slice(0, 8)}</td>
                    <td className="text-gray-600">{trip.driver?.name ?? '—'}</td>
                    <td><StatusBadge status={trip.status} /></td>
                    <td className="text-gray-600">{trip.cargoWeight.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
