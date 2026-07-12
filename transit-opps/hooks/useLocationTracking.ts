// hooks/useLocationTracking.ts
"use client";

import { useEffect, useRef, useState } from "react";

export function useLocationTracking(
  tripId: string,
  active: boolean,
  onPingSuccess?: () => void,
  pingIntervalMs = 20000 // Throttling interval (20s for demo)
) {
  const [error, setError] = useState<string | null>(null);
  const [lastPing, setLastPing] = useState<GeolocationCoordinates | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const lastSentAt = useRef<number>(0);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setIsTracking(false);
      return;
    }

    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setError("Geolocation is not supported on this device");
      return;
    }

    setIsTracking(true);

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setLastPing(position.coords);
        setError(null);

        const now = Date.now();
        if (now - lastSentAt.current < pingIntervalMs) return; // throttle
        lastSentAt.current = now;

        const token = localStorage.getItem('transitops_token');

        fetch(`/api/trips/${tripId}/location`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        })
          .then((res) => {
            if (res.ok && onPingSuccess) {
              onPingSuccess();
            }
          })
          .catch((err) => console.error("Failed to send location ping:", err));
      },
      (err) => {
        console.error("Location watch failed:", err);
        setError(err.message || "Location access denied.");
        setIsTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      setIsTracking(false);
    };
  }, [active, tripId, pingIntervalMs, onPingSuccess]);

  return { error, lastPing, isTracking };
}
