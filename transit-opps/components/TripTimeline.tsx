// components/TripTimeline.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { totalDistanceKm } from "@/lib/geo";
import { Compass, AlertCircle } from 'lucide-react';

// Leaflet needs `window`, so the map is loaded client-only, after mount.
const TripMap = dynamic(() => import("./TripMap"), { ssr: false });

type TimelinePoint = {
  hour: string; // ISO string, rounded to the hour
  lat: number;
  lng: number;
  capturedAt: string;
};

export function TripTimeline({ tripId, isActive }: { tripId: string; isActive: boolean }) {
  const [points, setPoints] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [resolvedAddresses, setResolvedAddresses] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const token = localStorage.getItem('transitops_token');
        const res = await fetch(`/api/trips/${tripId}/timeline`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        if (!cancelled) {
          setPoints(data.timeline ?? []);
          setError(false);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load timeline:", err);
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    load();
    const interval = isActive ? setInterval(load, 30000) : null;
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [tripId, isActive]);

  useEffect(() => {
    const unresolved = points.filter(p => !resolvedAddresses[`${p.lat},${p.lng}`]);
    if (unresolved.length === 0) return;

    let active = true;

    async function resolve() {
      for (const p of unresolved) {
        if (!active) break;
        const key = `${p.lat},${p.lng}`;
        try {
          const token = localStorage.getItem('transitops_token');
          const res = await fetch(`/api/geocode?lat=${p.lat}&lon=${p.lng}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          });
          if (res.ok) {
            const data = await res.json();
            if (!active) break;
            setResolvedAddresses(prev => ({
              ...prev,
              [key]: data.display_name
            }));
          }
        } catch (err) {
          console.error("Reverse geocoding fetch failed:", err);
        }
        // Throttled delay of 1.1 seconds between requests to respect Photon server limits
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
    }

    resolve();

    return () => {
      active = false;
    };
  }, [points, resolvedAddresses]);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <h3 className="text-sm font-semibold text-gray-500">Loading timeline...</h3>
        <div className="flex gap-4 items-center">
          <div className="w-4 h-4 rounded-full bg-gray-200 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 border border-red-100 rounded-xl">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">Failed to load trip timeline. Please restart next dev or clear cache.</span>
      </div>
    );
  }

  const distance = totalDistanceKm(points);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
              <span className="live-pulse" />
              Live tracking
            </span>
          )}
          {!isActive && (
            <span className="text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
              Static Map
            </span>
          )}
        </div>
        {points.length > 0 && (
          <span className="text-xs font-bold text-[#ff385c] bg-[#ff385c]/10 px-2.5 py-1 rounded-full">
            {distance} km covered
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-inner bg-gray-50">
        <TripMap points={points} />
      </div>

      {points.length === 0 ? (
        <div className="text-center py-8 px-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <Compass className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin-slow" />
          <p className="text-xs font-medium text-gray-600">No checkpoints recorded yet</p>
          <p className="text-[10px] text-gray-400 mt-1">Updates will appear once the trip starts and records location pings.</p>
        </div>
      ) : (
        <div className="relative pl-5 border-l border-gray-200 space-y-4 ml-2.5 py-1">
          <AnimatePresence initial={false}>
            {points.map((point, i) => {
              const isLatest = i === 0; // Checkpoints are sorted descending (latest first)
              const timeString = new Date(point.capturedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const dateString = new Date(point.capturedAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              });

              return (
                <motion.div
                  key={point.hour}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative group"
                >
                  {/* Indicator bullet */}
                  <div className="absolute -left-[25px] top-1.5">
                    {isLatest ? (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff385c] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ff385c]" />
                      </span>
                    ) : (
                      <span className="flex h-2.5 w-2.5 rounded-full bg-gray-300" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-gray-900">{timeString}</p>
                      <p className="text-[10px] text-gray-400 font-medium">({dateString})</p>
                      {isLatest && (
                        <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                          Latest checkpoint
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-600 font-medium mt-0.5">
                      {resolvedAddresses[`${point.lat},${point.lng}`] || "Resolving address..."}
                    </p>
                    <p className="text-[9px] text-gray-400 font-mono">
                      Lat: {point.lat.toFixed(5)}, Lng: {point.lng.toFixed(5)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <style jsx>{`
        .live-pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          position: relative;
          display: inline-block;
        }
        .live-pulse::after {
          content: "";
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          border: 1px solid #10b981;
          animation: pulse 1.8s ease-out infinite;
        }
        @keyframes pulse {
          0% {
            transform: scale(0.6);
            opacity: 0.8;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
