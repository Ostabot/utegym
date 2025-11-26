import type { Coordinates } from 'src/hooks/useUserLocation';

const EARTH_RADIUS_KM = 6371;

export function calculateDistance(a: Coordinates, b: Coordinates) {
  const dLat = deg2rad(b.latitude - a.latitude);
  const dLon = deg2rad(b.longitude - a.longitude);
  const lat1 = deg2rad(a.latitude);
  const lat2 = deg2rad(b.latitude);

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return EARTH_RADIUS_KM * c;
}

function deg2rad(deg: number) {
  return (deg * Math.PI) / 180;
}
