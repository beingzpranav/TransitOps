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
import { MapPin, Truck, Users, ArrowLeft, Play, Navigation, AlertTriangle, CheckCircle, Settings, XCircle } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  driverId?: string | null;
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
                      Coordinates are automatically pinged to the route timeline every 20 seconds.
                    </p>
                  </div>
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
        </div>

        {/* Right Column: Route Timeline Panel */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <TripTimeline tripId={id} isActive={isTrackingActive} />
        </div>
      </div>
    </div>
  );
}
