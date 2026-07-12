'use client';

import { useEffect, useState } from 'react';
import { Clock4, Gauge } from 'lucide-react';
import { totalDistanceKm } from '@/lib/geo';

const ASSUMED_AVG_SPEED_KMH = 60; // fallback when no GPS data yet
const MIN_SPEED_KMH = 20;         // floor to avoid crazy ETAs on traffic
const MAX_SPEED_KMH = 120;        // ceiling

interface ETABadgeProps {
  tripId: string;
  plannedDistance: number;        // km
  actualStartTime: string;        // ISO
  isActive: boolean;
}

interface TimelinePoint {
  lat: number;
  lng: number;
  capturedAt: string;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return 'Arriving soon';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatETA(minutes: number): string {
  const eta = new Date(Date.now() + minutes * 60 * 1000);
  return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function ETABadge({ tripId, plannedDistance, actualStartTime, isActive }: ETABadgeProps) {
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [kmCovered, setKmCovered] = useState<number>(0);
  const [avgSpeed, setAvgSpeed] = useState<number>(ASSUMED_AVG_SPEED_KMH);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function compute() {
      try {
        const token = localStorage.getItem('transitops_token');
        const res = await fetch(`/api/trips/${tripId}/timeline`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) throw new Error('Failed to load timeline');
        const data = await res.json();
        const points: TimelinePoint[] = data.timeline ?? [];

        if (cancelled) return;

        const elapsedMs = Date.now() - new Date(actualStartTime).getTime();
        const elapsedH = elapsedMs / (1000 * 60 * 60);

        let covered = 0;
        let speed = ASSUMED_AVG_SPEED_KMH;

        if (points.length >= 2) {
          covered = totalDistanceKm(points);
          // Derive speed from actual movement, clamp to realistic range
          const derivedSpeed = elapsedH > 0 ? covered / elapsedH : ASSUMED_AVG_SPEED_KMH;
          speed = Math.min(MAX_SPEED_KMH, Math.max(MIN_SPEED_KMH, derivedSpeed));
        } else if (points.length === 1) {
          // Only one point — estimate from elapsed time with assumed speed
          covered = Math.min(elapsedH * ASSUMED_AVG_SPEED_KMH, plannedDistance * 0.9);
        } else {
          // No GPS yet — estimate from elapsed time
          covered = Math.min(elapsedH * ASSUMED_AVG_SPEED_KMH, plannedDistance * 0.9);
        }

        const remaining = Math.max(0, plannedDistance - covered);
        const remainingH = remaining / speed;
        const remainingMin = remainingH * 60;

        if (!cancelled) {
          setKmCovered(Math.round(covered * 10) / 10);
          setAvgSpeed(Math.round(speed));
          setEtaMinutes(remainingMin);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    compute();
    const interval = isActive ? setInterval(compute, 30_000) : null;

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [tripId, plannedDistance, actualStartTime, isActive]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl animate-pulse">
        <div className="w-16 h-3 bg-white/20 rounded" />
      </div>
    );
  }

  if (etaMinutes === null) return null;

  const kmRemaining = Math.max(0, plannedDistance - kmCovered);
  const progressPct = Math.min(100, (kmCovered / plannedDistance) * 100);

  return (
    <div className="mt-3 space-y-2">
      {/* Progress bar */}
      <div className="relative h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-white rounded-full transition-all duration-1000"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* ETA row */}
      <div className="flex items-center justify-between gap-4 text-white/90 text-xs">
        <div className="flex items-center gap-1.5">
          <Clock4 className="w-3.5 h-3.5" />
          <span>
            ETA: <span className="font-bold text-white">{formatDuration(etaMinutes)}</span>
            {etaMinutes > 0 && (
              <span className="opacity-70 ml-1">({formatETA(etaMinutes)})</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3 opacity-80">
          <span>{kmCovered.toFixed(1)} / {plannedDistance} km</span>
          <div className="flex items-center gap-1">
            <Gauge className="w-3 h-3" />
            <span>{avgSpeed} km/h avg</span>
          </div>
        </div>
      </div>
    </div>
  );
}
