'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, MapPin, Play, CheckCircle, XCircle, Printer } from 'lucide-react';
import { useTrips, useCreateTrip, useDispatchTrip, useCompleteTrip, useCancelTrip, Trip } from '@/hooks/useTrips';
import { useVehicles } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface GeocodeSuggestion {
  display_name: string;
  lat: string;
  lon: string;
}

function MiniETA({ actualStartTime, plannedDistance }: { actualStartTime?: string | null; plannedDistance: number }) {
  const [etaText, setEtaText] = useState<string>('');

  useEffect(() => {
    if (!actualStartTime) return;

    function update() {
      const elapsedMs = Date.now() - new Date(actualStartTime).getTime();
      const elapsedH = elapsedMs / (1000 * 60 * 60);
      const covered = elapsedH * 60; // Assumed 60 km/h average speed
      const remaining = plannedDistance - covered;

      if (remaining <= 0) {
        setEtaText('Arriving soon');
      } else {
        const remainingMin = (remaining / 60) * 60;
        if (remainingMin < 60) {
          setEtaText(`~${Math.round(remainingMin)}m left`);
        } else {
          const h = Math.floor(remainingMin / 60);
          const m = Math.round(remainingMin % 60);
          setEtaText(`~${h}h ${m}m left`);
        }
      }
    }

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [actualStartTime, plannedDistance]);

  if (!actualStartTime) return null;

  return (
    <div className="text-[10px] text-gray-500 font-medium mt-1 flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
      <span className="truncate">{etaText}</span>
    </div>
  );
}

function LocationAutocomplete({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (val: string, coords: { lat: string; lon: string } | null) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    if (query === value) {
      return;
    }

    setLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const token = localStorage.getItem('transitops_token');
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (err) {
        console.error("Geocoding fetch failed", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query, value]);

  return (
    <div className="relative mt-1">
      <Input
        id={id}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (e.target.value === '') {
            onChange('', null);
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setTimeout(() => setOpen(false), 200);
        }}
        placeholder={placeholder}
        required
        autoComplete="off"
        className="w-full"
      />
      {open && (loading || suggestions.length > 0) && (
        <div className="absolute z-50 w-full bg-white border border-gray-100 rounded-xl shadow-lg mt-1 max-h-60 overflow-y-auto divide-y divide-gray-50">
          {loading && (
            <div className="px-4 py-3 text-xs text-gray-400 flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-[#ff385c] border-t-transparent rounded-full animate-spin" />
              <span>Searching locations...</span>
            </div>
          )}
          {!loading && suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(s.display_name);
                onChange(s.display_name, { lat: s.lat, lon: s.lon });
                setSuggestions([]);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors focus:bg-gray-50 focus:outline-none"
            >
              {s.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateTripForm({ onSubmit, loading }: { onSubmit: (data: Partial<Trip>) => void; loading: boolean }) {
  const { data: vehicles = [] } = useVehicles({ status: 'Available' });
  const { data: drivers = [] } = useDrivers({ status: 'Available' });
  const [form, setForm] = useState({
    source: '', destination: '', vehicleId: '', driverId: '',
    cargoWeight: '', plannedDistance: '', revenuePerTrip: '',
  });

  const [sourceCoords, setSourceCoords] = useState<{ lat: string; lon: string } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: string; lon: string } | null>(null);
  const [calculatingDistance, setCalculatingDistance] = useState(false);

  useEffect(() => {
    if (!sourceCoords || !destCoords) return;

    setCalculatingDistance(true);
    const token = localStorage.getItem('transitops_token');

    fetch(
      `/api/geocode/distance?sourceLat=${sourceCoords.lat}&sourceLon=${sourceCoords.lon}&destLat=${destCoords.lat}&destLon=${destCoords.lon}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    )
      .then((res) => {
        if (!res.ok) throw new Error("Distance API failed");
        return res.json();
      })
      .then((data) => {
        setForm((prev) => ({
          ...prev,
          plannedDistance: String(data.distanceKm),
        }));
      })
      .catch((err) => console.error("Failed to calculate distance:", err))
      .finally(() => setCalculatingDistance(false));
  }, [sourceCoords, destCoords]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      ...form,
      cargoWeight: parseFloat(form.cargoWeight),
      plannedDistance: parseFloat(form.plannedDistance),
      revenuePerTrip: form.revenuePerTrip ? parseFloat(form.revenuePerTrip) : undefined,
    });
  }

  const availableDrivers = drivers.filter(d => {
    const notExpired = new Date(d.licenseExpiry) >= new Date();
    return notExpired && d.status === 'Available';
  });

  const selectedVehicle = vehicles.find(v => v.id === form.vehicleId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="source" className="form-label">Source *</Label>
          <LocationAutocomplete
            id="source"
            value={form.source}
            onChange={(val, coords) => {
              setForm({ ...form, source: val });
              setSourceCoords(coords);
            }}
            placeholder="Search source (e.g. Jaipur)"
          />
        </div>
        <div>
          <Label htmlFor="destination" className="form-label">Destination *</Label>
          <LocationAutocomplete
            id="destination"
            value={form.destination}
            onChange={(val, coords) => {
              setForm({ ...form, destination: val });
              setDestCoords(coords);
            }}
            placeholder="Search destination (e.g. Udaipur)"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="vehicle-select" className="form-label">Vehicle (Available only) *</Label>
        <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v ?? '' })}>
          <SelectTrigger id="vehicle-select" className="mt-1">
            <SelectValue placeholder="Select an available vehicle">
              {(value) => {
                const v = vehicles.find((x) => x.id === value);
                return v ? `${v.registrationNumber} — ${v.name}` : "Select an available vehicle";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {vehicles.length === 0 ? (
              <SelectItem value="none" disabled>No available vehicles</SelectItem>
            ) : vehicles.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {`${v.registrationNumber} — ${v.name} (max ${v.maxLoadCapacity.toLocaleString()} kg)`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="driver-select" className="form-label">Driver (Available, valid license) *</Label>
        <Select value={form.driverId} onValueChange={(v) => setForm({ ...form, driverId: v ?? '' })}>
          <SelectTrigger id="driver-select" className="mt-1">
            <SelectValue placeholder="Select an available driver">
              {(value) => {
                const d = drivers.find((x) => x.id === value);
                return d ? `${d.name} — ${d.licenseCategory}` : "Select an available driver";
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableDrivers.length === 0 ? (
              <SelectItem value="none" disabled>No available drivers with valid license</SelectItem>
            ) : availableDrivers.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {`${d.name} — ${d.licenseCategory} (expires ${new Date(d.licenseExpiry).toLocaleDateString()})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="cargo-weight" className="form-label">Cargo Weight (kg) *</Label>
          <Input id="cargo-weight" type="number" value={form.cargoWeight} onChange={(e) => setForm({ ...form, cargoWeight: e.target.value })} placeholder="5000" min="1" required className="mt-1" />
          {selectedVehicle && form.cargoWeight && parseFloat(form.cargoWeight) > selectedVehicle.maxLoadCapacity && (
            <p className="text-xs text-red-600 mt-1">⚠️ Exceeds vehicle capacity ({selectedVehicle.maxLoadCapacity} kg)</p>
          )}
        </div>
        <div>
          <Label htmlFor="planned-distance" className="form-label flex items-center justify-between">
            <span>Distance (km) *</span>
            {calculatingDistance && <span className="text-[10px] text-[#ff385c] animate-pulse">Calculating...</span>}
          </Label>
          <Input
            id="planned-distance"
            type="number"
            step="any"
            value={form.plannedDistance}
            onChange={(e) => setForm({ ...form, plannedDistance: e.target.value })}
            placeholder="450"
            min="1"
            required
            className={`mt-1 ${!!sourceCoords && !!destCoords ? 'bg-gray-50 border-gray-200 cursor-not-allowed select-none text-gray-500 font-medium' : ''}`}
            disabled={calculatingDistance}
            readOnly={!!sourceCoords && !!destCoords}
            title={!!sourceCoords && !!destCoords ? "Auto-calculated from source and destination coordinates. Unchangeable." : undefined}
          />
        </div>
        <div>
          <Label htmlFor="revenue" className="form-label">Revenue (₹)</Label>
          <Input id="revenue" type="number" value={form.revenuePerTrip} onChange={(e) => setForm({ ...form, revenuePerTrip: e.target.value })} placeholder="3200" min="0" className="mt-1" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Trip'}
        </Button>
      </div>
    </form>
  );
}

function CompleteTripForm({ onSubmit, loading }: { onSubmit: (data: object) => void; loading: boolean }) {
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
          <Label htmlFor="final-odometer" className="form-label">Final Odometer (km) *</Label>
          <Input id="final-odometer" type="number" value={form.finalOdometer} onChange={(e) => setForm({ ...form, finalOdometer: e.target.value })} placeholder="48650" min="0" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="fuel-consumed" className="form-label">Fuel Consumed (L) *</Label>
          <Input id="fuel-consumed" type="number" value={form.fuelConsumed} onChange={(e) => setForm({ ...form, fuelConsumed: e.target.value })} placeholder="95" min="0" required className="mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fuel-cost" className="form-label">Fuel Cost (₹ per Liter) *</Label>
          <Input id="fuel-cost" type="number" value={form.fuelCost} onChange={(e) => setForm({ ...form, fuelCost: e.target.value })} placeholder="102.50" min="0" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="trip-revenue" className="form-label">Revenue (₹)</Label>
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
        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {loading ? 'Completing...' : 'Complete Trip'}
        </Button>
      </div>
    </form>
  );
}

export default function TripsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [completeTrip, setCompleteTrip] = useState<Trip | null>(null);
  const [viewTrip, setViewTrip] = useState<Trip | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [dispatchId, setDispatchId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
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

  const canManageTrips = userRole === 'FLEET_MANAGER' || userRole === 'DISPATCHER';

  const { data: trips = [], isLoading } = useTrips(statusFilter ? { status: statusFilter as Trip['status'] } : undefined);
  const createTripMut = useCreateTrip();
  const dispatchTripMut = useDispatchTrip();
  const completeTripMut = useCompleteTrip();
  const cancelTripMut = useCancelTrip();

  const filtered = trips.filter(
    (t) =>
      t.source.toLowerCase().includes(search.toLowerCase()) ||
      t.destination.toLowerCase().includes(search.toLowerCase()) ||
      t.vehicle?.registrationNumber?.toLowerCase().includes(search.toLowerCase()) ||
      t.driver?.name?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(data: Partial<Trip>) {
    setFormError('');
    try {
      await createTripMut.mutateAsync(data);
      setCreateOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create trip');
    }
  }

  async function handleDispatch() {
    if (!dispatchId) return;
    try {
      await dispatchTripMut.mutateAsync(dispatchId);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Dispatch failed');
    } finally {
      setDispatchId(null);
    }
  }

  async function handleComplete(data: object) {
    if (!completeTrip) return;
    setFormError('');
    try {
      await completeTripMut.mutateAsync({ id: completeTrip.id, data: data as { finalOdometer: number; fuelConsumed: number; fuelCost: number } });
      setCompleteTrip(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to complete trip');
    }
  }

  async function handleCancel() {
    if (!cancelId) return;
    await cancelTripMut.mutateAsync(cancelId);
    setCancelId(null);
  }

  function handlePrintInvoice(trip: Trip) {
    const fuelCost = trip.fuelLogs?.[0]?.cost ?? 0;
    const revenue = trip.revenuePerTrip ?? 0;
    const netProfit = revenue - fuelCost;
    const invoiceNumber = `INV-${trip.id.slice(0, 8).toUpperCase()}`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

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
                  <div class="meta-value">${new Date(trip.createdAt).toLocaleDateString()}</div>
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

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-[#ff385c]" />
            Trip Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{trips.length} trips total</p>
        </div>
        {canManageTrips && (
          <Button onClick={() => { setFormError(''); setCreateOpen(true); }} id="create-trip-btn">
            <Plus className="w-4 h-4 mr-2" /> Create Trip
          </Button>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search route, vehicle, or driver..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-white" id="trip-search" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'all' || !v ? '' : v)}>
          <SelectTrigger className="w-40 bg-white" id="trip-status-filter">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Dispatched">Dispatched</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left">Route</th>
                <th className="text-left">Vehicle</th>
                <th className="text-left">Driver</th>
                <th className="text-right">Cargo (kg)</th>
                <th className="text-right">Distance (km)</th>
                <th className="text-left">Status</th>
                {canManageTrips && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(4).fill(0).map((_, i) => <tr key={i}>{Array(7).fill(0).map((_, j) => <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>)
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">{search ? 'No trips match your search' : 'No trips yet'}</td></tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    className="cursor-pointer hover:bg-gray-50/50 transition-colors"
                    onClick={() => router.push(`/dashboard/trips/${t.id}`)}
                  >
                    <td>
                      <div className="font-medium text-gray-900">{t.source} <span className="text-gray-400">→</span> {t.destination}</div>
                      <div className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="text-gray-600">{t.vehicle?.registrationNumber ?? '—'}<div className="text-xs text-gray-400">{t.vehicle?.name}</div></td>
                    <td className="text-gray-600">{t.driver?.name ?? '—'}</td>
                    <td className="text-right font-medium">{t.cargoWeight.toLocaleString()}</td>
                    <td className="text-right text-gray-600">{t.plannedDistance.toLocaleString()}</td>
                    <td>
                      <StatusBadge status={t.status} />
                      {t.status === 'Dispatched' && t.actualStartTime && (
                        <MiniETA actualStartTime={t.actualStartTime} plannedDistance={t.plannedDistance} />
                      )}
                    </td>
                    {canManageTrips && (
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {t.status === 'Draft' && (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-[#ff385c] hover:bg-[#ff385c]/10" onClick={(e) => { e.stopPropagation(); setDispatchId(t.id); }} id={`dispatch-${t.id}`}>
                                <Play className="w-3 h-3 mr-1" /> Dispatch
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setCancelId(t.id); }} id={`cancel-${t.id}`}>
                                <XCircle className="w-3 h-3 mr-1" /> Cancel
                              </Button>
                            </>
                          )}
                          {t.status === 'Dispatched' && (
                            <>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600 hover:bg-emerald-50" onClick={(e) => { e.stopPropagation(); setFormError(''); setCompleteTrip(t); }} id={`complete-${t.id}`}>
                                <CheckCircle className="w-3 h-3 mr-1" /> Complete
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setCancelId(t.id); }} id={`cancel-dispatched-${t.id}`}>
                                <XCircle className="w-3 h-3 mr-1" /> Cancel
                              </Button>
                            </>
                          )}
                          {t.status === 'Completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-emerald-600 hover:bg-emerald-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintInvoice(t);
                              }}
                              id={`print-${t.id}`}
                            >
                              <Printer className="w-3 h-3 mr-1" /> Invoice
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Trip Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Create New Trip</DialogTitle></DialogHeader>
          {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</div>}
          <CreateTripForm onSubmit={handleCreate} loading={createTripMut.isPending} />
        </DialogContent>
      </Dialog>

      {/* Complete Trip Dialog */}
      <Dialog open={!!completeTrip} onOpenChange={(o) => !o && setCompleteTrip(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Complete Trip</DialogTitle>
            {completeTrip && <p className="text-sm text-gray-500 mt-1">{completeTrip.source} → {completeTrip.destination}</p>}
          </DialogHeader>
          {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</div>}
          <CompleteTripForm onSubmit={handleComplete} loading={completeTripMut.isPending} />
        </DialogContent>
      </Dialog>

      {/* Dispatch Confirm */}
      <ConfirmDialog
        open={!!dispatchId}
        onOpenChange={(o) => !o && setDispatchId(null)}
        title="Dispatch Trip"
        description="This will dispatch the trip and set both the vehicle and driver to On Trip. Are you sure?"
        confirmLabel="Dispatch"
        variant="default"
        onConfirm={handleDispatch}
        loading={dispatchTripMut.isPending}
      />

      {/* Cancel Confirm */}
      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={(o) => !o && setCancelId(null)}
        title="Cancel Trip"
        description="This will cancel the trip. If dispatched, the vehicle and driver will be returned to Available."
        confirmLabel="Cancel Trip"
        onConfirm={handleCancel}
        loading={cancelTripMut.isPending}
      />

      {/* View Trip Details Dialog */}
      <Dialog open={!!viewTrip} onOpenChange={(o) => !o && setViewTrip(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#ff385c]" />
              Trip Details
            </DialogTitle>
          </DialogHeader>
          {viewTrip && (
            <div className="space-y-4 pt-2">
              <div className="border-b border-gray-100 pb-3">
                <span className="text-xs text-gray-400 block font-medium">Route</span>
                <span className="text-base font-semibold text-gray-900">
                  {viewTrip.source} → {viewTrip.destination}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-3">
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Status</span>
                  <span className="block mt-0.5"><StatusBadge status={viewTrip.status} /></span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Created At</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {new Date(viewTrip.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-3">
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Assigned Driver</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {viewTrip.driver?.name ?? '—'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Assigned Vehicle</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {viewTrip.vehicle?.registrationNumber ? `${viewTrip.vehicle.registrationNumber} (${viewTrip.vehicle.name})` : '—'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 border-b border-gray-100 pb-3">
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Cargo Weight</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {viewTrip.cargoWeight.toLocaleString()} kg
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Planned Distance</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {viewTrip.plannedDistance.toLocaleString()} km
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Expected Revenue</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {viewTrip.revenuePerTrip != null ? `₹${viewTrip.revenuePerTrip.toLocaleString()}` : '—'}
                  </span>
                </div>
              </div>
              {viewTrip.status === 'Completed' && (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3 space-y-2">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Completion Details</span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400 block">Final Odometer</span>
                      <span className="font-semibold text-emerald-900">{viewTrip.finalOdometer?.toLocaleString() ?? '—'} km</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Fuel Consumed</span>
                      <span className="font-semibold text-emerald-900">{viewTrip.fuelConsumed?.toLocaleString() ?? '—'} L</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block">Fuel Cost</span>
                      <span className="font-semibold text-emerald-900">
                        {viewTrip.fuelLogs?.[0]?.cost != null ? `₹${viewTrip.fuelLogs[0].cost.toLocaleString()}` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
