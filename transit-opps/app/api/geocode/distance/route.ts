import { NextRequest, NextResponse } from "next/server";
import { requireAuth, handleAuthError } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    requireAuth(request);

    const { searchParams } = new URL(request.url);
    const sourceLat = searchParams.get("sourceLat");
    const sourceLon = searchParams.get("sourceLon");
    const destLat = searchParams.get("destLat");
    const destLon = searchParams.get("destLon");

    if (!sourceLat || !sourceLon || !destLat || !destLon) {
      return NextResponse.json({ error: "Missing source or destination coordinates" }, { status: 400 });
    }

    const lat1 = parseFloat(sourceLat);
    const lon1 = parseFloat(sourceLon);
    const lat2 = parseFloat(destLat);
    const lon2 = parseFloat(destLon);

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
      return NextResponse.json({ error: "Invalid coordinate formats" }, { status: 400 });
    }

    // 1. Try calculating actual driving road distance via OSRM
    try {
      const url = `http://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "TransitOps/1.0 (contact@transitops.com)"
        }
      });
      if (response.ok) {
        const data = await response.json();
        const route = data.routes?.[0];
        if (route) {
          const distanceKm = parseFloat((route.distance / 1000).toFixed(1)); // Convert meters to km (1 decimal place)
          return NextResponse.json({ distanceKm });
        }
      }
    } catch (err) {
      console.error("OSRM driving distance calculation failed, falling back to Haversine:", err);
    }

    // 2. Fallback to Haversine (Straight-line) Distance
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
        
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = parseFloat((R * c).toFixed(1));

    return NextResponse.json({ distanceKm });
  } catch (err) {
    return handleAuthError(err) ?? NextResponse.json({ error: "Failed to calculate distance" }, { status: 500 });
  }
}
