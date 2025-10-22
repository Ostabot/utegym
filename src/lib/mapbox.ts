// src/lib/mapbox.ts
import MapboxGL from '@rnmapbox/maps';

const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
if (!token) {
  console.warn('EXPO_PUBLIC_MAPBOX_TOKEN saknas – kolla din .env');
} else {
  MapboxGL.setAccessToken(token);
}

export default MapboxGL;