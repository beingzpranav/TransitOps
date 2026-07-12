// components/TripMap.tsx
// Leaflet touches `window` at import time, so this component must only ever
// be loaded via next/dynamic with { ssr: false } — see TripTimeline.tsx.
"use client";

import {
  MapContainer as ReactLeafletMapContainer,
  TileLayer as ReactLeafletTileLayer,
  Polyline as ReactLeafletPolyline,
  CircleMarker as ReactLeafletCircleMarker
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const MapContainer = ReactLeafletMapContainer as any;
const TileLayer = ReactLeafletTileLayer as any;
const Polyline = ReactLeafletPolyline as any;
const CircleMarker = ReactLeafletCircleMarker as any;

type Point = { lat: number; lng: number; capturedAt: string };

export default function TripMap({ points }: { points: Point[] }) {
  if (points.length === 0) {
    return (
      <div
        style={{
          height: 260,
          borderRadius: 12,
          background: "var(--surface-1, #f9fafb)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted, #6b7280)",
          fontSize: 13,
          border: "1px border-dashed #e5e7eb"
        }}
      >
        Map will appear once tracking starts
      </div>
    );
  }

  const sortedPoints = [...points].sort(
    (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime()
  );
  const positions = sortedPoints.map((p) => [p.lat, p.lng]) as [number, number][];
  const latest = sortedPoints[sortedPoints.length - 1];

  return (
    <div style={{ height: 260, borderRadius: 12, overflow: "hidden" }} className="border border-gray-200">
      <MapContainer
        center={[latest.lat, latest.lng] as [number, number]}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={positions} pathOptions={{ color: "#ff385c", weight: 3 }} />
        {sortedPoints.map((p, i) => (
          <CircleMarker
            key={p.capturedAt}
            center={[p.lat, p.lng]}
            radius={i === sortedPoints.length - 1 ? 7 : 4}
            pathOptions={{
              color: i === sortedPoints.length - 1 ? "#ff385c" : "#9ca3af",
              fillColor: i === sortedPoints.length - 1 ? "#ff385c" : "#9ca3af",
              fillOpacity: 1,
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
