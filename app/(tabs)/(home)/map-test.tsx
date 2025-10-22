import { View, StyleSheet } from 'react-native';
import MapboxGL from '@/lib/mapbox'; // vår wrapper som sätter token

export default function MapTest() {
  return (
    <View style={styles.container}>
      <MapboxGL.MapView style={StyleSheet.absoluteFill}>
        <MapboxGL.Camera
          zoomLevel={4.5}
          centerCoordinate={[15.0, 62.0]} // Sverige-ish
        />
      </MapboxGL.MapView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});