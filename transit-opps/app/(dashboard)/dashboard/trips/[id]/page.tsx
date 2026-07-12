'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTrip } from '@/hooks/useTrips';
import { useLocationTracking } from '@/hooks/useLocationTracking';
import { TripTimeline } from '@/components/TripTimeline';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { MapPin, Truck, Users, ArrowLeft, Play, Navigation, AlertTriangle, CheckCircle, Settings, XCircle, Download } from 'lucide-react';
import { ETABadge } from '@/components/ETABadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  driverId?: string | null;
}

function CompleteTripForm({ onSubmit, loading }: { onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ finalOdometer: '', fuelConsumed: '', fuelCost: '', revenuePerTrip: '' });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      finalOdometer: parseFloat(form.finalOdometer),
      fuelConsumed: parseFloat(form.fuelConsumed),
      fuelCost: parseFloat(form.fuelConsumed) * parseFloat(form.fuelCost), // Multiply liters by cost per liter
      revenuePerTrip: form.revenuePerTrip ? parseFloat(form.revenuePerTrip) : undefined,
    });
  }

  const totalExpense = parseFloat(form.fuelConsumed) && parseFloat(form.fuelCost)
    ? (parseFloat(form.fuelConsumed) * parseFloat(form.fuelCost)).toFixed(2)
    : '0.00';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="final-odometer" className="form-label text-xs font-semibold text-gray-700">Final Odometer (km) *</Label>
          <Input id="final-odometer" type="number" value={form.finalOdometer} onChange={(e) => setForm({ ...form, finalOdometer: e.target.value })} placeholder="48650" min="0" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="fuel-consumed" className="form-label text-xs font-semibold text-gray-700">Fuel Consumed (L) *</Label>
          <Input id="fuel-consumed" type="number" value={form.fuelConsumed} onChange={(e) => setForm({ ...form, fuelConsumed: e.target.value })} placeholder="95" min="0" required className="mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fuel-cost" className="form-label text-xs font-semibold text-gray-700">Fuel Cost (₹ per Liter) *</Label>
          <Input id="fuel-cost" type="number" value={form.fuelCost} onChange={(e) => setForm({ ...form, fuelCost: e.target.value })} placeholder="102.50" min="0" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="trip-revenue" className="form-label text-xs font-semibold text-gray-700">Revenue (₹)</Label>
          <Input id="trip-revenue" type="number" value={form.revenuePerTrip} onChange={(e) => setForm({ ...form, revenuePerTrip: e.target.value })} placeholder="3200" min="0" className="mt-1" />
        </div>
      </div>
      
      {parseFloat(form.fuelConsumed) > 0 && parseFloat(form.fuelCost) > 0 && (
        <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs flex justify-between items-center">
          <span className="font-medium text-gray-500">Calculated Total Fuel Expense:</span>
          <span className="font-bold text-gray-900 text-sm">₹{totalExpense}</span>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">
          {loading ? 'Completing...' : 'Complete Trip'}
        </Button>
      </div>
    </form>
  );
}

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: trip, isLoading, error } = useTrip(id);

  const [user, setUser] = useState<User | null>(null);
  const [starting, setStarting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState('');
  const [manualSuccess, setManualSuccess] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  async function handleComplete(data: any) {
    setActionLoading(true);
    try {
      await api.post(`/trips/${id}/complete`, data);
      setCompleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      queryClient.invalidateQueries({ queryKey: ['tripTimeline', id] });
    } catch (err: any) {
      alert(err.message || 'Failed to complete trip');
    } finally {
      setActionLoading(false);
    }
  }

  function handlePrintInvoice() {
    if (!trip) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const fuelCost = trip.fuelLogs?.[0]?.cost ?? 0;
    const revenue = trip.revenuePerTrip ?? 0;
    const netProfit = revenue - fuelCost;
    const invoiceNumber = `INV-${trip.id.slice(0, 8).toUpperCase()}`;
    
    // Itemize fares for realistic receipt layout
    const baseFare = Math.round(revenue * 0.8);
    const cargoSurcharge = Math.round(revenue * 0.2);

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoiceNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
            
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: 'Inter', sans-serif; 
              color: #1e293b; 
              background-color: #f8fafc;
              padding: 40px; 
              line-height: 1.5;
            }
            .invoice-card {
              max-width: 850px;
              margin: 0 auto;
              background: #ffffff;
              padding: 50px;
              border-radius: 16px;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
              border: 1px solid #e2e8f0;
              position: relative;
            }
            .control-bar {
              max-width: 850px;
              margin: 0 auto 20px auto;
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px 24px;
              background: #0f172a;
              color: #ffffff;
              border-radius: 12px;
            }
            .btn {
              background: #ff385c;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              font-weight: 600;
              font-size: 13px;
              cursor: pointer;
              transition: all 0.2s;
            }
            .btn:hover {
              background: #e0314f;
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start;
              border-b: 1px solid #e2e8f0; 
              padding-bottom: 30px; 
              margin-bottom: 30px; 
            }
            .logo-section {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .logo { 
              font-size: 26px; 
              font-weight: 800; 
              letter-spacing: -0.025em;
              color: #ff385c; 
            }
            .logo span {
              color: #0f172a;
            }
            .title { 
              font-size: 24px; 
              font-weight: 800; 
              color: #0f172a; 
              text-align: right; 
              letter-spacing: -0.025em;
            }
            .invoice-id {
              font-family: monospace;
              font-size: 13px;
              color: #64748b;
              font-weight: 600;
              margin-top: 4px;
              text-align: right;
            }
            .badge {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 100px;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              background-color: #dcfce7;
              color: #166534;
              margin-top: 10px;
            }
            .meta { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 40px; 
              margin-bottom: 40px; 
              font-size: 13px; 
            }
            .meta-column {
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            .meta-block {
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .meta-label { 
              color: #64748b; 
              font-weight: 600; 
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .meta-value { 
              font-weight: 500; 
              color: #0f172a; 
              font-size: 14px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 30px 0; 
              font-size: 13px; 
            }
            th { 
              background-color: #f8fafc; 
              color: #475569;
              font-weight: 600; 
              text-align: left; 
              padding: 14px 16px; 
              border-bottom: 2px solid #e2e8f0; 
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.05em;
            }
            td { 
              padding: 16px; 
              border-bottom: 1px solid #f1f5f9; 
              color: #334155;
            }
            .totals { 
              margin-top: 20px; 
              display: flex; 
              flex-direction: column; 
              align-items: flex-end; 
              gap: 12px; 
              font-size: 14px; 
            }
            .total-row { 
              display: grid; 
              grid-template-columns: 180px 120px; 
              text-align: right; 
              color: #475569;
            }
            .total-final { 
              font-size: 20px; 
              font-weight: 800; 
              color: #0f172a; 
              border-top: 2px solid #e2e8f0; 
              padding-top: 12px; 
            }
            .total-final .val {
              color: #ff385c;
            }
            .footer-note {
              margin-top: 60px;
              border-t: 1px solid #e2e8f0;
              padding-top: 20px;
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              line-height: 1.6;
            }
            
            @media print {
              body { 
                background: white; 
                padding: 0; 
              }
              .invoice-card {
                border: none;
                box-shadow: none;
                padding: 20px;
              }
              .no-print { 
                display: none !important; 
              }
            }
          </style>
        </head>
        <body>
          <div class="control-bar no-print">
            <span style="font-size: 13px; font-weight: 500;">Invoice summary is ready for download</span>
            <button class="btn" onclick="window.print()">Print / Download PDF</button>
          </div>
          
          <div class="invoice-card">
            <div class="header">
              <div class="logo-section">
                <div class="logo">Transit<span>Ops</span></div>
                <div style="font-size: 12px; color: #64748b; font-weight: 500;">Operational Logistics Invoice</div>
              </div>
              <div>
                <div class="title">INVOICE RECEIPT</div>
                <div class="invoice-id">${invoiceNumber}</div>
                <div style="text-align: right;"><span class="badge">Settled</span></div>
              </div>
            </div>
            
            <div class="meta">
              <div class="meta-column">
                <div class="meta-block">
                  <div class="meta-label">Origin Address</div>
                  <div class="meta-value">${trip.source}</div>
                </div>
                <div class="meta-block">
                  <div class="meta-label">Destination Address</div>
                  <div class="meta-value">${trip.destination}</div>
                </div>
                <div class="meta-block">
                  <div class="meta-label">Assigned Vehicle</div>
                  <div class="meta-value">${trip.vehicle?.registrationNumber} — ${trip.vehicle?.name}</div>
                </div>
              </div>
              <div class="meta-column">
                <div class="meta-block">
                  <div class="meta-label">Assigned Operator (Driver)</div>
                  <div class="meta-value">${trip.driver?.name}</div>
                </div>
                <div class="meta-block">
                  <div class="meta-label">Operator License Detail</div>
                  <div class="meta-value">${trip.driver?.licenseNumber} (${trip.driver?.licenseCategory})</div>
                </div>
                <div class="meta-block">
                  <div class="meta-label">Completion Date</div>
                  <div class="meta-value">${new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Planned Distance</th>
                  <th style="text-align: right;">Cargo Weight</th>
                  <th style="text-align: right;">Total Settle Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-weight: 500;">Gross Trip Transport Fare</td>
                  <td style="text-align: right; color: #64748b;">${trip.plannedDistance.toLocaleString()} km</td>
                  <td style="text-align: right; color: #64748b;">${trip.cargoWeight.toLocaleString()} kg</td>
                  <td style="text-align: right; font-weight: 600;">₹${revenue.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="font-weight: 500; color: #e11d48;">Fuel Consumption Deductible (${trip.fuelConsumed?.toLocaleString() ?? 0} L)</td>
                  <td style="text-align: right; color: #64748b;">—</td>
                  <td style="text-align: right; color: #64748b;">—</td>
                  <td style="text-align: right; font-weight: 600; color: #e11d48;">-₹${fuelCost.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            
            <div class="totals">
              <div class="total-row">
                <div>Subtotal Gross Revenue:</div>
                <div style="font-weight: 600; color: #0f172a;">₹${revenue.toLocaleString()}</div>
              </div>
              <div class="total-row">
                <div>Fuel cost deduction:</div>
                <div style="font-weight: 600; color: #e11d48;">-₹${fuelCost.toLocaleString()}</div>
              </div>
              <div class="total-row total-final">
                <div>Settled Net Profit:</div>
                <div class="val">₹${netProfit.toLocaleString()}</div>
              </div>
            </div>
            
            <div class="footer-note">
              This invoice constitutes a binding operational receipt of settlement inside the TransitOps fleet dispatch registry.<br/>
              If you have queries regarding base mileage or fuel calculations, please file an audit report inside the platform.
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  useEffect(() => {
    const userData = localStorage.getItem('transitops_user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (err) {
        console.error('Failed to parse user data', err);
      }
    }
  }, []);

  // Check if current user is the assigned driver
  const isAssignedDriver = !!(user && trip && user.driverId === trip.driverId);
  const canManageTrips = !!(user && (user.role === 'FLEET_MANAGER' || user.role === 'DISPATCHER'));

  // Active tracking condition: trip is dispatched, started, and the user is the assigned driver
  const isTrackingActive = !!(
    trip &&
    trip.status === 'Dispatched' &&
    trip.actualStartTime &&
    isAssignedDriver
  );

  // Invalidate timeline queries when location is pinged
  function handlePingSuccess() {
    queryClient.invalidateQueries({ queryKey: ['tripTimeline', id] });
  }

  const { error: trackingError, isTracking } = useLocationTracking(
    id,
    isTrackingActive,
    handlePingSuccess
  );

  async function handleStartTrip() {
    setStarting(true);
    try {
      await api.post(`/trips/${id}/start`, {});
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      queryClient.invalidateQueries({ queryKey: ['tripTimeline', id] });
    } catch (err: any) {
      alert(err.message || 'Failed to start trip');
    } finally {
      setStarting(false);
    }
  }

  async function handleDispatchTrip() {
    if (!confirm("Are you sure you want to dispatch this trip? This will set both the vehicle and driver status to On Trip.")) return;
    setActionLoading(true);
    try {
      await api.post(`/trips/${id}/dispatch`, {});
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      queryClient.invalidateQueries({ queryKey: ['tripTimeline', id] });
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch trip');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelTrip() {
    if (!confirm("Are you sure you want to cancel this trip?")) return;
    setActionLoading(true);
    try {
      await api.post(`/trips/${id}/cancel`, {});
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      queryClient.invalidateQueries({ queryKey: ['tripTimeline', id] });
    } catch (err: any) {
      alert(err.message || 'Failed to cancel trip');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setManualError('');
    setManualSuccess(false);
    setManualSubmitting(true);

    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) {
      setManualError('Please enter valid coordinates.');
      setManualSubmitting(false);
      return;
    }

    try {
      await api.post(`/trips/${id}/location`, { latitude: lat, longitude: lng });
      setManualSuccess(true);
      setManualLat('');
      setManualLng('');
      queryClient.invalidateQueries({ queryKey: ['tripTimeline', id] });
    } catch (err: any) {
      setManualError(err.message || 'Failed to record location.');
    } finally {
      setManualSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="w-8 h-8 border-2 border-[#ff385c] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading trip details...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-red-500 max-w-sm mx-auto p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span>Trip not found or error loading trip details.</span>
        </div>
        <Button variant="outline" onClick={() => router.push('/dashboard/trips')}>
          Back to Trips
        </Button>
      </div>
    );
  }

  const showStartButton =
    isAssignedDriver && trip.status === 'Dispatched' && !trip.actualStartTime;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/trips"
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Trips
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Status:</span>
          <StatusBadge status={trip.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Trip Info Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#ff385c] bg-[#ff385c]/10 px-2 py-0.5 rounded">
                Active Assignment
              </span>
              <h1 className="text-2xl font-bold text-gray-900 mt-2 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-[#ff385c]" />
                {trip.source} <span className="text-gray-300 font-light">➔</span> {trip.destination}
              </h1>
              <p className="text-xs text-gray-400 mt-1">Trip ID: {trip.id}</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-gray-50 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gray-50">
                  <Truck className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-medium block">Assigned Vehicle</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {trip.vehicle?.registrationNumber}
                  </span>
                  <span className="text-xs text-gray-400 block">{trip.vehicle?.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gray-50">
                  <Users className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-medium block">Assigned Driver</span>
                  <span className="text-sm font-semibold text-gray-900">{trip.driver?.name}</span>
                  <span className="text-xs text-gray-400 block">
                    License: {trip.driver?.licenseNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI details */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-50">
                <span className="text-[10px] text-gray-400 font-medium block">Cargo Weight</span>
                <span className="text-base font-bold text-gray-900 mt-1 block">
                  {trip.cargoWeight.toLocaleString()} kg
                </span>
              </div>
              <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-50">
                <span className="text-[10px] text-gray-400 font-medium block">Distance</span>
                <span className="text-base font-bold text-gray-900 mt-1 block">
                  {trip.plannedDistance.toLocaleString()} km
                </span>
              </div>
              <div className="p-3 bg-gray-50/50 rounded-xl border border-gray-50">
                <span className="text-[10px] text-gray-400 font-medium block">Revenue</span>
                <span className="text-base font-bold text-gray-900 mt-1 block">
                  {trip.revenuePerTrip != null ? `$${trip.revenuePerTrip.toLocaleString()}` : '—'}
                </span>
              </div>
            </div>

            {/* Dates & Dispatch info */}
            <div className="space-y-2 text-xs text-gray-500 pt-2">
              <div className="flex items-center justify-between">
                <span>Created At:</span>
                <span className="font-medium text-gray-800">
                  {new Date(trip.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Dispatched By:</span>
                <span className="font-medium text-gray-800">{trip.createdBy?.name}</span>
              </div>
              {trip.actualStartTime && (
                <div className="flex items-center justify-between">
                  <span>Actual Start Time:</span>
                  <span className="font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {new Date(trip.actualStartTime).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* ETA Banner — visible only for active dispatched trips */}
            {trip.status === 'Dispatched' && trip.actualStartTime && (
              <div className="bg-gradient-to-r from-[#ff385c] to-[#e0314f] rounded-xl p-4 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider opacity-90">
                    Trip In Progress — Estimated Arrival
                  </span>
                </div>
                <ETABadge
                  tripId={id}
                  plannedDistance={trip.plannedDistance}
                  actualStartTime={trip.actualStartTime}
                  isActive={isTrackingActive}
                />
              </div>
            )}
          </div>

          {/* Driver Geolocation Action Controls */}
          {isAssignedDriver && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-[#ff385c]" />
                Driver Tracking Controls
              </h2>

              {showStartButton && (
                <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                  <p className="text-xs text-gray-500">
                    You are the assigned driver for this trip. Click below to start the trip and enable GPS tracking.
                  </p>
                  <Button
                    onClick={handleStartTrip}
                    disabled={starting}
                    className="w-full bg-[#ff385c] hover:bg-[#e00b41]"
                  >
                    <Play className="w-4 h-4 mr-2 fill-current" />
                    {starting ? 'Starting Trip...' : 'Start Trip'}
                  </Button>
                </div>
              )}

              {/* Geolocation Active Status */}
              {isTrackingActive && (
                <div className="space-y-3">
                  <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                    isTracking 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                      : 'bg-amber-50 border-amber-100 text-amber-800'
                  }`}>
                    <span className="relative flex h-3 w-3">
                      {isTracking && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${isTracking ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    </span>
                    <div>
                      <p className="text-xs font-semibold">
                        {isTracking ? 'GPS Tracking Active' : 'Acquiring GPS Signal...'}
                      </p>
                      <p className="text-[10px] opacity-80 mt-0.5">
                        Coordinates are automatically pinged to the route timeline every 30 seconds.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setCompleteOpen(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Complete Trip
                  </Button>
                </div>
              )}

              {/* Geolocation Permission/General Error Fallback Form */}
              {trackingError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-4">
                  <div className="flex items-start gap-2.5 text-red-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold">GPS Access Blocked or Unsupported</p>
                      <p className="text-[10px] opacity-80 mt-0.5">{trackingError}</p>
                    </div>
                  </div>

                  <form onSubmit={handleManualSubmit} className="space-y-3 pt-2 border-t border-red-100/50">
                    <p className="text-xs font-semibold text-gray-700">Manual Checkpoint Entry Fallback</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="manual-lat" className="text-[10px] text-gray-500">Latitude</Label>
                        <Input
                          id="manual-lat"
                          type="text"
                          value={manualLat}
                          onChange={(e) => setManualLat(e.target.value)}
                          placeholder="e.g. 41.8781"
                          className="h-8 text-xs mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="manual-lng" className="text-[10px] text-gray-500">Longitude</Label>
                        <Input
                          id="manual-lng"
                          type="text"
                          value={manualLng}
                          onChange={(e) => setManualLng(e.target.value)}
                          placeholder="e.g. -87.6298"
                          className="h-8 text-xs mt-1"
                          required
                        />
                      </div>
                    </div>

                    {manualError && <p className="text-[10px] text-red-600">{manualError}</p>}
                    {manualSuccess && (
                      <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Checkpoint logged successfully!
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={manualSubmitting}
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                    >
                      {manualSubmitting ? 'Logging...' : 'Submit Checkpoint'}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Dispatcher/Manager Action Controls */}
          {canManageTrips && (trip.status === 'Draft' || trip.status === 'Dispatched') && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-[#ff385c]" />
                Trip Management Actions
              </h2>
              <div className="flex gap-3">
                {trip.status === 'Draft' && (
                  <Button
                    onClick={handleDispatchTrip}
                    disabled={actionLoading}
                    className="flex-1 bg-[#ff385c] hover:bg-[#e00b41] text-xs font-semibold py-2"
                  >
                    <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
                    {actionLoading ? 'Dispatching...' : 'Dispatch Trip'}
                  </Button>
                )}
                {trip.status === 'Dispatched' && (
                  <Button
                    onClick={() => setCompleteOpen(true)}
                    disabled={actionLoading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold py-2 text-white flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Complete Trip
                  </Button>
                )}
                <Button
                  onClick={handleCancelTrip}
                  disabled={actionLoading}
                  variant="outline"
                  className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold py-2"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5 text-red-500" />
                  {actionLoading ? 'Cancelling...' : 'Cancel Trip'}
                </Button>
              </div>
            </div>
          )}
          {trip.status === 'Completed' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Trip Completion Summary & Invoice
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-[10px] text-gray-400 block font-medium">Final Odometer</span>
                  <span className="text-sm font-semibold text-gray-900">{trip.finalOdometer?.toLocaleString() ?? '—'} km</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-[10px] text-gray-400 block font-medium">Fuel Consumed</span>
                  <span className="text-sm font-semibold text-gray-900">{trip.fuelConsumed?.toLocaleString() ?? '—'} L</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-[10px] text-gray-400 block font-medium">Fuel Cost</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {trip.fuelLogs?.[0]?.cost != null ? `₹${trip.fuelLogs[0].cost.toLocaleString()}` : '—'}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-[10px] text-gray-400 block font-medium">Net Profit Margin</span>
                  <span className={`text-sm font-bold ${
                    trip.revenuePerTrip != null && trip.fuelLogs?.[0]?.cost != null && (trip.revenuePerTrip - trip.fuelLogs[0].cost) >= 0 
                      ? 'text-emerald-600' 
                      : 'text-red-500'
                  }`}>
                    {trip.revenuePerTrip != null && trip.fuelLogs?.[0]?.cost != null 
                      ? `₹${(trip.revenuePerTrip - trip.fuelLogs[0].cost).toLocaleString()}` 
                      : '—'}
                  </span>
                </div>
              </div>

              {/* View/Download Invoice Button */}
              <Button
                onClick={() => handlePrintInvoice()}
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 text-xs font-semibold cursor-pointer py-2.5"
              >
                <Download className="w-4 h-4" />
                View & Download Invoice (PDF)
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Route Timeline Panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <TripTimeline tripId={id} isActive={isTrackingActive} />
        </div>
      </div>

      {/* Complete Trip Dialog Modal */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Trip</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">{trip.source} → {trip.destination}</p>
          </DialogHeader>
          <CompleteTripForm onSubmit={handleComplete} loading={actionLoading} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
