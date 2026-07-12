'use client';

import { useState, useEffect } from 'react';
import { Shield, Save, Building2, Landmark, Settings, Activity } from 'lucide-react';
import { useSettings, useUpdateSettings, SystemSettings } from '@/hooks/useSettings';
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

  // RBAC Access Matrix Definition
  const rbacData = [
    {
      role: 'Fleet Manager',
      roleKey: 'FLEET_MANAGER',
      fleet: 'Full',
      driver: 'Full',
      trip: 'None',
      fuel: 'None',
      analytics: 'Full',
    },
    {
      role: 'Dispatcher',
      roleKey: 'DISPATCHER',
      fleet: 'View',
      driver: 'None',
      trip: 'Full',
      fuel: 'None',
      analytics: 'None',
    },
    {
      role: 'Safety Officer',
      roleKey: 'SAFETY_OFFICER',
      fleet: 'None',
      driver: 'Full',
      trip: 'View',
      fuel: 'None',
      analytics: 'None',
    },
    {
      role: 'Financial Analyst',
      roleKey: 'FINANCIAL_ANALYST',
      fleet: 'View',
      driver: 'None',
      trip: 'None',
      fuel: 'Full',
      analytics: 'Full',
    },
  ];

  const getPermissionBadge = (level: string) => {
    switch (level) {
      case 'Full':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Full Access
          </span>
        );
      case 'View':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            View Only
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-400 border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            No Access
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#ff385c]" />
            Settings &amp; RBAC
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure system parameters and view platform Role-Based Access Control matrix.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: General settings */}
        <div className="lg:col-span-5 space-y-6">
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
                <Shield className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
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

        {/* Right Column: RBAC Matrix */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#ff385c]" />
                Role-Based Access Control (RBAC) Matrix
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Overview of current feature permissions mapped per system role.
              </p>
            </div>

            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Fleet</th>
                    <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Driver</th>
                    <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Trip</th>
                    <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Fuel/Exp</th>
                    <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Analytics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rbacData.map((row) => (
                    <tr
                      key={row.roleKey}
                      className={`hover:bg-gray-50/40 transition-colors ${
                        userRole === row.roleKey ? 'bg-gray-50 font-medium' : ''
                      }`}
                    >
                      <td className="py-3.5 px-6 font-medium text-gray-900 flex items-center gap-2 whitespace-nowrap">
                        {row.role}
                        {userRole === row.roleKey && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ff385c]/10 text-[#ff385c]">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-center">{getPermissionBadge(row.fleet)}</td>
                      <td className="py-3.5 px-6 text-center">{getPermissionBadge(row.driver)}</td>
                      <td className="py-3.5 px-6 text-center">{getPermissionBadge(row.trip)}</td>
                      <td className="py-3.5 px-6 text-center">{getPermissionBadge(row.fuel)}</td>
                      <td className="py-3.5 px-6 text-center">{getPermissionBadge(row.analytics)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-start gap-3">
              <Activity className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold text-gray-900">Security Enforcement Notice</h4>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                  These authorization limits are strictly enforced at the database level and server API routes.
                  Any operations requested outside your assigned role permissions will be rejected. Contact system administrator to request privilege elevation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
