// lib/geo.ts

// Returns distance in kilometers between two points. Supports both lat/lng and latitude/longitude.
export function haversineKm(
  a: { lat?: number; lng?: number; latitude?: number; longitude?: number } | null | undefined,
  b: { lat?: number; lng?: number; latitude?: number; longitude?: number } | null | undefined
): number {
  if (!a || !b) return 0;
  
  const lat1 = a.lat ?? a.latitude;
  const lng1 = a.lng ?? a.longitude;
  const lat2 = b.lat ?? b.latitude;
  const lng2 = b.lng ?? b.longitude;

  if (lat1 === undefined || lng1 === undefined || lat2 === undefined || lng2 === undefined) {
    return 0;
  }

  if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
    return 0;
  }

  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(rLat1) * Math.cos(rLat2);

  return R * 2 * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Sums distance across an ordered list of points.
export function totalDistanceKm(points: any[] | null | undefined): number {
  if (!points || !Array.isArray(points) || points.length < 2) return 0;
  
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineKm(points[i - 1], points[i]);
  }
  return Math.round(total * 10) / 10; // 1 decimal place
}
