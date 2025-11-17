// app/(tabs)/(home)/index.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL from '@rnmapbox/maps';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useGyms, type GymFilter } from '@/hooks/useGyms';
import { useUserLocation } from '@/hooks/useUserLocation';
import { calculateDistance } from '@/utils/geo';
import type { Tables } from '@/lib/types';
import { useAppTheme } from '@/ui/useAppTheme';
import { BlurView } from 'expo-blur';
import { saveLastMapAttributions } from '@/lib/mapAttributions';
import AccessiblePressable from '@/ui/AccessiblePressable';

const MAPBOX_TOKEN =
  Constants.expoConfig?.extra?.mapboxToken ??
  Constants.manifestExtra?.mapboxToken ??
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

if (MAPBOX_TOKEN) MapboxGL.setAccessToken(MAPBOX_TOKEN);
MapboxGL.setTelemetryEnabled(false);

// GEOGRAFISK PLATS VID UPPSTART
const SWEDEN_CENTER: [number, number] = [15.0, 62.0];
const SWEDEN_ZOOM = 3.8;

type GymWithDistance = Tables<'gym_preview'> & { distance: number | null };

function bboxFromLngLat(points: Array<[number, number]>) {
  let [minLng, minLat] = [Infinity, Infinity];
  let [maxLng, maxLat] = [-Infinity, -Infinity];
  for (const [lng, lat] of points) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return {
    sw: [minLng, minLat] as [number, number],
    ne: [maxLng, maxLat] as [number, number],
  };
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { t } = useTranslation();

  const styleURL =
    theme.name === 'dark' ? MapboxGL.StyleURL.Dark : MapboxGL.StyleURL.Light;

  const { height: H } = Dimensions.get('window');
  const CARD_H = 86;
  const GAP = 10;
  const TOPPAD = 12;
  const SHEET_EXTRA = 8;
  const sheetMaxPx =
    TOPPAD + CARD_H * 3 + GAP * 2 + insets.bottom + SHEET_EXTRA;
  const sheetMax = Math.min(sheetMaxPx, H * 0.6);

  const [filter, setFilter] = useState<GymFilter>({});
  const [showNearest, setShowNearest] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const cameraRef = useRef<MapboxGL.Camera>(null);

  // NY hook – riktig GPS
  const { coords, requestLocation } = useUserLocation();

  const { data, isLoading, isRefetching, error, refetch } = useGyms(filter);

  useEffect(() => {
    if (!mapReady) return;
    saveLastMapAttributions([
      {
        name: 'Mapbox',
        href: 'https://www.mapbox.com/legal/attribution/',
      },
      {
        name: 'OpenStreetMap contributors',
        href: 'https://www.openstreetmap.org/copyright',
      },
    ]);
  }, [mapReady]);

  const gyms = useMemo<GymWithDistance[]>(() => {
    if (!data) return [];
    const mapped = data.map((gym) => {
      const distance =
        coords && gym.lat && gym.lon
          ? calculateDistance(coords, {
            latitude: gym.lat,
            longitude: gym.lon,
          })
          : null;
      return { ...gym, distance };
    });
    return mapped.sort((a, b) => {
      if (a.distance != null && b.distance != null) return a.distance - b.distance;
      if (a.distance != null) return -1;
      if (b.distance != null) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [data, coords]);

  console.log('gyms from hook', data?.length);

  const gymFeatureCollection = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: gyms
        .filter((g) => g.lat && g.lon)
        .map((g) => ({
          type: 'Feature' as const,
          id: g.id,
          properties: {
            id: g.id,
            name: g.name,
            city: g.city ?? '',
            rating: g.google_rating ?? null,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [g.lon!, g.lat!],
          },
        })),
    }),
    [gyms]
  );

  const nearestFive = useMemo(() => {
    if (!coords) return [];
    return gyms.filter((g) => g.distance != null).slice(0, 5);
  }, [gyms, coords]);

  // 🔥 Viktig del: async, hämtar riktig plats om vi inte har någon
  const onFindNearby = async () => {
    let effectiveCoords = coords;

    // 1) Har vi ingen position än? Be om den (triggar systemdialogen)
    if (!effectiveCoords) {
      effectiveCoords = (await requestLocation()) ?? null;
    }

    // Kunde fortfarande vara null om användaren nekar
    if (!effectiveCoords) {
      setShowNearest(false);
      return;
    }

    // 2) Om kartan inte är redo än – vänta tills den är det, men
    //    vi flaggar ändå att vi vill se närmaste i listan
    if (!mapReady) {
      setShowNearest(true);
      return;
    }

    // 3) Bygg bounds runt användaren + 5 närmaste gym
    const nearby = gyms
      .filter((g) => g.lat && g.lon)
      .map((g) => ({
        g,
        d: calculateDistance(effectiveCoords!, {
          latitude: g.lat!,
          longitude: g.lon!,
        }),
      }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 5)
      .map(({ g }) => g);

    const points: Array<[number, number]> = [
      [effectiveCoords.longitude, effectiveCoords.latitude],
      ...nearby.map((g) => [g.lon!, g.lat!] as [number, number]),
    ];

    if (points.length <= 1) {
      cameraRef.current?.setCamera({
        centerCoordinate: [effectiveCoords.longitude, effectiveCoords.latitude],
        zoomLevel: 12,
        animationDuration: 800,
        animationMode: 'flyTo',
      });
    } else {
      const { sw, ne } = bboxFromLngLat(points);
      cameraRef.current?.fitBounds(sw, ne, 50, 900);
    }

    setShowNearest(true);
  };

  const listData = showNearest ? nearestFive : [];

  const clusterCircleStyle: MapboxGL.CircleLayerStyle = {
    circleColor: theme.colors.primary,
    circleOpacity: 0.9,
    circleRadius: ['step', ['get', 'point_count'], 14, 10, 18, 25, 22, 50, 26, 100, 30],
  };
  const clusterTextStyle: MapboxGL.SymbolLayerStyle = {
    textField: ['get', 'point_count_abbreviated'],
    textSize: 12,
    textColor: theme.colors.primaryText,
    textIgnorePlacement: true,
    textAllowOverlap: true,
  };
  const unclusteredStyle: MapboxGL.CircleLayerStyle = {
    circleColor: '#22c55e',
    circleRadius: 6,
    circleStrokeWidth: 2,
    circleStrokeColor: theme.colors.card,
  };

  const hasNetworkError =
    !!error &&
    /network|offline|fetch|timeout/i.test(String((error as any)?.message ?? ''));

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
      {/* =========== MAP AS BACKGROUND =========== */}
      <View style={styles.mapAbsolute}>
        {!MAPBOX_TOKEN ? (
          <View
            style={[styles.mapError, { backgroundColor: theme.colors.badgeYellow }]}
          >
            <Text style={[styles.mapErrorText, { color: theme.colors.text }]}>
              {t('home.noMapboxToken', {
                defaultValue:
                  'Saknar Mapbox-token. Lägg EXPO_PUBLIC_MAPBOX_TOKEN i .env och bygg om.',
              })}
            </Text>
          </View>
        ) : (
          <MapboxGL.MapView
            style={StyleSheet.absoluteFill}
            styleURL={styleURL}
            logoEnabled={false}
            compassEnabled
            onDidFinishLoadingMap={() => setMapReady(true)}
          >
            <MapboxGL.Camera
              ref={cameraRef}
              zoomLevel={SWEDEN_ZOOM}
              centerCoordinate={SWEDEN_CENTER}
              animationMode="flyTo"
              animationDuration={800}
            />
            {mapReady && (
              <MapboxGL.ShapeSource
                id="gyms"
                shape={gymFeatureCollection as any}
                cluster
                clusterRadius={50}
                clusterMaxZoom={12}
                onPress={(e) => {
                  const f = e.features?.[0];
                  if (f?.properties?.point_count) return;
                  const id = f?.properties?.id;
                  if (!id) return;
                  requestAnimationFrame(() => router.push(`/gym/${String(id)}`));
                }}
              >
                <MapboxGL.CircleLayer
                  id="clusteredPoints"
                  filter={['has', 'point_count']}
                  style={clusterCircleStyle}
                />
                <MapboxGL.SymbolLayer
                  id="clusterCount"
                  filter={['has', 'point_count']}
                  style={clusterTextStyle}
                />
                <MapboxGL.CircleLayer
                  id="unclusteredPoint"
                  filter={['!', ['has', 'point_count']]}
                  style={unclusteredStyle}
                />
              </MapboxGL.ShapeSource>
            )}
          </MapboxGL.MapView>
        )}
      </View>

      {theme.name === 'dark' ? (
        <View pointerEvents="none" style={styles.bottomFade}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        </View>
      ) : null}

      {/* =========== OVERLAY UI =========== */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, gap: 10 }}>
        <View style={styles.inputWrapper}>
          <Ionicons
            name="search"
            size={18}
            color={theme.colors.subtext}
            style={styles.inputIcon}
          />
          <TextInput
            placeholder={t('home.searchPlaceholder', {
              defaultValue: 'Sök utegym, stad eller adress',
            })}
            placeholderTextColor={theme.colors.subtext}
            value={filter.search ?? ''}
            onChangeText={(text) => setFilter((c) => ({ ...c, search: text }))}
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            autoCapitalize="words"
          />
        </View>

        {/* Knappen direkt under sök */}
        <Pressable
          style={[
            styles.primaryButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            onFindNearby();
          }}
        >
          <Text
            style={[styles.primaryButtonText, { color: theme.colors.primaryText }]}
          >
            {coords
              ? t('home.cta.findNearby', {
                defaultValue: 'Tryck för att hitta utegym i din närhet',
              })
              : t('home.cta.enableLocation', {
                defaultValue: 'Tryck för att använda din plats',
              })}
          </Text>
        </Pressable>
      </View>

      {/* 🔎 Kart-attribution – diskret text under knappen */}
      <View style={styles.attributionRow}>
        <AccessiblePressable
          onPress={() => router.push('/(tabs)/(profile)/about-attributions')}
          style={styles.attributionTapArea}
          accessibilityRole="button"
          accessibilityLabel={t(
            'map.attribution.label',
            'Visa kart- och datakällor för utegymkartan'
          )}
          accessibilityHint={t(
            'map.attribution.hint',
            'Öppnar en sida med detaljerad information om kartdata, kommuner och licenser.'
          )}
        >
          <Text style={{ color: theme.colors.subtext, fontSize: 11 }}>
            Kartdata © Mapbox · © OpenStreetMap
          </Text>
        </AccessiblePressable>
      </View>

      {/* =========== FLOATING LIST (bottom sheet style) =========== */}
      <View
        style={[styles.sheet, { paddingBottom: 12 + insets.bottom, maxHeight: sheetMax }]}
      >
        {theme.name === 'dark' ? (
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: theme.colors.card, opacity: 0.95 },
            ]}
          />
        )}

        {error ? (
          <View
            style={[
              styles.errorCard,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
            ]}
          >
            <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
              {t('home.error.title', { defaultValue: 'Något gick fel' })}
            </Text>
            <Text style={[styles.errorMessage, { color: theme.colors.subtext }]}>
              {hasNetworkError
                ? t('home.error.network', {
                  defaultValue:
                    'Vi kunde inte ladda utegym just nu. Kontrollera din internetuppkoppling och försök igen.',
                })
                : t('home.error.generic', {
                  defaultValue:
                    'Vi kunde inte ladda utegym just nu. Försök igen om en stund.',
                })}
            </Text>
            {refetch ? (
              <Pressable
                onPress={() => refetch()}
                style={[styles.errorButton, { borderColor: theme.colors.border }]}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
                  {t('home.error.retry', { defaultValue: 'Försök igen' })}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {(isLoading || isRefetching) && <ActivityIndicator style={{ padding: 12 }} />}

        <FlatList
          data={listData}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={6}
          contentContainerStyle={{ padding: TOPPAD, gap: GAP }}
          renderItem={({ item }) => <GymCard gym={item as GymWithDistance} />}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            showNearest && !isLoading && !isRefetching && !error ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                  {t('home.empty.title', { defaultValue: 'Inga gym hittades' })}
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.subtext }]}>
                  {coords
                    ? t('home.empty.zoom', { defaultValue: 'Testa att zooma på kartan.' })
                    : t('home.empty.enableLocation', {
                      defaultValue:
                        'Slå på platsinformation i systeminställningarna för att hitta nära.',
                    })}
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    </View>
  );
}

