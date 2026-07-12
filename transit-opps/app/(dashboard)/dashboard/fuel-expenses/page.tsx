'use client';

import { useState, useEffect } from 'react';
import { Plus, Fuel, Receipt } from 'lucide-react';
import {
  useFuelLogs, useCreateFuelLog,
  useExpenses, useCreateExpense,
  FuelLog, Expense
} from '@/hooks/useFleetData';
import { useVehicles } from '@/hooks/useVehicles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function FuelLogForm({ onSubmit, loading }: { onSubmit: (data: object) => void; loading: boolean }) {
  const { data: vehicles = [] } = useVehicles();
  const [form, setForm] = useState({ vehicleId: '', liters: '', cost: '', date: new Date().toISOString().split('T')[0] });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ ...form, liters: parseFloat(form.liters), cost: parseFloat(form.cost) });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="fuel-vehicle" className="form-label">Vehicle *</Label>
        <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v ?? '' })}>
          <SelectTrigger id="fuel-vehicle" className="mt-1">
            <SelectValue placeholder="Select a vehicle" />
          </SelectTrigger>
          <SelectContent>
            {vehicles.filter(v => v.status !== 'Retired').map(v => (
              <SelectItem key={v.id} value={v.id}>{v.registrationNumber} — {v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="fuel-liters" className="form-label">Liters *</Label>
          <Input id="fuel-liters" type="number" value={form.liters} onChange={e => setForm({ ...form, liters: e.target.value })} placeholder="95" min="0.1" step="0.1" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="fuel-cost" className="form-label">Cost ($) *</Label>
          <Input id="fuel-cost" type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="142.50" min="0" step="0.01" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="fuel-date" className="form-label">Date *</Label>
          <Input id="fuel-date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required className="mt-1" />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading || !form.vehicleId}>
          {loading ? 'Saving...' : 'Add Fuel Log'}
        </Button>
      </div>
    </form>
  );
}

function ExpenseForm({ onSubmit, loading }: { onSubmit: (data: object) => void; loading: boolean }) {
  const { data: vehicles = [] } = useVehicles();
  const [form, setForm] = useState({ vehicleId: '', type: '', amount: '', notes: '', date: new Date().toISOString().split('T')[0] });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ ...form, amount: parseFloat(form.amount) });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="exp-vehicle" className="form-label">Vehicle *</Label>
          <Select value={form.vehicleId} onValueChange={(v) => setForm({ ...form, vehicleId: v ?? '' })}>
            <SelectTrigger id="exp-vehicle" className="mt-1">
              <SelectValue placeholder="Select a vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.filter(v => v.status !== 'Retired').map(v => (
                <SelectItem key={v.id} value={v.id}>{v.registrationNumber} — {v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="exp-type" className="form-label">Expense Type *</Label>
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v ?? '' })}>
            <SelectTrigger id="exp-type" className="mt-1">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Toll">Toll</SelectItem>
              <SelectItem value="Parking">Parking</SelectItem>
              <SelectItem value="Repair">Repair</SelectItem>
              <SelectItem value="Insurance">Insurance</SelectItem>
              <SelectItem value="Permit">Permit</SelectItem>
              <SelectItem value="Misc">Miscellaneous</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="exp-amount" className="form-label">Amount ($) *</Label>
          <Input id="exp-amount" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="45.00" min="0.01" step="0.01" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="exp-date" className="form-label">Date *</Label>
          <Input id="exp-date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required className="mt-1" />
        </div>
      </div>
      <div>
        <Label htmlFor="exp-notes" className="form-label">Notes</Label>
        <Input id="exp-notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="I-94 westbound tolls" className="mt-1" />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading || !form.vehicleId || !form.type}>
          {loading ? 'Saving...' : 'Add Expense'}
        </Button>
      </div>
    </form>
  );
}

