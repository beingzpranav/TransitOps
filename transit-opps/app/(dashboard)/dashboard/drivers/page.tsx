'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Users, Edit, ShieldOff, AlertTriangle } from 'lucide-react';
import { useDrivers, useCreateDriver, useUpdateDriver, useSuspendDriver, Driver } from '@/hooks/useDrivers';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function isExpired(date: string) {
  return new Date(date) < new Date();
}

function isExpiringSoon(date: string) {
  const days30 = new Date();
  days30.setDate(days30.getDate() + 30);
  return new Date(date) < days30 && new Date(date) >= new Date();
}

function DriverForm({
  driver,
  onSubmit,
  loading,
}: {
  driver?: Partial<Driver>;
  onSubmit: (data: Partial<Driver>) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    name: driver?.name ?? '',
    licenseNumber: driver?.licenseNumber ?? '',
    licenseCategory: driver?.licenseCategory ?? '',
    licenseExpiry: driver?.licenseExpiry?.split('T')[0] ?? '',
    contactNumber: driver?.contactNumber ?? '',
    email: driver?.email ?? '',
    safetyScore: driver?.safetyScore?.toString() ?? '',
    status: (driver?.status as string) ?? 'Available',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      ...form,
      status: form.status as Driver['status'],
      safetyScore: form.safetyScore ? parseFloat(form.safetyScore) : undefined,
      email: form.email || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="driver-name" className="form-label">Full Name *</Label>
          <Input id="driver-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Marcus Johnson" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="contact" className="form-label">Contact Number *</Label>
          <Input id="contact" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} placeholder="+1-555-0101" required className="mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="license-num" className="form-label">License Number *</Label>
          <Input id="license-num" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} placeholder="DL-2024-1001" required disabled={!!driver?.id} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="license-cat" className="form-label">License Category *</Label>
          <Select value={form.licenseCategory} onValueChange={(v) => setForm({ ...form, licenseCategory: v ?? '' })}>
            <SelectTrigger id="license-cat" className="mt-1">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Class A CDL">Class A CDL — Heavy trucks &amp; combos</SelectItem>
              <SelectItem value="Class B CDL">Class B CDL — Large single vehicles</SelectItem>
              <SelectItem value="Class C CDL">Class C CDL — Hazmat / passenger</SelectItem>
              <SelectItem value="Class B">Class B — General heavy vehicles</SelectItem>
              <SelectItem value="Class D">Class D — Standard passenger vehicles</SelectItem>
              <SelectItem value="Class E">Class E — Motorcycles</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="license-expiry" className="form-label">License Expiry *</Label>
          <Input id="license-expiry" type="date" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="safety-score" className="form-label">Safety Score (0–100)</Label>
          <Input id="safety-score" type="number" value={form.safetyScore} onChange={(e) => setForm({ ...form, safetyScore: e.target.value })} min="0" max="100" placeholder="85" className="mt-1" />
        </div>
      </div>
      <div>
        <Label htmlFor="driver-email" className="form-label">Email Address</Label>
        <Input id="driver-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="driver@example.com" className="mt-1" />
        <p className="text-xs text-gray-400 mt-0.5">Used for trip assignment and alert notifications</p>
      </div>
      {driver?.id && (
        <div>
          <Label htmlFor="driver-status" className="form-label">Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? 'Available' })}>
            <SelectTrigger id="driver-status" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="OffDuty">Off Duty</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading || !form.licenseCategory}>
          {loading ? 'Saving...' : driver?.id ? 'Update Driver' : 'Add Driver'}
        </Button>
      </div>
    </form>
  );
}

