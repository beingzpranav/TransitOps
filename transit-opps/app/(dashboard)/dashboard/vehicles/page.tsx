'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Truck, Edit, Archive } from 'lucide-react';
import { useVehicles, useCreateVehicle, useUpdateVehicle, useRetireVehicle, Vehicle } from '@/hooks/useVehicles';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

function VehicleForm({
  vehicle,
  onSubmit,
  loading,
}: {
  vehicle?: Partial<Vehicle>;
  onSubmit: (data: Partial<Vehicle>) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    registrationNumber: vehicle?.registrationNumber ?? '',
    name: vehicle?.name ?? '',
    type: vehicle?.type ?? '',
    maxLoadCapacity: vehicle?.maxLoadCapacity?.toString() ?? '',
    odometer: vehicle?.odometer?.toString() ?? '0',
    acquisitionCost: vehicle?.acquisitionCost?.toString() ?? '',
    region: vehicle?.region ?? '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      ...form,
      maxLoadCapacity: parseFloat(form.maxLoadCapacity),
      odometer: parseFloat(form.odometer),
      acquisitionCost: parseFloat(form.acquisitionCost),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="reg-num" className="form-label">Registration Number *</Label>
          <Input
            id="reg-num"
            value={form.registrationNumber}
            onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
            placeholder="TRK-001"
            required
            disabled={!!vehicle?.id}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="vehicle-name" className="form-label">Vehicle Name *</Label>
          <Input
            id="vehicle-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Volvo FH16"
            required
            className="mt-1"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="vehicle-type" className="form-label">Type *</Label>
          <Input
            id="vehicle-type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            placeholder="Heavy Truck"
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="region" className="form-label">Region</Label>
          <Input
            id="region"
            value={form.region}
            onChange={(e) => setForm({ ...form, region: e.target.value })}
            placeholder="North"
            className="mt-1"
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="max-load" className="form-label">Max Load (kg) *</Label>
          <Input
            id="max-load"
            type="number"
            value={form.maxLoadCapacity}
            onChange={(e) => setForm({ ...form, maxLoadCapacity: e.target.value })}
            placeholder="25000"
            min="1"
            required
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="odometer" className="form-label">Odometer (km)</Label>
          <Input
            id="odometer"
            type="number"
            value={form.odometer}
            onChange={(e) => setForm({ ...form, odometer: e.target.value })}
            min="0"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="acq-cost" className="form-label">Acquisition Cost ($) *</Label>
          <Input
            id="acq-cost"
            type="number"
            value={form.acquisitionCost}
            onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })}
            placeholder="95000"
            min="0"
            required
            className="mt-1"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : vehicle?.id ? 'Update Vehicle' : 'Add Vehicle'}
        </Button>
      </div>
    </form>
  );
}

export default function VehiclesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [retireId, setRetireId] = useState<string | null>(null);
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

  const isFleetManager = userRole === 'FLEET_MANAGER';

  const { data: vehicles = [], isLoading } = useVehicles(statusFilter ? { status: statusFilter as Vehicle['status'] } : undefined);
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const retireVehicle = useRetireVehicle();

  const filtered = vehicles.filter(
    (v) =>
      v.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.type.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(data: Partial<Vehicle>) {
    setFormError('');
    try {
      await createVehicle.mutateAsync(data);
      setAddOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create vehicle');
    }
  }

  async function handleUpdate(data: Partial<Vehicle>) {
    if (!editVehicle) return;
    setFormError('');
    try {
      await updateVehicle.mutateAsync({ id: editVehicle.id, data });
      setEditVehicle(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to update vehicle');
    }
  }

  async function handleRetire() {
    if (!retireId) return;
    await retireVehicle.mutateAsync(retireId);
    setRetireId(null);
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-500" />
            Vehicle Registry
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{vehicles.length} vehicles registered</p>
        </div>
        {isFleetManager && (
          <Button onClick={() => { setFormError(''); setAddOpen(true); }} id="add-vehicle-btn">
            <Plus className="w-4 h-4 mr-2" /> Add Vehicle
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by registration, name, or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
            id="vehicle-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'all' || !v ? '' : v)}>
          <SelectTrigger className="w-40 bg-white" id="vehicle-status-filter">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="OnTrip">On Trip</SelectItem>
            <SelectItem value="InShop">In Shop</SelectItem>
            <SelectItem value="Retired">Retired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left">Registration</th>
                <th className="text-left">Name / Type</th>
                <th className="text-left">Status</th>
                <th className="text-right">Max Load (kg)</th>
                <th className="text-right">Odometer (km)</th>
                <th className="text-right">Acq. Cost</th>
                <th className="text-left">Region</th>
                {isFleetManager && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(8).fill(0).map((_, j) => (
                      <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    {search ? 'No vehicles match your search' : 'No vehicles registered yet'}
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs">
                        {v.registrationNumber}
                      </span>
                    </td>
                    <td>
                      <div className="font-medium text-gray-900">{v.name}</div>
                      <div className="text-xs text-gray-400">{v.type}</div>
                    </td>
                    <td><StatusBadge status={v.status} /></td>
                    <td className="text-right font-medium">{v.maxLoadCapacity.toLocaleString()}</td>
                    <td className="text-right text-gray-600">{v.odometer.toLocaleString()}</td>
                    <td className="text-right text-gray-600">${v.acquisitionCost.toLocaleString()}</td>
                    <td className="text-gray-500">{v.region ?? '—'}</td>
                    {isFleetManager && (
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => { setFormError(''); setEditVehicle(v); }}
                            title="Edit"
                            id={`edit-vehicle-${v.id}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          {v.status !== 'Retired' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => setRetireId(v.id)}
                              title="Retire"
                              id={`retire-vehicle-${v.id}`}
                            >
                              <Archive className="w-3.5 h-3.5" />
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

      {/* Add Vehicle Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Register New Vehicle</DialogTitle>
          </DialogHeader>
          {formError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}
          <VehicleForm onSubmit={handleCreate} loading={createVehicle.isPending} />
        </DialogContent>
      </Dialog>

      {/* Edit Vehicle Dialog */}
      <Dialog open={!!editVehicle} onOpenChange={(o) => !o && setEditVehicle(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
          </DialogHeader>
          {formError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {formError}
            </div>
          )}
          {editVehicle && (
            <VehicleForm vehicle={editVehicle} onSubmit={handleUpdate} loading={updateVehicle.isPending} />
          )}
        </DialogContent>
      </Dialog>

      {/* Retire Confirm Dialog */}
      <ConfirmDialog
        open={!!retireId}
        onOpenChange={(o) => !o && setRetireId(null)}
        title="Retire Vehicle"
        description="This will mark the vehicle as Retired and remove it from the dispatch pool. This cannot be easily undone."
        confirmLabel="Retire Vehicle"
        onConfirm={handleRetire}
        loading={retireVehicle.isPending}
      />
    </div>
  );
}