function GymCard({ gym }: { gym: GymWithDistance }) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Link href={{ pathname: '/gym/[id]', params: { id: gym.id } }} asChild>
      <Pressable style={{ borderRadius: 16, overflow: 'hidden' }}>
        {theme.name === 'dark' && (
          <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
        )}

        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor:
                theme.name === 'dark'
                  ? 'rgba(18, 16, 14, 0.55)'
                  : 'rgba(255,255,255,0.75)',
            },
          ]}
        />

        <View style={[styles.cardRow, { borderColor: theme.colors.border }]}>
          <Image
            source={
              gym.image_url
                ? { uri: gym.image_url }
                : require('../../../assets/gym-placeholder.jpg')
            }
            style={styles.thumb}
          />

          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              {gym.name}
            </Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.subtext }]}>
              {gym.city ?? t('home.unknownCity', { defaultValue: 'Okänd stad' })}
            </Text>
            <Text style={[styles.cardMeta, { color: theme.colors.subtext }]}>
              {gym.distance != null
                ? t('home.meta.distanceKmAway', {
                  defaultValue: '{{km}} km bort',
                  km: gym.distance.toFixed(1),
                })
                : gym.google_rating
                  ? t('home.meta.rating', {
                    defaultValue: 'Betyg {{r}}',
                    r: gym.google_rating.toFixed(1),
                  })
                  : '—'}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

