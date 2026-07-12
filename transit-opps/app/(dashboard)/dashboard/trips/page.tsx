'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, MapPin, Play, CheckCircle, XCircle } from 'lucide-react';
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

function CreateTripForm({ onSubmit, loading }: { onSubmit: (data: Partial<Trip>) => void; loading: boolean }) {
  const { data: vehicles = [] } = useVehicles({ status: 'Available' });
  const { data: drivers = [] } = useDrivers({ status: 'Available' });
  const [form, setForm] = useState({
    source: '', destination: '', vehicleId: '', driverId: '',
    cargoWeight: '', plannedDistance: '', revenuePerTrip: '',
  });

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
          <Input id="source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Chicago, IL" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="destination" className="form-label">Destination *</Label>
          <Input id="destination" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder="Detroit, MI" required className="mt-1" />
        </div>
      </div>
      <div>
        <Label htmlFor="vehicle-select" className="form-label">Vehicle (Available only) *</Label>
        <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v ?? '' })}>
          <SelectTrigger id="vehicle-select" className="mt-1">
            <SelectValue placeholder="Select an available vehicle" />
          </SelectTrigger>
          <SelectContent>
            {vehicles.length === 0 ? (
              <SelectItem value="none" disabled>No available vehicles</SelectItem>
            ) : vehicles.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.registrationNumber} — {v.name} (max {v.maxLoadCapacity.toLocaleString()} kg)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="driver-select" className="form-label">Driver (Available, valid license) *</Label>
        <Select value={form.driverId} onValueChange={(v) => setForm({ ...form, driverId: v ?? '' })}>
          <SelectTrigger id="driver-select" className="mt-1">
            <SelectValue placeholder="Select an available driver" />
          </SelectTrigger>
          <SelectContent>
            {availableDrivers.length === 0 ? (
              <SelectItem value="none" disabled>No available drivers with valid license</SelectItem>
            ) : availableDrivers.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name} — {d.licenseCategory} (expires {new Date(d.licenseExpiry).toLocaleDateString()})
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
          <Label htmlFor="planned-distance" className="form-label">Distance (km) *</Label>
          <Input id="planned-distance" type="number" value={form.plannedDistance} onChange={(e) => setForm({ ...form, plannedDistance: e.target.value })} placeholder="450" min="1" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="revenue" className="form-label">Revenue ($)</Label>
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
      fuelCost: parseFloat(form.fuelCost),
      revenuePerTrip: form.revenuePerTrip ? parseFloat(form.revenuePerTrip) : undefined,
    });
  }

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
          <Label htmlFor="fuel-cost" className="form-label">Fuel Cost ($) *</Label>
          <Input id="fuel-cost" type="number" value={form.fuelCost} onChange={(e) => setForm({ ...form, fuelCost: e.target.value })} placeholder="142.50" min="0" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="trip-revenue" className="form-label">Revenue ($)</Label>
          <Input id="trip-revenue" type="number" value={form.revenuePerTrip} onChange={(e) => setForm({ ...form, revenuePerTrip: e.target.value })} placeholder="3200" min="0" className="mt-1" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
          {loading ? 'Completing...' : 'Complete Trip'}
        </Button>
      </div>
    </form>
  );
}

export default function TripsPage() {
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
                    onClick={() => setViewTrip(t)}
                  >
                    <td>
                      <div className="font-medium text-gray-900">{t.source} <span className="text-gray-400">→</span> {t.destination}</div>
                      <div className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="text-gray-600">{t.vehicle?.registrationNumber ?? '—'}<div className="text-xs text-gray-400">{t.vehicle?.name}</div></td>
                    <td className="text-gray-600">{t.driver?.name ?? '—'}</td>
                    <td className="text-right font-medium">{t.cargoWeight.toLocaleString()}</td>
                    <td className="text-right text-gray-600">{t.plannedDistance.toLocaleString()}</td>
                    <td><StatusBadge status={t.status} /></td>
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
                    {viewTrip.revenuePerTrip != null ? `$${viewTrip.revenuePerTrip.toLocaleString()}` : '—'}
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
                        {viewTrip.fuelLogs?.[0]?.cost != null ? `$${viewTrip.fuelLogs[0].cost.toLocaleString()}` : '—'}
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
