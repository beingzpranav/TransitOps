'use client';

import { useState, useEffect } from 'react';
import { Plus, Fuel } from 'lucide-react';
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
        <Label htmlFor="fuel-vehicle" className="text-gray-700">Vehicle *</Label>
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
          <Label htmlFor="fuel-liters" className="text-gray-700">Liters *</Label>
          <Input id="fuel-liters" type="number" value={form.liters} onChange={e => setForm({ ...form, liters: e.target.value })} placeholder="95" min="0.1" step="0.1" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="fuel-cost" className="text-gray-700">Cost (₹) *</Label>
          <Input id="fuel-cost" type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="142.50" min="0" step="0.01" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="fuel-date" className="text-gray-700">Date *</Label>
          <Input id="fuel-date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required className="mt-1" />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading || !form.vehicleId} className="bg-amber-600 hover:bg-amber-700 text-white">
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
          <Label htmlFor="exp-vehicle" className="text-gray-700">Vehicle *</Label>
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
          <Label htmlFor="exp-type" className="text-gray-700">Expense Type *</Label>
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
          <Label htmlFor="exp-amount" className="text-gray-700">Amount (₹) *</Label>
          <Input id="exp-amount" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="45.00" min="0.01" step="0.01" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="exp-date" className="text-gray-700">Date *</Label>
          <Input id="exp-date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required className="mt-1" />
        </div>
      </div>
      <div>
        <Label htmlFor="exp-notes" className="text-gray-700">Notes</Label>
        <Input id="exp-notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="I-94 westbound tolls" className="mt-1" />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={loading || !form.vehicleId || !form.type} className="bg-amber-600 hover:bg-amber-700 text-white">
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalOperational = totalFuelCost + totalExpenses;

  async function handleFuelSubmit(data: object) {
    await createFuelLog.mutateAsync(data as { vehicleId: string; liters: number; cost: number });
    setFuelOpen(false);
  }

  async function handleExpenseSubmit(data: object) {
    await createExpense.mutateAsync(data as { vehicleId: string; type: string; amount: number });
    setExpenseOpen(false);
  }

  if (!mounted) return null;

  return (
    <div className="min-h-[calc(100vh-2rem)] bg-gray-50 text-gray-900 p-8 rounded-2xl shadow-sm font-sans tracking-wide animate-fade-in relative overflow-hidden flex flex-col">
      
      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <Fuel className="w-8 h-8 text-amber-500" />
            Fuel & Expense Management
          </h1>
        </div>
        
        {canAddLog && (
          <div className="flex items-center gap-3">
            <Button 
              onClick={() => setFuelOpen(true)} 
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-md px-5 transition-colors shadow-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-2" /> Log Fuel
            </Button>
            <Button 
              onClick={() => setExpenseOpen(true)} 
              className="bg-amber-600 hover:bg-amber-700 text-white rounded-md px-5 transition-colors shadow-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Expense
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-12 pb-24">
        {/* Fuel Logs Section */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 tracking-[0.15em] uppercase mb-4">Fuel Logs</h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Liters</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fuel Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fuelLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <tr key={i}>
                      {Array(4).fill(0).map((_, j) => <td key={j} className="py-4 px-6"><div className="h-4 bg-gray-100 rounded w-full animate-pulse" /></td>)}
                    </tr>
                  ))
                ) : fuelLogs.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-sm text-gray-400">No fuel logs available</td></tr>
                ) : (
                  fuelLogs.map((l: FuelLog) => (
                    <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-6">
                        <div className="font-mono text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded w-fit border border-amber-100 uppercase">{l.vehicle?.registrationNumber}</div>
                        <div className="text-xs text-gray-400 mt-1">{l.vehicle?.name}</div>
                      </td>
                      <td className="py-3 px-6 text-sm text-gray-600 font-medium">{new Date(l.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="py-3 px-6 text-sm text-gray-900 font-medium">{l.liters.toFixed(1)} L</td>
                      <td className="py-3 px-6 text-sm text-gray-900 font-medium">₹{l.cost.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expenses Section */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 tracking-[0.15em] uppercase mb-4">Other Expenses (Toll / Misc)</h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vehicle</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</th>
                  <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <tr key={i}>
                      {Array(5).fill(0).map((_, j) => <td key={j} className="py-4 px-6"><div className="h-4 bg-gray-100 rounded w-full animate-pulse" /></td>)}
                    </tr>
                  ))
                ) : expenses.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-400">No expenses available</td></tr>
                ) : (
                  expenses.map((e: Expense) => {
                    // Different pill colors based on type
                    const isToll = e.type.toLowerCase().includes('toll');
                    const pillColor = isToll 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200';
                      
                    return (
                      <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-6">
                          <div className="font-mono text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded w-fit border border-amber-100 uppercase">{e.vehicle?.registrationNumber}</div>
                          <div className="text-xs text-gray-400 mt-1">{e.vehicle?.name}</div>
                        </td>
                        <td className="py-3 px-6 text-sm text-gray-600 font-medium">{new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="py-3 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${pillColor}`}>
                            {e.type}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-sm text-gray-500 truncate max-w-xs">{e.notes || '—'}</td>
                        <td className="py-3 px-6 text-sm text-gray-900 font-medium">₹{e.amount.toLocaleString()}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer Total */}
      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-200 py-4 px-8 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
        <div className="text-xs font-mono text-gray-500 tracking-wider">
          TOTAL OPERATIONAL COST (AUTO) = FUEL + EXPENSES
        </div>
        <div className="text-xl font-semibold text-amber-600">
          ₹{totalOperational.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={fuelOpen} onOpenChange={setFuelOpen}>
        <DialogContent className="sm:max-w-md bg-white border-gray-100">
          <DialogHeader><DialogTitle className="text-gray-900">Log Fuel</DialogTitle></DialogHeader>
          <FuelLogForm onSubmit={handleFuelSubmit} loading={createFuelLog.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="sm:max-w-md bg-white border-gray-100">
          <DialogHeader><DialogTitle className="text-gray-900">Add Expense</DialogTitle></DialogHeader>
          <ExpenseForm onSubmit={handleExpenseSubmit} loading={createExpense.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
