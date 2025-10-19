import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

export type Coordinates = { latitude: number; longitude: number };

export function useUserLocation() {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Location.PermissionStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const request = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      if (status !== Location.PermissionStatus.GRANTED) {
        setCoords(null);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    request().catch(() => undefined);
  }, [request]);

  return { coords, permissionStatus, loading, request };
}
