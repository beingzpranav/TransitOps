'use client';

import { useState, useEffect } from 'react';
import { Save, Building2, Landmark, Settings } from 'lucide-react';
import { useSettings, useUpdateSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [depotName, setDepotName] = useState('');
  const [currency, setCurrency] = useState('');
  const [distanceUnit, setDistanceUnit] = useState('');
  const [userRole, setUserRole] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('transitops_user');
    if (userData) {
      try {
        const u = JSON.parse(userData);
        setUserRole(u.role);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (settings) {
      setDepotName(settings.depotName);
      setCurrency(settings.currency);
      setDistanceUnit(settings.distanceUnit);
    }
  }, [settings]);

  const isFleetManager = userRole === 'FLEET_MANAGER';

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isFleetManager) return;
    setError('');
    setSuccess(false);

    try {
      await updateSettings.mutateAsync({
        depotName,
        currency,
        distanceUnit,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    }
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#ff385c] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#6a6a6a]">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#ff385c]" />
            Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure system parameters and regional defaults.
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              General System Parameters
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Set depot-level metadata and regional defaults.
            </p>
          </div>

          {!isFleetManager && (
            <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl flex gap-2.5 text-xs text-amber-800">
              <Landmark className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Read-only Access:</span> You are currently logged in as a{' '}
                <span className="font-semibold">{userRole.replace('_', ' ').toLowerCase()}</span>. Modifying
                settings requires a <span className="font-semibold">Fleet Manager</span> role.
              </div>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="depot-name" className="text-xs font-semibold text-gray-700">
                Depot Name *
              </Label>
              <Input
                id="depot-name"
                value={depotName}
                onChange={(e) => setDepotName(e.target.value)}
                placeholder="e.g. Gandhinagar Depot GJ4"
                required
                disabled={!isFleetManager}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currency" className="text-xs font-semibold text-gray-700">
                Currency *
              </Label>
              <Select
                value={currency}
                onValueChange={(value) => setCurrency(value ?? '')}
                disabled={!isFleetManager}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR (Rs)">INR (Rs) — Indian Rupee</SelectItem>
                  <SelectItem value="USD ($)">USD ($) — US Dollar</SelectItem>
                  <SelectItem value="EUR (€)">EUR (€) — Euro</SelectItem>
                  <SelectItem value="GBP (£)">GBP (£) — British Pound</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="distance-unit" className="text-xs font-semibold text-gray-700">
                Distance Unit *
              </Label>
              <Select
                value={distanceUnit}
                onValueChange={(value) => setDistanceUnit(value ?? '')}
                disabled={!isFleetManager}
              >
                <SelectTrigger id="distance-unit">
                  <SelectValue placeholder="Select distance unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kilometers">Kilometers (km)</SelectItem>
                  <SelectItem value="Miles">Miles (mi)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-600 rounded-xl">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-600 rounded-xl">
                System settings updated successfully!
              </div>
            )}

            {isFleetManager && (
              <Button
                type="submit"
                disabled={updateSettings.isPending}
                className="w-full flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {updateSettings.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