export default function DriversPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [viewDriver, setViewDriver] = useState<Driver | null>(null);
  const [suspendId, setSuspendId] = useState<string | null>(null);
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

  const canManageDrivers = userRole === 'FLEET_MANAGER' || userRole === 'SAFETY_OFFICER';

  const { data: drivers = [], isLoading } = useDrivers(statusFilter ? { status: statusFilter as Driver['status'] } : undefined);
  const createDriver = useCreateDriver();
  const updateDriver = useUpdateDriver();
  const suspendDriver = useSuspendDriver();

  const filtered = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.licenseNumber.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(data: Partial<Driver>) {
    setFormError('');
    try {
      await createDriver.mutateAsync(data);
      setAddOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create driver');
    }
  }

  async function handleUpdate(data: Partial<Driver>) {
    if (!editDriver) return;
    setFormError('');
    try {
      await updateDriver.mutateAsync({ id: editDriver.id, data });
      setEditDriver(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to update driver');
    }
  }

  async function handleSuspend() {
    if (!suspendId) return;
    await suspendDriver.mutateAsync(suspendId);
    setSuspendId(null);
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#ff385c]" />
            Driver Management
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{drivers.length} drivers registered</p>
        </div>
        {canManageDrivers && (
          <Button onClick={() => { setFormError(''); setAddOpen(true); }} id="add-driver-btn">
            <Plus className="w-4 h-4 mr-2" /> Add Driver
          </Button>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name or license..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white"
            id="driver-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'all' || !v ? '' : v)}>
          <SelectTrigger className="w-40 bg-white" id="driver-status-filter">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="OnTrip">On Trip</SelectItem>
            <SelectItem value="OffDuty">Off Duty</SelectItem>
            <SelectItem value="Suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th className="text-left">Driver</th>
                <th className="text-left">License</th>
                <th className="text-left">Category</th>
                <th className="text-left">License Expiry</th>
                <th className="text-right">Safety Score</th>
                <th className="text-left">Status</th>
                {canManageDrivers && <th className="text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(7).fill(0).map((_, j) => (
                      <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    {search ? 'No drivers match your search' : 'No drivers registered yet'}
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const expired = isExpired(d.licenseExpiry);
                  const expiringSoon = !expired && isExpiringSoon(d.licenseExpiry);
                  return (
                    <tr
                      key={d.id}
                      className="cursor-pointer hover:bg-gray-50/50 transition-colors"
                      onClick={() => setViewDriver(d)}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
                            {d.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{d.name}</div>
                            <div className="text-xs text-gray-400">{d.contactNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-[#ff385c] bg-[#ff385c]/10 px-2 py-0.5 rounded w-fit">{d.licenseNumber}</td>
                      <td className="text-gray-600">{d.licenseCategory}</td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          {expired ? (
                            <span className="text-red-600 font-medium text-sm flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {new Date(d.licenseExpiry).toLocaleDateString()}
                            </span>
                          ) : expiringSoon ? (
                            <span className="text-amber-600 font-medium text-sm flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {new Date(d.licenseExpiry).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-sm">{new Date(d.licenseExpiry).toLocaleDateString()}</span>
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                        {d.safetyScore != null ? (
                          <span className={`font-semibold ${d.safetyScore >= 90 ? 'text-emerald-600' : d.safetyScore >= 75 ? 'text-[#ff385c]' : 'text-amber-600'}`}>
                            {d.safetyScore}
                          </span>
                        ) : '—'}
                      </td>
                      <td><StatusBadge status={d.status} /></td>
                      {canManageDrivers && (
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setFormError(''); setEditDriver(d); }} title="Edit" id={`edit-driver-${d.id}`}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            {d.status !== 'Suspended' && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-400 hover:text-orange-600 hover:bg-orange-50" onClick={(e) => { e.stopPropagation(); setSuspendId(d.id); }} title="Suspend" id={`suspend-driver-${d.id}`}>
                                <ShieldOff className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Register New Driver</DialogTitle></DialogHeader>
          {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</div>}
          <DriverForm onSubmit={handleCreate} loading={createDriver.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editDriver} onOpenChange={(o) => !o && setEditDriver(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Edit Driver</DialogTitle></DialogHeader>
          {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</div>}
          {editDriver && <DriverForm driver={editDriver} onSubmit={handleUpdate} loading={updateDriver.isPending} />}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!suspendId}
        onOpenChange={(o) => !o && setSuspendId(null)}
        title="Suspend Driver"
        description="This driver will be marked as Suspended and cannot be assigned to any new trips until reinstated."
        confirmLabel="Suspend Driver"
        onConfirm={handleSuspend}
        loading={suspendDriver.isPending}
      />

      {/* View Driver Details Dialog */}
      <Dialog open={!!viewDriver} onOpenChange={(o) => !o && setViewDriver(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#ff385c]" />
              Driver Profile: {viewDriver?.name}
            </DialogTitle>
          </DialogHeader>
          {viewDriver && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold">
                  {viewDriver.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{viewDriver.name}</h3>
                  <p className="text-xs text-gray-400">{viewDriver.contactNumber}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-3">
                <div>
                  <span className="text-xs text-gray-400 block font-medium">License Number</span>
                  <span className="text-sm font-mono font-semibold text-[#ff385c]">{viewDriver.licenseNumber}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block font-medium">License Category</span>
                  <span className="text-sm font-semibold text-gray-900">{viewDriver.licenseCategory}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-3">
                <div>
                  <span className="text-xs text-gray-400 block font-medium">License Expiration</span>
                  <span className={`text-sm font-semibold ${isExpired(viewDriver.licenseExpiry) ? "text-red-600" : isExpiringSoon(viewDriver.licenseExpiry) ? "text-amber-600" : "text-gray-900"}`}>
                    {new Date(viewDriver.licenseExpiry).toLocaleDateString()}
                    {isExpired(viewDriver.licenseExpiry) && ' (Expired)'}
                    {isExpiringSoon(viewDriver.licenseExpiry) && ' (Expiring soon)'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Current Status</span>
                  <span className="block mt-0.5"><StatusBadge status={viewDriver.status} /></span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Safety Score</span>
                  <span className={`text-sm font-bold ${viewDriver.safetyScore != null && viewDriver.safetyScore >= 90 ? 'text-emerald-600' : viewDriver.safetyScore != null && viewDriver.safetyScore >= 75 ? 'text-[#ff385c]' : 'text-amber-600'}`}>
                    {viewDriver.safetyScore ?? '—'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Registered Date</span>
                  <span className="text-sm font-semibold text-gray-900">{new Date(viewDriver.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              {viewDriver.email && (
                <div className="border-t border-gray-100 pt-3">
                  <span className="text-xs text-gray-400 block font-medium">Notification Email</span>
                  <span className="text-sm font-semibold text-gray-900">{viewDriver.email}</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
