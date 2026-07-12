import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    // Enforce authorization
    requireAuth(request);

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon") ?? searchParams.get("lng");

    // 1. Handle Reverse Geocoding (Coordinates -> Address)
    if (lat && lon) {
      const url = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "TransitOps/1.0 (contact@transitops.com)"
        }
      });

      if (!response.ok) {
        throw new Error(`Photon Reverse API returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const features = data.features || [];
      if (features.length === 0) {
        return NextResponse.json({ display_name: `Location (${lat}, ${lon})` });
      }

      const prop = features[0].properties || {};
      const displayName = buildDisplayName(prop);
      return NextResponse.json({ display_name: displayName });
    }

    // 2. Handle Forward Geocoding (Address Search)
    if (!q || q.trim() === "") {
      return NextResponse.json([]);
    }

    // photon.komoot.io supports q, limit, and prioritizes nearby if lat/lon is provided
    const url =
      `https://photon.komoot.io/api/?` +
      new URLSearchParams({
        q: q.trim(),
        limit: "5",
      });

    const response = await fetch(url, {
      headers: {
        "User-Agent": "TransitOps/1.0 (contact@transitops.com)"
      },
    });

    if (!response.ok) {
      throw new Error(`Photon API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const features = data.features || [];
    
    // Map to simplified schema
    const formatted = features.map((item: any) => {
      const prop = item.properties || {};
      const coords = item.geometry?.coordinates || [0, 0];
      return {
        display_name: buildDisplayName(prop),
        lat: String(coords[1]), // Lat is second in GeoJSON coordinates [lon, lat]
        lon: String(coords[0]), // Lon is first in GeoJSON coordinates [lon, lat]
      };
    });

    return NextResponse.json(formatted);
  } catch (err) {
    return handleAuthError(err) ?? NextResponse.json({ error: "Failed to fetch location data" }, { status: 500 });
  }
}

function buildDisplayName(properties: any) {
  const parts: string[] = [];
  if (properties.name) parts.push(properties.name);
  if (properties.street) parts.push(properties.street);
  if (properties.city) parts.push(properties.city);
  if (properties.state) parts.push(properties.state);
  if (properties.country) parts.push(properties.country);
  return parts.length > 0 ? parts.join(", ") : "Unknown Location";
}
