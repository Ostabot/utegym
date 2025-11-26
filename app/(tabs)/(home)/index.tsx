import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
  Animated,
  AccessibilityInfo,
  findNodeHandle,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapboxGL from '@rnmapbox/maps';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useGyms, type GymFilter } from 'src/hooks/useGyms';
import { useUserLocation } from 'src/hooks/useUserLocation';
import { calculateDistance } from 'src/utils/geo';
import type { Tables } from '@/lib/types';
import { useAppTheme } from 'src/ui/useAppTheme';
import { BlurView } from 'expo-blur';
import { saveLastMapAttributions } from '@/lib/mapAttributions';
import AccessiblePressable from 'src/ui/AccessiblePressable';
import { useSession } from 'src/contexts/session-context';
import { supabase } from '@/lib/supabase';

const MAPBOX_TOKEN =
  (Constants.expoConfig as any)?.extra?.mapboxToken ??
  (Constants.manifestExtra as any)?.mapboxToken ??
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

if (MAPBOX_TOKEN) MapboxGL.setAccessToken(MAPBOX_TOKEN);
MapboxGL.setTelemetryEnabled(false);

// GEOGRAFISK PLATS VID UPPSTART
const SWEDEN_CENTER: [number, number] = [15.0, 62.0];
const SWEDEN_ZOOM = 3.8;

type GymWithDistance = Tables<'gym_preview'> & {
  distance: number | null;
  visited?: boolean;
  favorite?: boolean;
};

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

/** 🔵 Pulserande markör för användarens plats (blå) */
function PulsingUserDot({ coordinate }: { coordinate: [number, number] }) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(v => (reduceMotionRef.current = v));
  }, []);

  useEffect(() => {
    if (reduceMotionRef.current) return; // respektera “Reduce Motion”
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.6, duration: 1200, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.8, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);

  return (
    <MapboxGL.MarkerView coordinate={coordinate}>
      <View style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={{
            position: 'absolute',
            width: 24, height: 24, borderRadius: 12,
            backgroundColor: '#3b82f6',
            opacity,
            transform: [{ scale }],
          }}
        />
        <View
          style={{
            width: 12, height: 12, borderRadius: 6,
            backgroundColor: '#3b82f6',
            borderWidth: 2,
            borderColor: '#111',
          }}
        />
      </View>
    </MapboxGL.MarkerView>
  );
}