export default function FuelExpensesPage() {
  const [fuelOpen, setFuelOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
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

  const canAddLog = userRole === 'FLEET_MANAGER' || userRole === 'DISPATCHER' || userRole === 'FINANCIAL_ANALYST';

  const { data: fuelLogs = [], isLoading: fuelLoading } = useFuelLogs();
  const { data: expenses = [], isLoading: expLoading } = useExpenses();
  const createFuelLog = useCreateFuelLog();
  const createExpense = useCreateExpense();

  const totalFuelCost = fuelLogs.reduce((s, l) => s + l.cost, 0);
  const totalFuelLiters = fuelLogs.reduce((s, l) => s + l.liters, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  async function handleFuelSubmit(data: object) {
    await createFuelLog.mutateAsync(data as { vehicleId: string; liters: number; cost: number });
    setFuelOpen(false);
  }

  async function handleExpenseSubmit(data: object) {
    await createExpense.mutateAsync(data as { vehicleId: string; type: string; amount: number });
    setExpenseOpen(false);
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Fuel className="w-6 h-6 text-blue-500" />
            Fuel & Expenses
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Track operational costs across your fleet</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="kpi-card">
          <p className="text-sm text-gray-500 mb-1">Total Fuel Cost</p>
          <p className="text-2xl font-bold text-gray-900">${totalFuelCost.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">{totalFuelLiters.toFixed(0)} liters total</p>
        </div>
        <div className="kpi-card">
          <p className="text-sm text-gray-500 mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-gray-900">${totalExpenses.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">{expenses.length} expense entries</p>
        </div>
        <div className="kpi-card">
          <p className="text-sm text-gray-500 mb-1">Combined Operational Cost</p>
          <p className="text-2xl font-bold text-gray-900">${(totalFuelCost + totalExpenses).toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-1">Fuel + expenses (excl. maintenance)</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="fuel">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="fuel" id="tab-fuel">⛽ Fuel Logs ({fuelLogs.length})</TabsTrigger>
            <TabsTrigger value="expenses" id="tab-expenses">🧾 Expenses ({expenses.length})</TabsTrigger>
          </TabsList>
          {canAddLog && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setFuelOpen(true)} id="add-fuel-btn">
                <Plus className="w-4 h-4 mr-1" /> Add Fuel Log
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExpenseOpen(true)} id="add-expense-btn">
                <Plus className="w-4 h-4 mr-1" /> Add Expense
              </Button>
            </div>
          )}
        </div>

        {/* Fuel Logs Tab */}
        <TabsContent value="fuel" className="mt-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th className="text-left">Vehicle</th>
                    <th className="text-left">Date</th>
                    <th className="text-right">Liters</th>
                    <th className="text-right">Cost ($)</th>
                    <th className="text-right">Cost/Liter</th>
                    <th className="text-left">Linked Trip</th>
                  </tr>
                </thead>
                <tbody>
                  {fuelLoading ? (
                    Array(4).fill(0).map((_, i) => <tr key={i}>{Array(6).fill(0).map((_, j) => <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>)
                  ) : fuelLogs.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-400">No fuel logs yet</td></tr>
                  ) : (
                    fuelLogs.map((l: FuelLog) => (
                      <tr key={l.id}>
                        <td>
                          <div className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{l.vehicle?.registrationNumber}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{l.vehicle?.name}</div>
                        </td>
                        <td className="text-gray-600 text-sm">{new Date(l.date).toLocaleDateString()}</td>
                        <td className="text-right font-medium">{l.liters.toFixed(1)}</td>
                        <td className="text-right font-medium text-gray-900">${l.cost.toFixed(2)}</td>
                        <td className="text-right text-gray-500 text-sm">${(l.cost / l.liters).toFixed(2)}</td>
                        <td className="text-gray-500 text-xs">
                          {l.trip ? `${l.trip.source} → ${l.trip.destination}` : 'Manual'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="mt-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full data-table">
                <thead>
                  <tr>
                    <th className="text-left">Vehicle</th>
                    <th className="text-left">Type</th>
                    <th className="text-left">Date</th>
                    <th className="text-right">Amount ($)</th>
                    <th className="text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {expLoading ? (
                    Array(4).fill(0).map((_, i) => <tr key={i}>{Array(5).fill(0).map((_, j) => <td key={j}><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>)}</tr>)
                  ) : expenses.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-gray-400">No expenses yet</td></tr>
                  ) : (
                    expenses.map((e: Expense) => (
                      <tr key={e.id}>
                        <td>
                          <div className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{e.vehicle?.registrationNumber}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{e.vehicle?.name}</div>
                        </td>
                        <td>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
                            {e.type}
                          </span>
                        </td>
                        <td className="text-gray-600 text-sm">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="text-right font-semibold text-gray-900">${e.amount.toFixed(2)}</td>
                        <td className="text-gray-500 text-sm">{e.notes ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={fuelOpen} onOpenChange={setFuelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Fuel Log</DialogTitle></DialogHeader>
          <FuelLogForm onSubmit={handleFuelSubmit} loading={createFuelLog.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <ExpenseForm onSubmit={handleExpenseSubmit} loading={createExpense.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
