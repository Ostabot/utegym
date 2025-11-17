// src/hooks/useUserLocation.ts
import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

export type UserCoords = {
  latitude: number;
  longitude: number;
};

type Status = Location.PermissionStatus | 'unknown';

export function useUserLocation() {
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [status, setStatus] = useState<Status>('unknown');
  const [error, setError] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  const requestLocation = useCallback(async (): Promise<UserCoords | null> => {
    try {
      setIsRequesting(true);
      setError(null);

      // 1) Be om foreground-permission
      const { status: permStatus } =
        await Location.requestForegroundPermissionsAsync();

      setStatus(permStatus);

      if (permStatus !== Location.PermissionStatus.GRANTED) {
        setError('permission_denied');
        return null;
      }

      // 2) Hämta aktuell position
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const c: UserCoords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };

      setCoords(c);
      return c;
    } catch (e: any) {
      console.warn('[useUserLocation] requestLocation error', e);
      setError(String(e?.message ?? e));
      return null;
    } finally {
      setIsRequesting(false);
    }
  }, []);

  // Valfritt: auto-försök vid första mount (kan kommenteras bort om du vill)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    requestLocation();
  }, [requestLocation]);

  return {
    coords,
    status,
    error,
    isRequesting,
    requestLocation,
  };
}