// Hjälpare: konvertera pixlar -> kilometer givet lat & zoom (WebMercator-approx)
function kmPerPixel(lat: number, zoom: number) {
  const metersPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
  return metersPerPixel / 1000;
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { user } = useSession();

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

  const CTA_HEIGHT = 52;
  const CTA_BOTTOM = insets.bottom + 16;

  const [filter, setFilter] = useState<GymFilter>({});
  const [mapReady, setMapReady] = useState(false);
  const [listMode, setListMode] = useState<'idle' | 'nearest' | 'cluster'>('idle');
  const [clusterList, setClusterList] = useState<GymWithDistance[]>([]);

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [visitedIds, setVisitedIds] = useState<Set<string>>(new Set());

  const cameraRef = useRef<MapboxGL.Camera>(null);
  const shapeRef = useRef<MapboxGL.ShapeSource>(null);

  // a11y refs (focus/announce when sheet opens)
  const sheetRef = useRef<View>(null);
  const listRef = useRef<FlatList<any>>(null);

  // Hålla koll på aktuell zoom (för JS-fallback)
  const zoomRef = useRef<number>(SWEDEN_ZOOM);
  const centerRef = useRef<[number, number]>(SWEDEN_CENTER);

  const { coords, requestLocation } = useUserLocation();
  const { data, isLoading, isRefetching, error, refetch } = useGyms(filter);

  useEffect(() => {
    if (!mapReady) return;
    saveLastMapAttributions([
      { name: 'Mapbox', href: 'https://www.mapbox.com/legal/attribution/' },
      { name: 'OpenStreetMap contributors', href: 'https://www.openstreetmap.org/copyright' },
    ]);
  }, [mapReady]);

  // Hämta favoriter + besökta gym för inloggad användare
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user?.id) {
        if (active) {
          setFavoriteIds(new Set());
          setVisitedIds(new Set());
        }
        return;
      }

      try {
        // favorites
        const { data: favRows } = await supabase
          .from('gym_favorites')
          .select('gym_id');

        const favSet = new Set<string>((favRows ?? []).map((r: any) => String(r.gym_id)));

        // visited: hämta plan och plocka ut plan.gym.id i JS (fungerar med PostgREST utan specialfilter)
        const { data: wsRows } = await supabase
          .from('workout_sessions')
          .select('plan')
          .limit(10000); // räcker gott

        const visit = new Set<string>();
        for (const r of wsRows ?? []) {
          const gid = r?.plan?.gym?.id;
          if (gid) visit.add(String(gid));
        }

        if (active) {
          setFavoriteIds(favSet);
          setVisitedIds(visit);
        }
      } catch {
        if (active) {
          setFavoriteIds(new Set());
          setVisitedIds(new Set());
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.id]);

  // bygg gym-lista med distans + favorit/visited
  const { gyms } = useMemo(() => {
    const list: GymWithDistance[] = (data ?? []).map((g) => {
      const distance =
        coords && g.lat && g.lon
          ? calculateDistance(coords, { latitude: g.lat, longitude: g.lon })
          : null;
      const id = String((g as any).id);
      return {
        ...(g as any),
        distance,
        favorite: favoriteIds.has(id),
        visited: visitedIds.has(id),
      };
    });
    const sorted = list.sort((a, b) => {
      // sortera favoriter/visited lite högre i listvyn
      const aw = (a.favorite ? 2 : 0) + (a.visited ? 1 : 0);
      const bw = (b.favorite ? 2 : 0) + (b.visited ? 1 : 0);
      if (aw !== bw) return bw - aw;

      if (a.distance != null && b.distance != null) return a.distance - b.distance;
      if (a.distance != null) return -1;
      if (b.distance != null) return 1;
      return a.name.localeCompare(b.name);
    });
    return { gyms: sorted };
  }, [data, coords, favoriteIds, visitedIds]);

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
            favorite: !!g.favorite,
            visited: !!g.visited,
            // text for SymbolLayer (heart / check)
            heart: '♥',
            check: '✓',
          },
          geometry: { type: 'Point' as const, coordinates: [g.lon!, g.lat!] },
        })),
    }),
    [gyms]
  );

  const nearestFive = useMemo(() => {
    if (!coords) return [];
    return gyms.filter((g) => g.distance != null).slice(0, 5);
  }, [gyms, coords]);

  const onFindNearby = useCallback(async () => {
    let effectiveCoords = coords;
    if (!effectiveCoords) effectiveCoords = (await requestLocation()) ?? null;
    if (!effectiveCoords) {
      setListMode('idle');
      return;
    }

    if (!mapReady) {
      setListMode('nearest');
      return;
    }

    const nearby = gyms
      .filter((g) => g.lat && g.lon)
      .map((g) => ({
        g,
        d: calculateDistance(effectiveCoords!, { latitude: g.lat!, longitude: g.lon! }),
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
    setListMode('nearest');
  }, [coords, gyms, mapReady, requestLocation]);

  // ====== JS-FALLBACK: hantera tryck på kluster eller punkt ======
  const handleShapePress = useCallback(
    async (e: MapboxGL.OnPressEvent) => {
      const f = e.features?.[0] as any;
      if (!f) return;

      if (!f.properties?.point_count) {
        const id = f?.properties?.id;
        if (id) requestAnimationFrame(() => router.push(`/gym/${String(id)}`));
        return;
      }

      const [lng, lat] = (f.geometry?.coordinates ?? centerRef.current) as [number, number];

      const newZoom = Math.min((zoomRef.current ?? 6) + 1.2, 16);
      cameraRef.current?.setCamera({
        centerCoordinate: [lng, lat],
        zoomLevel: newZoom,
        animationDuration: 600,
        animationMode: 'flyTo',
      });

      const pxRadius = 60;
      const kmRadius = kmPerPixel(lat, (zoomRef.current ?? SWEDEN_ZOOM)) * pxRadius;

      const items = gyms
        .filter((g) => g.lat && g.lon)
        .map((g) => {
          const d = calculateDistance(
            { latitude: lat, longitude: lng },
            { latitude: g.lat!, longitude: g.lon! }
          );
          return { gym: g, d };
        })
        .filter(({ d }) => d <= kmRadius * 1.3)
        .sort((a, b) => a.d - b.d)
        .map(({ gym }) => gym as GymWithDistance);

      setClusterList(items);
      setListMode('cluster');
    },
    [gyms]
  );

  const listData =
    listMode === 'nearest' ? nearestFive : listMode === 'cluster' ? clusterList : [];

  // STYLES: kluster, favorit, visited, default
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

  // Symbol-lager för ♥ favoriter
  const favoriteSymbolStyle: MapboxGL.SymbolLayerStyle = {
    textField: ['get', 'heart'],
    textSize: 18,
    textColor: '#22c55e',
    textHaloColor: theme.colors.card,
    textHaloWidth: 2,
    textAllowOverlap: true,
    textIgnorePlacement: true,
  };

  // Symbol-lager för ✓ besökta
  const visitedSymbolStyle: MapboxGL.SymbolLayerStyle = {
    textField: ['get', 'check'],
    textSize: 18,
    textColor: '#22c55e',
    textHaloColor: theme.colors.card,
    textHaloWidth: 2,
    textAllowOverlap: true,
    textIgnorePlacement: true,
  };

  // Default cirkel för övriga
  const unclusteredStyle: MapboxGL.CircleLayerStyle = {
    circleColor: '#22c55e',
    circleRadius: 6,
    circleStrokeWidth: 2,
    circleStrokeColor: theme.colors.card,
  };

  const hasNetworkError =
    !!error &&
    /network|offline|fetch|timeout/i.test(String((error as any)?.message ?? ''));

  const showSheet = listMode !== 'idle';

  // ---------- a11y: move focus to sheet + announce content ----------
  useEffect(() => {
    if (!showSheet) return;
    const handle = findNodeHandle(sheetRef.current);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
    const announcement =
      listMode === 'nearest'
        ? t('home.a11y.nearestShown', 'Visar närmaste utegym.')
        : listMode === 'cluster'
          ? t('home.a11y.clusterShown', 'Visar utegym i valt område.')
          : '';
    if (announcement) AccessibilityInfo.announceForAccessibility(announcement);
  }, [showSheet, listMode, t]);

  useEffect(() => {
    if (!showSheet) return;
    if (listData.length === 0 && !isLoading && !isRefetching && !error) {
      AccessibilityInfo.announceForAccessibility(
        t('home.a11y.noGymsInList', 'Inga gym i listan.')
      );
    }
  }, [showSheet, listData.length, isLoading, isRefetching, error, t]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
      {/* =========== MAP AS BACKGROUND =========== */}
      <View style={styles.mapAbsolute}>
        {!MAPBOX_TOKEN ? (
          <View style={[styles.mapError, { backgroundColor: theme.colors.badgeYellow }]}>
            <Text style={[styles.mapErrorText, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
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
            compassEnabled={false}
            onDidFinishLoadingMap={() => setMapReady(true)}
            onCameraChanged={(ev) => {
              zoomRef.current = ev.properties?.zoom ?? zoomRef.current;
              const c = ev.properties?.center;
              if (Array.isArray(c) && c.length === 2) {
                centerRef.current = c as [number, number];
              }
            }}
          >
            <MapboxGL.Camera
              ref={cameraRef}
              zoomLevel={SWEDEN_ZOOM}
              centerCoordinate={SWEDEN_CENTER}
              animationMode="flyTo"
              animationDuration={800}
            />

            {/* 🔵 användarens plats */}
            {coords ? (
              <>
                <MapboxGL.UserLocation
                  visible
                  showsUserHeadingIndicator
                  androidRenderMode="compass"
                />
                <PulsingUserDot coordinate={[coords.longitude, coords.latitude]} />
              </>
            ) : null}

            {mapReady && (
              <MapboxGL.ShapeSource
                ref={shapeRef}
                id="gyms"
                shape={gymFeatureCollection as any}
                cluster
                clusterRadius={50}
                clusterMaxZoom={12}
                onPress={handleShapePress}
              >
                {/* Kluster */}
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

                {/* ❤️ Favoriter överst */}
                <MapboxGL.SymbolLayer
                  id="favoriteLayer"
                  filter={['all', ['!', ['has', 'point_count']], ['==', ['get', 'favorite'], true]]}
                  style={favoriteSymbolStyle}
                />

                {/* ✅ Besökta (men inte favoriter) */}
                <MapboxGL.SymbolLayer
                  id="visitedLayer"
                  filter={[
                    'all',
                    ['!', ['has', 'point_count']],
                    ['==', ['get', 'visited'], true],
                    ['==', ['get', 'favorite'], false],
                  ]}
                  style={visitedSymbolStyle}
                />

                {/* 🟢 Övriga punkter */}
                <MapboxGL.CircleLayer
                  id="unclusteredPoint"
                  filter={[
                    'all',
                    ['!', ['has', 'point_count']],
                    ['==', ['get', 'favorite'], false],
                    ['==', ['get', 'visited'], false],
                  ]}
                  style={unclusteredStyle}
                />
              </MapboxGL.ShapeSource>
            )}
          </MapboxGL.MapView>
        )}
      </View>

      {/* 🌫️ Blur visas bara när sheet är aktivt */}
      {theme.name === 'dark' && showSheet ? (
        <View pointerEvents="none" style={styles.bottomFade}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        </View>
      ) : null}

      {/* =========== TOP-OVERLAY: sökfält =========== */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, gap: 10 }}>
        <View style={styles.inputWrapper}>
          <Ionicons name="search" size={18} color={theme.colors.subtext} style={styles.inputIcon} />
          <TextInput
            accessibilityLabel={t('home.search.accessibilityLabel', 'Sök utegym, stad eller adress')}
            accessibilityHint={t('home.search.accessibilityHint', 'Skriv – resultaten visas nedan')}
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
            maxFontSizeMultiplier={1.2}
          />
        </View>

        {/* 🔎 Kart-attribution – nära söket */}
        <View style={styles.attributionRow}>
          <AccessiblePressable
            onPress={() => router.push('/(tabs)/(profile)/about-attributions')}
            style={styles.attributionTapArea}
            accessibilityRole="button"
            accessibilityLabel={t('map.attribution.label', 'Visa kart- och datakällor för utegymkartan')}
            accessibilityHint={t(
              'map.attribution.hint',
              'Öppnar en sida med detaljerad information om kartdata, kommuner och licenser.'
            )}
          >
            <Text style={{ color: theme.colors.subtext, fontSize: 11 }} maxFontSizeMultiplier={1.2}>
              Kartdata © Mapbox · © OpenStreetMap
            </Text>
          </AccessiblePressable>
        </View>
      </View>

      {/* 🎯 “Hitta min plats”-knappen uppe vid söket */}
      {coords ? (
        <View pointerEvents="box-none" style={[styles.topControls, { top: insets.top + 12, right: 16 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.myLocation.label', 'Centrera kartan till min plats')}
            accessibilityHint={t('home.myLocation.hint', 'Kartans fokus flyttas till din aktuella position')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => {
              cameraRef.current?.setCamera({
                centerCoordinate: [coords.longitude, coords.latitude],
                zoomLevel: 12,
                animationDuration: 500,
                animationMode: 'flyTo',
              });
            }}
            style={[
              styles.controlBtn,
              { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
            ]}
          >
            <Ionicons name="locate-outline" size={20} color={theme.colors.text} />
          </Pressable>
        </View>
      ) : null}

      {/* =========== FLOATING LIST (bottom sheet style) =========== */}
      <View
        ref={sheetRef}
        accessible
        accessibilityRole="summary"
        accessibilityLabel={t('home.a11y.sheetLabel', 'Resultatlista')}
        style={[styles.sheet, { paddingBottom: 12 + insets.bottom, maxHeight: sheetMax }]}
      >
        {theme.name === 'dark' ? (
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.card, opacity: 0.95 }]} />
        )}

        {error ? (
          <View
            style={[
              styles.errorCard,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
            ]}
          >
            <Text style={[styles.errorTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
              {t('home.error.title', { defaultValue: 'Något gick fel' })}
            </Text>
            <Text style={[styles.errorMessage, { color: theme.colors.subtext }]} maxFontSizeMultiplier={1.2}>
              {hasNetworkError
                ? t('home.error.network', {
                  defaultValue:
                    'Vi kunde inte ladda utegym just nu. Kontrollera din internetuppkoppling och försök igen.',
                })
                : t('home.error.generic', {
                  defaultValue: 'Vi kunde inte ladda utegym just nu. Försök igen om en stund.',
                })}
            </Text>
            {refetch ? (
              <Pressable
                onPress={() => refetch()}
                accessibilityRole="button"
                accessibilityLabel={t('home.error.retry', { defaultValue: 'Försök igen' })}
                style={[styles.errorButton, { borderColor: theme.colors.border }]}
              >
                <Text style={{ color: theme.colors.text, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
                  {t('home.error.retry', { defaultValue: 'Försök igen' })}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {(isLoading || isRefetching) && <ActivityIndicator style={{ padding: 12 }} />}

        <FlatList
          ref={listRef}
          accessibilityLabel={t('home.a11y.resultsList', 'Lista med utegym')}
          data={listData}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={6}
          contentContainerStyle={{ padding: TOPPAD, gap: GAP }}
          renderItem={({ item }) => <GymCard gym={item as GymWithDistance} />}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            listMode !== 'idle' && !isLoading && !isRefetching && !error ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]} maxFontSizeMultiplier={1.3}>
                  {t('home.empty.title', { defaultValue: 'Inga gym hittades' })}
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.subtext }]} maxFontSizeMultiplier={1.2}>
                  {coords
                    ? t('home.empty.zoom', { defaultValue: 'Testa att zooma på kartan.' })
                    : t('home.empty.enableLocation', {
                      defaultValue: 'Slå på platsinformation i systeminställningarna för att hitta nära.',
                    })}
                </Text>
              </View>
            ) : null
          }
        />
      </View>

      {/* =========== BOTTOM CTA (över listan) =========== */}
      <View pointerEvents="box-none" style={[styles.bottomCtaWrap, { bottom: CTA_BOTTOM, paddingHorizontal: 16 }]}>
        <Pressable
          style={[styles.primaryButton, styles.bottomCta, { backgroundColor: theme.colors.primary, height: CTA_HEIGHT }]}
          onPress={onFindNearby}
          accessibilityRole="button"
          accessibilityLabel={
            coords ? t('home.cta.findNearby', 'Hitta utegym i din närhet') : t('home.cta.enableLocation', 'Använd min plats')
          }
        >
          <Text style={[styles.primaryButtonText, { color: theme.colors.primaryText }]} maxFontSizeMultiplier={1.3}>
            {coords
              ? t('home.cta.findNearby', { defaultValue: 'Hitta utegym i din närhet' })
              : t('home.cta.enableLocation', { defaultValue: 'Använd min plats' })}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function GymCard({ gym }: { gym: GymWithDistance }) {
  const theme = useAppTheme();
  const { t } = useTranslation();

  const a11yLabel = `${gym.name}, ${gym.city ?? t('home.unknownCity', 'Okänd stad')}${gym.distance != null ? `, ${t('home.a11y.distance', '{{km}} kilometer bort', { km: gym.distance.toFixed(1) })}` : ''
    }`;

  return (
    <Link href={{ pathname: '/gym/[id]', params: { id: gym.id } }} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={{ borderRadius: 16, overflow: 'hidden' }}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        {theme.name === 'dark' && <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />}

        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.name === 'dark' ? 'rgba(18,16,14,0.55)' : 'rgba(255,255,255,0.75)' },
          ]}
        />

        <View style={[styles.cardRow, { borderColor: theme.colors.border }]}>
          <Image
            source={gym.image_url ? { uri: gym.image_url } : require('../../../assets/gym-placeholder.jpg')}
            style={styles.thumb}
            accessible
            accessibilityIgnoresInvertColors
            accessibilityLabel={t('home.a11y.gymImage', 'Bild på utegym')}
          />

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.cardTitle, { color: theme.colors.text, flexShrink: 1 }]} maxFontSizeMultiplier={1.3}>
                {gym.name}
              </Text>
              {gym.favorite ? (
                <Text style={{ color: '#22c55e' }} accessibilityLabel={t('home.a11y.favorite', 'Favorit')}>♥</Text>
              ) : gym.visited ? (
                <Text style={{ color: '#22c55e' }} accessibilityLabel={t('home.a11y.visited', 'Besökt')}>✓</Text>
              ) : null}
            </View>
            <Text style={[styles.cardSubtitle, { color: theme.colors.subtext }]} maxFontSizeMultiplier={1.2}>
              {gym.city ?? t('home.unknownCity', { defaultValue: 'Okänd stad' })}
            </Text>
            <Text style={[styles.cardMeta, { color: theme.colors.subtext }]} maxFontSizeMultiplier={1.1}>
              {gym.distance != null
                ? t('home.meta.distanceKmAway', { defaultValue: '{{km}} km bort', km: gym.distance.toFixed(1) })
                : gym.google_rating
                  ? t('home.meta.rating', { defaultValue: 'Betyg {{r}}', r: gym.google_rating.toFixed(1) })
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
    marginTop: 0,
    marginHorizontal: 16,
    alignItems: 'flex-start',
  },
  attributionTapArea: { minHeight: 28, justifyContent: 'center', paddingVertical: 2 },

  topControls: { position: 'absolute', alignItems: 'flex-end' },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
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

  bottomCtaWrap: { position: 'absolute', left: 0, right: 0 },
  bottomCta: { borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

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
  errorCard: { marginTop: 8, marginHorizontal: 12, borderWidth: 1, borderRadius: 12, padding: 10, gap: 4 },
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