/* Neutral styles (no colors) */
const styles = StyleSheet.create({
  screen: { flex: 1 },
  mapAbsolute: { ...StyleSheet.absoluteFillObject },
  bottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 },
  inputWrapper: { position: 'relative' },
  inputIcon: { position: 'absolute', top: 14, left: 12, zIndex: 1 },
  input: {
    borderRadius: 12,
    paddingLeft: 40,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  primaryButton: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  primaryButtonText: { fontWeight: '700' },

  attributionRow: {
    marginTop: 4,
    marginHorizontal: 16,
    alignItems: 'flex-start',
  },
  attributionTapArea: {
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: 4,
  },

  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  cardRow: {
    height: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
  },
  thumb: { width: 46, height: 46, borderRadius: 8, backgroundColor: '#333' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSubtitle: { fontSize: 12 },
  cardMeta: { fontSize: 12, marginTop: 2 },
  emptyState: { paddingVertical: 16, alignItems: 'center', gap: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtitle: { textAlign: 'center', fontSize: 12 },
  mapError: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12 },
  mapErrorText: { textAlign: 'center' },
  errorCard: {
    marginTop: 8,
    marginHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  errorTitle: { fontSize: 14, fontWeight: '800' },
  errorMessage: { fontSize: 12 },
  errorButton: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
});