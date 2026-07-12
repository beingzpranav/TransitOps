'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Download, TrendingUp, DollarSign, Activity, Percent } from 'lucide-react';
import { useReport } from '@/hooks/useReports';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { downloadCsv } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ef4444', '#8b5cf6'];

interface DateRange { from: string; to: string }

function ChartCard({ title, icon: Icon, children, reportType, dateRange }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  reportType: string;
  dateRange: DateRange;
}) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ type: reportType, format: 'csv' });
      if (dateRange.from) params.set('from', dateRange.from);
      if (dateRange.to) params.set('to', dateRange.to);
      await downloadCsv(`/reports?${params.toString()}`, `${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#ff385c]/10">
            <Icon className="w-4 h-4 text-[#ff385c]" />
          </div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
          id={`export-${reportType}`}
          className="text-xs"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>
      {children}
    </div>
  );
}

function FuelEfficiencyChart({ dateRange }: { dateRange: DateRange }) {
  const { data, isLoading } = useReport('fuel_efficiency', dateRange.from ? dateRange : undefined);
  const chartData = (data?.data as Array<{ vehicleName: string; efficiency: number | null; totalDistance: number; totalFuel: number; registrationNumber: string }> | undefined) ?? [];

  if (isLoading) return <div className="h-64 animate-pulse bg-gray-100 rounded-xl" />;
  if (chartData.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data available</div>;

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="registrationNumber" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} label={{ value: 'km/L', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11 } }} />
          <Tooltip formatter={(v: any) => [`${v} km/L`, 'Efficiency']} />
          <Bar dataKey="efficiency" radius={[4, 4, 0, 0]} fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full data-table text-sm">
          <thead><tr>
            <th className="text-left">Vehicle</th>
            <th className="text-right">Distance (km)</th>
            <th className="text-right">Fuel (L)</th>
            <th className="text-right">Efficiency (km/L)</th>
          </tr></thead>
          <tbody>
            {chartData.map((row, i) => (
              <tr key={i}>
                <td>{row.registrationNumber} — {row.vehicleName}</td>
                <td className="text-right">{row.totalDistance.toLocaleString()}</td>
                <td className="text-right">{row.totalFuel.toFixed(1)}</td>
                <td className="text-right font-semibold text-blue-700">{row.efficiency ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function OperationalCostChart({ dateRange }: { dateRange: DateRange }) {
  const { data, isLoading } = useReport('operational_cost', dateRange.from ? dateRange : undefined);
  const chartData = (data?.data as Array<{ vehicleName: string; registrationNumber: string; fuelCost: number; maintenanceCost: number; expenseCost: number; totalOperationalCost: number }> | undefined) ?? [];

  const pieData = chartData.length > 0 ? [
    { name: 'Fuel', value: chartData.reduce((s, r) => s + r.fuelCost, 0) },
    { name: 'Maintenance', value: chartData.reduce((s, r) => s + r.maintenanceCost, 0) },
    { name: 'Expenses', value: chartData.reduce((s, r) => s + r.expenseCost, 0) },
  ] : [];

  if (isLoading) return <div className="h-64 animate-pulse bg-gray-100 rounded-xl" />;
  if (chartData.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data available</div>;

  return (
    <>
      <div className="grid grid-cols-2 gap-6">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="registrationNumber" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: any) => [`₹${Number(v).toFixed(2)}`]} />
            <Legend iconSize={8} />
            <Bar dataKey="fuelCost" name="Fuel" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="maintenanceCost" name="Maintenance" stackId="a" fill="#f59e0b" />
            <Bar dataKey="expenseCost" name="Expenses" stackId="a" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v: any) => [`₹${Number(v).toFixed(2)}`]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full data-table text-sm">
          <thead><tr>
            <th className="text-left">Vehicle</th>
            <th className="text-right">Fuel (₹)</th>
            <th className="text-right">Maintenance (₹)</th>
            <th className="text-right">Expenses (₹)</th>
            <th className="text-right">Total (₹)</th>
          </tr></thead>
          <tbody>
            {chartData.map((row, i) => (
              <tr key={i}>
                <td>{row.registrationNumber} — {row.vehicleName}</td>
                <td className="text-right">{row.fuelCost.toFixed(2)}</td>
                <td className="text-right">{row.maintenanceCost.toFixed(2)}</td>
                <td className="text-right">{row.expenseCost.toFixed(2)}</td>
                <td className="text-right font-semibold text-gray-900">₹{row.totalOperationalCost.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FleetUtilizationChart({ dateRange }: { dateRange: DateRange }) {
  const { data, isLoading } = useReport('fleet_utilization', dateRange.from ? dateRange : undefined);
  const chartData = (data?.data as Array<{ date: string; activeTrips: number; utilization: number }> | undefined) ?? [];

  if (isLoading) return <div className="h-64 animate-pulse bg-gray-100 rounded-xl" />;
  if (chartData.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No utilization data for the selected period</div>;

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={[0, 100]} label={{ value: '%', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10 } }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend iconSize={8} />
          <Line yAxisId="left" type="monotone" dataKey="utilization" stroke="#3b82f6" strokeWidth={2} dot={false} name="Utilization %" />
          <Line yAxisId="right" type="monotone" dataKey="activeTrips" stroke="#10b981" strokeWidth={2} dot={false} name="Active Trips" />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-4 overflow-x-auto max-h-48">
        <table className="w-full data-table text-sm">
          <thead><tr>
            <th className="text-left">Date</th>
            <th className="text-right">Active Trips</th>
            <th className="text-right">Utilization %</th>
          </tr></thead>
          <tbody>
            {chartData.map((row, i) => (
              <tr key={i}>
                <td>{row.date}</td>
                <td className="text-right">{row.activeTrips}</td>
                <td className="text-right font-semibold text-blue-700">{row.utilization}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function VehicleROIChart() {
  const { data, isLoading } = useReport('vehicle_roi');
  const chartData = (data?.data as Array<{ vehicleName: string; registrationNumber: string; roi: number | null; revenue: number; totalCost: number; acquisitionCost: number; tripCount: number }> | undefined) ?? [];

  if (isLoading) return <div className="h-64 animate-pulse bg-gray-100 rounded-xl" />;
  if (chartData.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No ROI data available</div>;

  return (
    <>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="registrationNumber" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} label={{ value: 'ROI %', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
          <Tooltip formatter={(v: any) => [`${Number(v)?.toFixed(2) ?? 'N/A'}%`, 'ROI']} />
          <Bar dataKey="roi" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={(entry.roi ?? 0) >= 0 ? '#10b981' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full data-table text-sm">
          <thead><tr>
            <th className="text-left">Vehicle</th>
            <th className="text-right">Trips</th>
            <th className="text-right">Revenue (₹)</th>
            <th className="text-right">Total Cost (₹)</th>
            <th className="text-right">Acq. Cost (₹)</th>
            <th className="text-right">ROI %</th>
          </tr></thead>
          <tbody>
            {chartData.map((row, i) => (
              <tr key={i}>
                <td>{row.registrationNumber} — {row.vehicleName}</td>
                <td className="text-right">{row.tripCount}</td>
                <td className="text-right">{row.revenue.toFixed(2)}</td>
                <td className="text-right">{row.totalCost.toFixed(2)}</td>
                <td className="text-right">{row.acquisitionCost.toLocaleString()}</td>
                <td className={`text-right font-semibold ${(row.roi ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {row.roi != null ? `${row.roi.toFixed(2)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' });
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const userData = localStorage.getItem('transitops_user');
    if (userData) {
      try {
        const u = JSON.parse(userData);
        setUserRole(u.role);
      } catch {}
    }
  }, []);

  const isManager = userRole === 'FLEET_MANAGER';
  const isFinance = userRole === 'FINANCIAL_ANALYST';
  const isSafety = userRole === 'SAFETY_OFFICER';

  // Scoped tabs list
  const showFuel = isManager || isSafety;
  const showCost = isManager || isFinance;
  const showUtil = isManager || isSafety;
  const showRoi = isManager || isFinance;

  // Default tab based on role
  const defaultTab = isFinance ? 'operational_cost' : 'fuel_efficiency';

  if (!userRole) {
    return <div className="p-6 text-gray-500">Loading reports configuration...</div>;
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#ff385c]" />
            Reports & Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Visual analytics and exportable reports</p>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <Label htmlFor="date-from" className="text-xs text-gray-500 whitespace-nowrap">From</Label>
            <Input
              id="date-from"
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="h-7 text-sm w-36 border-0 px-1 focus-visible:ring-0"
            />
          </div>
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-2">
            <Label htmlFor="date-to" className="text-xs text-gray-500 whitespace-nowrap">To</Label>
            <Input
              id="date-to"
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="h-7 text-sm w-36 border-0 px-1 focus-visible:ring-0"
            />
          </div>
          {(dateRange.from || dateRange.to) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-gray-400 hover:text-gray-600 px-2"
              onClick={() => setDateRange({ from: '', to: '' })}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full max-w-2xl">
          {showFuel && (
            <TabsTrigger value="fuel_efficiency" id="tab-fuel-eff" className="text-xs">
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Fuel Efficiency
            </TabsTrigger>
          )}
          {showCost && (
            <TabsTrigger value="operational_cost" id="tab-op-cost" className="text-xs">
              <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Operational Cost
            </TabsTrigger>
          )}
          {showUtil && (
            <TabsTrigger value="fleet_utilization" id="tab-utilization" className="text-xs">
              <Activity className="w-3.5 h-3.5 mr-1.5" /> Utilization
            </TabsTrigger>
          )}
          {showRoi && (
            <TabsTrigger value="vehicle_roi" id="tab-roi" className="text-xs">
              <Percent className="w-3.5 h-3.5 mr-1.5" /> Vehicle ROI
            </TabsTrigger>
          )}
        </TabsList>

        {showFuel && (
          <TabsContent value="fuel_efficiency" className="mt-6">
            <ChartCard title="Fuel Efficiency per Vehicle (km/L)" icon={TrendingUp} reportType="fuel_efficiency" dateRange={dateRange}>
              <FuelEfficiencyChart dateRange={dateRange} />
            </ChartCard>
          </TabsContent>
        )}

        {showCost && (
          <TabsContent value="operational_cost" className="mt-6">
            <ChartCard title="Operational Cost Breakdown" icon={DollarSign} reportType="operational_cost" dateRange={dateRange}>
              <OperationalCostChart dateRange={dateRange} />
            </ChartCard>
          </TabsContent>
        )}

        {showUtil && (
          <TabsContent value="fleet_utilization" className="mt-6">
            <ChartCard title="Fleet Utilization Over Time" icon={Activity} reportType="fleet_utilization" dateRange={dateRange}>
              <FleetUtilizationChart dateRange={dateRange} />
            </ChartCard>
          </TabsContent>
        )}

        {showRoi && (
          <TabsContent value="vehicle_roi" className="mt-6">
            <ChartCard title="Vehicle ROI Comparison" icon={Percent} reportType="vehicle_roi" dateRange={dateRange}>
              <VehicleROIChart />
            </ChartCard>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
