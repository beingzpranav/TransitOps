'use client';

import { useState, useEffect } from 'react';
import { Plus, Wrench, CheckCircle, Clock } from 'lucide-react';
import { useMaintenance, useOpenMaintenance, useCloseMaintenance, MaintenanceLog } from '@/hooks/useFleetData';
import { useVehicles } from '@/hooks/useVehicles';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

function OpenMaintenanceForm({ onSubmit, loading }: { onSubmit: (data: object) => void; loading: boolean }) {
  const { data: vehicles = [] } = useVehicles();
  const [form, setForm] = useState({ vehicleId: '', description: '', cost: '' });
  const availableVehicles = vehicles.filter(v => v.status === 'Available' || v.status === 'InShop');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ ...form, cost: parseFloat(form.cost) });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="maint-vehicle" className="form-label">Vehicle *</Label>
        <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v ?? '' })}>
          <SelectTrigger id="maint-vehicle" className="mt-1">
            <SelectValue placeholder="Select a vehicle" />
          </SelectTrigger>
          <SelectContent>
            {availableVehicles.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {v.registrationNumber} — {v.name}
                {v.status !== 'Available' ? ` (${v.status})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="maint-desc" className="form-label">Description *</Label>
        <Textarea id="maint-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Engine overhaul and brake pad replacement..." rows={3} required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="maint-cost" className="form-label">Estimated Cost (₹) *</Label>
        <Input id="maint-cost" type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="4800" min="0" required className="mt-1" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading || !form.vehicleId}>
          {loading ? 'Opening...' : 'Open Maintenance'}
        </Button>
      </div>
    </form>
  );
}

export default function MaintenancePage() {
  const [openDialog, setOpenDialog] = useState(false);
  const [closeId, setCloseId] = useState<string | null>(null);
  const [viewLog, setViewLog] = useState<MaintenanceLog | null>(null);
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

  const { data: logs = [], isLoading } = useMaintenance();
  const openMaintenance = useOpenMaintenance();
  const closeMaintenance = useCloseMaintenance();

  const active = logs.filter(l => l.isActive);
  const closed = logs.filter(l => !l.isActive);

  async function handleOpen(data: object) {
    setFormError('');
    try {
      await openMaintenance.mutateAsync(data as { vehicleId: string; description: string; cost: number });
      setOpenDialog(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to open maintenance');
    }
  }

  async function handleClose() {
    if (!closeId) return;
    await closeMaintenance.mutateAsync(closeId);
    setCloseId(null);
  }

  function LogRow({ log, showClose }: { log: MaintenanceLog; showClose: boolean }) {
    return (
      <tr
        className="cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setViewLog(log)}
      >
        <td>
          <div className="font-mono font-semibold text-[#ff385c] bg-[#ff385c]/10 px-2 py-0.5 rounded text-xs w-fit">
            {log.vehicle?.registrationNumber}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{log.vehicle?.name}</div>
        </td>
        <td>
          <p className="text-sm text-gray-900 line-clamp-2">{log.description}</p>
        </td>
        <td className="text-right font-medium">₹{log.cost.toLocaleString()}</td>
        <td className="text-gray-600 text-sm">{new Date(log.dateOpened).toLocaleDateString()}</td>
        <td className="text-gray-600 text-sm">{log.dateClosed ? new Date(log.dateClosed).toLocaleDateString() : '—'}</td>
        <td>
          {log.isActive ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Closed
            </span>
          )}
        </td>
        {isFleetManager && (
          <td>
            {showClose && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600 hover:bg-emerald-50" onClick={(e) => { e.stopPropagation(); setCloseId(log.id); }} id={`close-maintenance-${log.id}`}>
                <CheckCircle className="w-3 h-3 mr-1" /> Close
              </Button>
            )}
          </td>
        )}
      </tr>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-[#ff385c]" />
            Maintenance Logs
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{active.length} active — {closed.length} closed</p>
        </div>
        {isFleetManager && (
          <Button onClick={() => { setFormError(''); setOpenDialog(true); }} id="open-maintenance-btn">
            <Plus className="w-4 h-4 mr-2" /> Open Maintenance
          </Button>
        )}
      </div>

      {/* Active Maintenance */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Active ({active.length})
        </h2>
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th className="text-left">Vehicle</th>
                  <th className="text-left">Description</th>
                  <th className="text-right">Cost</th>
                  <th className="text-left">Opened</th>
                  <th className="text-left">Closed</th>
                  <th className="text-left">Status</th>
                  {isFleetManager && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7}><div className="h-16 animate-pulse bg-gray-100" /></td></tr>
                ) : active.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">No active maintenance records</td></tr>
                ) : (
                  active.map(l => <LogRow key={l.id} log={l} showClose={true} />)
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Closed Maintenance */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Closed ({closed.length})
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th className="text-left">Vehicle</th>
                  <th className="text-left">Description</th>
                  <th className="text-right">Cost</th>
                  <th className="text-left">Opened</th>
                  <th className="text-left">Closed</th>
                  <th className="text-left">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={7}><div className="h-16 animate-pulse bg-gray-100" /></td></tr>
                ) : closed.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">No closed maintenance records</td></tr>
                ) : (
                  closed.map(l => <LogRow key={l.id} log={l} showClose={false} />)
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Open Maintenance Record</DialogTitle></DialogHeader>
          {formError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</div>}
          <OpenMaintenanceForm onSubmit={handleOpen} loading={openMaintenance.isPending} />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!closeId}
        onOpenChange={(o) => !o && setCloseId(null)}
        title="Close Maintenance Record"
        description="This will close the maintenance record and restore the vehicle to Available status (unless Retired)."
        confirmLabel="Close Maintenance"
        onConfirm={handleClose}
        loading={closeMaintenance.isPending}
      />

      {/* View Maintenance Details Dialog */}
      <Dialog open={!!viewLog} onOpenChange={(o) => !o && setViewLog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[#ff385c]" />
              Maintenance Details
            </DialogTitle>
          </DialogHeader>
          {viewLog && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-3">
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Vehicle Registration</span>
                  <span className="text-sm font-mono font-semibold text-[#ff385c]">
                    {viewLog.vehicle?.registrationNumber ?? '—'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Vehicle Name</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {viewLog.vehicle?.name ?? '—'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-3">
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Status</span>
                  <span className="block mt-0.5">
                    {viewLog.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Closed
                      </span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Total Cost</span>
                  <span className="text-sm font-semibold text-gray-900">₹{viewLog.cost.toLocaleString()}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-3">
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Date Opened</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {new Date(viewLog.dateOpened).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Date Closed</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {viewLog.dateClosed ? new Date(viewLog.dateClosed).toLocaleString() : '—'}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-xs text-gray-400 block font-medium mb-1">Detailed Description</span>
                <div className="bg-[#f7f7f7] border border-[#dddddd] rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap">
                  {viewLog.description}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
