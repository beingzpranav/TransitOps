'use client';

import { useState, useEffect } from 'react';
import { Download, TrendingUp, Activity, DollarSign, Percent } from 'lucide-react';
import { useReport } from '@/hooks/useReports';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { downloadCsv } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface DateRange { from: string; to: string }

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const fuelQuery = useReport('fuel_efficiency', dateRange.from ? dateRange : undefined);
  const costQuery = useReport('operational_cost', dateRange.from ? dateRange : undefined);
  const utilQuery = useReport('fleet_utilization', dateRange.from ? dateRange : undefined);
  const roiQuery = useReport('vehicle_roi');

  // Aggregations
  const fuelData = (fuelQuery.data?.data as Array<{ efficiency: number | null; totalDistance: number; totalFuel: number; registrationNumber: string }>) || [];
  const totalDistance = fuelData.reduce((acc, curr) => acc + curr.totalDistance, 0);
  const totalFuel = fuelData.reduce((acc, curr) => acc + curr.totalFuel, 0);
  const avgEfficiency = totalFuel > 0 ? (totalDistance / totalFuel).toFixed(1) : '—';

  const utilData = (utilQuery.data?.data as Array<{ utilization: number }>) || [];
  const avgUtil = utilData.length > 0 ? (utilData.reduce((acc, curr) => acc + curr.utilization, 0) / utilData.length).toFixed(0) : '—';

  const costData = (costQuery.data?.data as Array<{ vehicleName: string; registrationNumber: string; totalOperationalCost: number }>) || [];
  const totalOpCost = costData.reduce((acc, curr) => acc + curr.totalOperationalCost, 0).toLocaleString();

  const topCostliest = [...costData].sort((a, b) => b.totalOperationalCost - a.totalOperationalCost).slice(0, 3);
  const maxCost = topCostliest[0]?.totalOperationalCost || 1;

  const roiData = (roiQuery.data?.data as Array<{ registrationNumber: string; roi: number | null; revenue: number; totalCost: number; acquisitionCost: number }>) || [];
  const totalRevenue = roiData.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalRoiCost = roiData.reduce((acc, curr) => acc + curr.totalCost, 0);
  const totalAcq = roiData.reduce((acc, curr) => acc + curr.acquisitionCost, 0);
  const avgRoi = totalAcq > 0 ? (((totalRevenue - totalRoiCost) / totalAcq) * 100).toFixed(1) : '—';

  const revenueChartData = roiData.filter(d => d.revenue > 0).map(d => ({
    name: d.registrationNumber,
    revenue: d.revenue
  }));

  const handleExport = async (reportType: string) => {
    const params = new URLSearchParams({ type: reportType, format: 'csv' });
    if (dateRange.from) params.set('from', dateRange.from);
    if (dateRange.to) params.set('to', dateRange.to);
    await downloadCsv(`/reports?${params.toString()}`, `${reportType}_export.csv`);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-[calc(100vh-2rem)] bg-gray-50 text-gray-900 p-8 rounded-2xl shadow-sm font-sans tracking-wide animate-fade-in relative overflow-hidden">
      
      {/* Header & Date Filter */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            Reports & Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">Real-time insights and fleet performance</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex gap-3 items-center bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">From</span>
            <Input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="bg-transparent border-0 h-7 text-sm text-gray-700 w-32 focus-visible:ring-1 focus-visible:ring-gray-200 cursor-pointer"
            />
            <div className="w-px h-4 bg-gray-200 mx-1"></div>
            <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">To</span>
            <Input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="bg-transparent border-0 h-7 text-sm text-gray-700 w-32 focus-visible:ring-1 focus-visible:ring-gray-200 cursor-pointer"
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => handleExport('vehicle_roi')} 
            className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        
        {/* Fuel Efficiency */}
        <div className="group bg-white border border-gray-100 border-l-4 border-l-blue-500 rounded-xl p-6 transition-all duration-300 hover:shadow-md hover:border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-[11px] text-gray-500 font-semibold tracking-[0.15em] uppercase">Fuel Efficiency</h3>
          </div>
          <div className="text-4xl font-light text-gray-900 tracking-tight">{avgEfficiency} <span className="text-base text-gray-400 ml-1 font-normal">km/l</span></div>
        </div>
        
        {/* Fleet Utilization */}
        <div className="group bg-white border border-gray-100 border-l-4 border-l-emerald-500 rounded-xl p-6 transition-all duration-300 hover:shadow-md hover:border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-[11px] text-gray-500 font-semibold tracking-[0.15em] uppercase">Fleet Utilization</h3>
          </div>
          <div className="text-4xl font-light text-gray-900 tracking-tight">{avgUtil} <span className="text-base text-gray-400 ml-1 font-normal">%</span></div>
        </div>

        {/* Operational Cost */}
        <div className="group bg-white border border-gray-100 border-l-4 border-l-orange-500 rounded-xl p-6 transition-all duration-300 hover:shadow-md hover:border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
            <h3 className="text-[11px] text-gray-500 font-semibold tracking-[0.15em] uppercase">Operational Cost</h3>
          </div>
          <div className="text-4xl font-light text-gray-900 tracking-tight">{totalOpCost}</div>
        </div>

        {/* Vehicle ROI */}
        <div className="group bg-white border border-gray-100 border-l-4 border-l-emerald-400 rounded-xl p-6 transition-all duration-300 hover:shadow-md hover:border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
              <Percent className="w-4 h-4" />
            </div>
            <h3 className="text-[11px] text-gray-500 font-semibold tracking-[0.15em] uppercase">Vehicle ROI</h3>
          </div>
          <div className="text-4xl font-light text-gray-900 tracking-tight">{avgRoi} <span className="text-base text-gray-400 ml-1 font-normal">%</span></div>
        </div>
      </div>

      {/* Formula */}
      <div className="relative z-10 text-[11px] text-gray-400 font-mono tracking-widest mb-10 ml-2">
        ROI = (REVENUE - (MAINTENANCE + FUEL)) / ACQUISITION COST
      </div>

      {/* Charts Area */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Left Chart: Revenue */}
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
          <h3 className="text-[11px] text-gray-500 font-semibold tracking-[0.15em] mb-8 uppercase">Monthly Revenue</h3>
          <div className="h-64 w-full">
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => value > 0 ? `${value/1000}k` : ''} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }} 
                    contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                    itemStyle={{ color: '#3b82f6' }} 
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                No revenue data available
              </div>
            )}
          </div>
        </div>

        {/* Right Chart: Top Costliest Vehicles */}
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
          <h3 className="text-[11px] text-gray-500 font-semibold tracking-[0.15em] mb-8 uppercase">Top Costliest Vehicles</h3>
          <div className="space-y-7 mt-6">
            {topCostliest.map((vehicle, i) => {
              const colors = ['bg-rose-400', 'bg-orange-400', 'bg-blue-400'];
              const width = Math.max((vehicle.totalOperationalCost / maxCost) * 100, 5);
              return (
                <div key={vehicle.registrationNumber} className="flex items-center gap-5 group">
                  <div className="w-20 text-xs text-gray-700 font-medium uppercase tracking-wider">{vehicle.registrationNumber}</div>
                  <div className="flex-1 bg-gray-100 h-3 rounded-full overflow-hidden flex relative">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${colors[i % colors.length]}`} 
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <div className="w-16 text-right text-xs text-gray-500 font-mono group-hover:text-gray-900 transition-colors">
                    {vehicle.totalOperationalCost.toLocaleString()}
                  </div>
                </div>
              );
            })}
            {topCostliest.length === 0 && (
              <div className="w-full h-full flex items-center justify-center text-sm text-gray-400 mt-10">
                No cost data available.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
