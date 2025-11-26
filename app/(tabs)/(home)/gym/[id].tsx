import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import MapboxGL from "@rnmapbox/maps";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/types";
import { useWorkoutWizard } from "src/contexts/workout-wizard-context";
import { useSession } from "src/contexts/session-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppTheme } from "src/ui/useAppTheme";
import AccessiblePressable from "src/ui/AccessiblePressable";
import { saveLastMapAttributions } from "@/lib/mapAttributions";
import * as FileSystem from 'expo-file-system';
import { ensureGooglePhotoUrl } from "src/lib/googlePhotos";

/* ----------------------------- helpers ----------------------------- */
async function headOk(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
}
function toImageSource(x: string | number) {
  return typeof x === "string" ? { uri: x } : x;
}
function isHttpUrl(s?: string | null): s is string {
  return typeof s === "string" && /^https?:\/\//i.test(s);
}

// Deterministisk hash (FNV-1a 32-bit) för att välja placeholder per gym
function hash32(s: string) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/* ----------------------------- Mapbox ------------------------------ */
const MAPBOX_TOKEN =
  (Constants.expoConfig as any)?.extra?.mapboxToken ??
  (Constants.manifestExtra as any)?.mapboxToken ??
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ??
  "";
if (MAPBOX_TOKEN) MapboxGL.setAccessToken(MAPBOX_TOKEN);
MapboxGL.setTelemetryEnabled(false);

/* --------------------------- Placeholders -------------------------- */
const PLACEHOLDERS = [
  require("../../../../assets/gym-placeholder.png"),
  require("../../../../assets/gym-placeholder1.png"),
  require("../../../../assets/gym-placeholder2.png"),
  require("../../../../assets/gym-placeholder3.png"),
  require("../../../../assets/gym-placeholder4.png"),
  require("../../../../assets/gym-placeholder5.png"),
  require("../../../../assets/gym-placeholder6.png"),
  require("../../../../assets/gym-placeholder7.png"),
] as const;

/* ------------------------------- typer ----------------------------- */
type Gym = Tables<"gyms"> & {
  id: string;
  name: string | null;
  city: string | null;
  address: string | null;
  lat: number | null;
  lon: number | null;
  description: string | null;
  description_en: string | null;
  image_url: string | null;
  google_place_id: string | null;
  google_rating: number | null;
  google_user_ratings_total: number | null;
  website: string | null;
};

type CoverAttribution =
  | { kind: "placeholder" }
  | { kind: "google"; authors: string | null }
  | { kind: "commune"; commune: string | null; website: string | null }
  | { kind: "user" }
  | { kind: "none" };

type GalleryItem =
  | { id: string; src: string | number; attr: CoverAttribution }
  | never;

/* ------------------------- foto-URL-resolver ------------------------ */
async function storagePublicUrl(bucket: string, name: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(name);
  return data?.publicUrl;
}
async function toPhotoUrlChecked(bucket: string, name: string) {
  const candidate = await storagePublicUrl(bucket, name);
  return candidate && (await headOk(candidate)) ? candidate : null;
}

/* ========================= Component =============================== */
export default function GymDetailsScreen() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const { user } = useSession();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const gymId = useMemo(() => (Array.isArray(id) ? id[0] : id) ?? "", [id]);

  const [gym, setGym] = useState<Gym | null>(null);

  const [cover, setCover] = useState<string | number>(PLACEHOLDERS[0]);
  const [coverAttr, setCoverAttr] = useState<CoverAttribution>({ kind: "none" });

  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [isFavorite, setIsFavorite] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);

  const { setGym: setWizardGym } = useWorkoutWizard();
  const cameraRef = useRef<MapboxGL.Camera>(null);

  const isEn = i18n.language?.startsWith("en");
  const hasCoords = !!(gym?.lat && gym?.lon);

  // Spara vilka kart-attributioner som gäller för denna vy
  useEffect(() => {
    if (!hasCoords || !MAPBOX_TOKEN) return;
    saveLastMapAttributions([
      { name: "Mapbox", href: "https://www.mapbox.com/legal/attribution/" },
      {
        name: "OpenStreetMap contributors",
        href: "https://www.openstreetmap.org/copyright",
      },
    ]);
  }, [hasCoords]);

  // Ladda gym + bilder
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!gymId) throw new Error("missing-gym-id");

        // 1) Hämta gym-rad inkl website + description_en + rating count
        const { data: gymRow, error: gErr } = await supabase
          .from("gyms")
          .select(
            "id,name,city,address,lat,lon,description,description_en,image_url,google_place_id,google_rating,google_user_ratings_total,website"
          )
          .eq("id", gymId)
          .single();
        if (gErr) throw gErr;
        if (!mounted) return;
        const full = gymRow as Gym;
        setGym(full);

        /* -------- omslagsbild: 1) kommun 2) google 3) preview.photo_key 4) placeholder -------- */
        let pickedCover: string | number | null = null;
        let pickedAttr: CoverAttribution = { kind: "none" };

        // 1) Kommunens bild
        if (isHttpUrl(full.image_url) && (await headOk(full.image_url!))) {
          pickedCover = full.image_url!;
          pickedAttr = {
            kind: "commune",
            commune: full.city ?? null,
            website: full.website ?? null,
          };
        }

        // 2) Google (bästa fotot via photos.place_id)
        if (!pickedCover && full.google_place_id) {
          const { data: gBest } = await supabase
            .from("photos")
            .select("id,name,widthPx,authors")
            .eq("place_id", full.google_place_id)
            .order("widthPx", { ascending: false })
            .limit(1);

          const best = (gBest ?? [])[0];
          if (best?.name) {
            const url = await toPhotoUrlChecked("google-photos-cache", best.name);
            if (url) {
              pickedCover = url;
              pickedAttr = { kind: "google", authors: (best as any).authors ?? null };
            }
          }
        }

        // 3) gym_preview.photo_key om vi saknar både kommun och Google (COVER)
        if (!pickedCover) {
          const { data: pv } = await supabase
            .from("gym_preview")
            .select("photo_key")
            .eq("id", gymId)
            .single();
          const key = (pv as any)?.photo_key as string | null;
          if (key) {
            const url = await ensureGooglePhotoUrl(key); // <-- v1 name -> edge func -> public URL
            if (url) {
              pickedCover = url;
              pickedAttr = { kind: "google", authors: null };
            }
          }
        }

        // 4) Placeholder (deterministisk per gym)
        if (!pickedCover) {
          const idx = hash32(gymId) % PLACEHOLDERS.length;
          pickedCover = PLACEHOLDERS[idx];
          pickedAttr = { kind: "placeholder" };
        }

        if (!mounted) return;
        setCover(pickedCover);
        setCoverAttr(pickedAttr);

        /* ----------------- Galleri med attribution ------------------ */
        const items: GalleryItem[] = [];

        // Kommun-bild
        if (isHttpUrl(full.image_url) && (await headOk(full.image_url!))) {
          items.push({
            id: "commune-cover",
            src: full.image_url!,
            attr: {
              kind: "commune",
              commune: full.city ?? null,
              website: full.website ?? null,
            },
          });
        }

        // Google-bilder (via photos)
        if (full.google_place_id) {
          const { data: gph } = await supabase
            .from("photos")
            .select("id,name,widthPx,authors")
            .eq("place_id", full.google_place_id)
            .order("widthPx", { ascending: false })
            .limit(30);

          for (const r of gph ?? []) {
            if (!r.name) continue;
            const url = await toPhotoUrlChecked("google-photos-cache", r.name);
            if (url) {
              items.push({
                id: `google-${r.id}`,
                src: url,
                attr: { kind: "google", authors: (r as any).authors ?? null },
              });
            }
          }
        }

        // Fallback till preview.photo_key
        if (!items.length) {
          const { data: pv2 } = await supabase
            .from("gym_preview")
            .select("photo_key")
            .eq("id", gymId)
            .single();
          const key2 = (pv2 as any)?.photo_key as string | null;
          if (key2) {
            const url = await ensureGooglePhotoUrl(key2);
            if (url) {
              items.push({
                id: `preview-${gymId}`,
                src: url,
                attr: { kind: "google", authors: null },
              });
            }
          }
        }

        // Användaruppladdade
        const { data: userRows } = await supabase
          .from("gym_photos")
          .select("id,name")
          .eq("gym_id", gymId)
          .order("id", { ascending: false });

        for (const r of userRows ?? []) {
          const url = r.name
            ? await toPhotoUrlChecked("gym-photos", r.name)
            : null;
          if (url) {
            items.push({
              id: `user-${r.id}`,
              src: url,
              attr: { kind: "user" },
            });
          }
        }

        if (!mounted) return;
        setGallery(items);
      } catch (e) {
        console.warn("Kunde inte ladda gymdetaljer:", e);
        setGym(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [gymId]);

  // Ladda favorit + visited-status
  useEffect(() => {
    let active = true;
    (async () => {
      if (!gymId) return;

      // favorit (RLS: user_id = auth.uid())
      try {
        const { data: favRow, error: favErr } = await supabase
          .from("gym_favorites")
          .select("gym_id")
          .eq("gym_id", gymId)
          .limit(1)
          .single();

        if (active) setIsFavorite(!favErr && !!favRow);
      } catch {
        if (active) setIsFavorite(false);
      }

      // visited (pass som innehåller detta gym-id i plan.gym.id)
      try {
        const { count } = await supabase
          .from("workout_sessions")
          .select("id", { count: "exact", head: true })
          .eq("plan->gym->>id", gymId);

        if (active) setHasVisited((count ?? 0) > 0);
      } catch {
        if (active) setHasVisited(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [gymId, user?.id]);

  /* --------------------------- Upload flow --------------------------- */
  async function onUpload() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('gym.perms.title'), t('gym.perms.body'));
        return;
      }

      const pick = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.9,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        selectionLimit: 1,
      });
      if (pick.canceled || !pick.assets?.length) return;

      const asset = pick.assets[0];

      const guessedExt =
        asset.fileName?.split('.').pop()?.toLowerCase() ||
        asset.mimeType?.split('/').pop()?.toLowerCase() ||
        'jpg';
      const ext = guessedExt === 'jpeg' ? 'jpg' : guessedExt;
      const contentType = asset.mimeType ?? (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`);
      const objectPath = `${gymId}/${Date.now()}.${ext}`;

      // 1) Skapa signed upload URL
      const { data: signed, error: signErr } = await supabase
        .storage.from('gym-photos')
        .createSignedUploadUrl(objectPath);
      if (signErr) throw signErr;

      // 2) Ladda upp bilden (försök med Blob först)
      let putRes: Response | { status: number; ok: boolean };
      try {
        const fileRes = await fetch(asset.uri);
        const blob = await fileRes.blob();
        putRes = await fetch(signed.signedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': contentType,
            'x-upsert': 'false',
          },
          body: blob,
        });
      } catch {
        // Fallback: FileSystem.uploadAsync (OBS: ingen uploadType används)
        const result = await FileSystem.uploadAsync(signed.signedUrl, asset.uri, {
          httpMethod: 'PUT',
          headers: {
            'Content-Type': contentType,
            'x-upsert': 'false',
          },
          // inget 'uploadType' här
        });
        putRes = { status: Number(result.status), ok: String(result.status).startsWith('2') };
      }

      if (!putRes.ok) {
        throw new Error(`Upload failed (status ${putRes.status})`);
      }

      // 3) Spara rad i vår tabell
      const { data: inserted, error: insErr } = await supabase
        .from('gym_photos')
        .insert({ gym_id: gymId, name: objectPath })
        .select('id,name')
        .single();
      if (insErr) throw insErr;

      // 4) Visa direkt i galleriet
      const { data: pub } = supabase.storage.from('gym-photos').getPublicUrl(inserted.name);
      const publicUrl = pub?.publicUrl;
      if (publicUrl) {
        setGallery(prev => [
          { id: `user-${inserted.id}`, src: publicUrl, attr: { kind: 'user' } },
          ...prev,
        ]);
      }
    } catch (e: any) {
      console.warn(e);
      Alert.alert(t('gym.uploadFailed.title'), e?.message ?? t('gym.uploadFailed.fallback'));
    }
  }

  /* ---------------------- Start workout (wizard) --------------------- */
  async function onCreateWorkout() {
    if (!gym) return;

    const resolvedCover =
      typeof cover === "string" && /^https?:\/\//.test(cover)
        ? cover
        : gym.image_url ?? null;

    const payload = {
      id: gym.id,
      name: gym.name ?? "",
      city: gym.city ?? null,
      address: gym.address ?? null,
      lat: gym.lat ?? null,
      lon: gym.lon ?? null,
      image_url: resolvedCover,
      google_place_id: gym.google_place_id ?? null,
      google_rating: gym.google_rating ?? null,
    };

    setWizardGym(payload);
    try {
      await AsyncStorage.setItem("wizard.lastGym", JSON.stringify(payload));
    } catch { }
    router.push("/(tabs)/(train)/equipment");
  }

  /* -------------------- Favorite toggle handler --------------------- */
  const toggleFavorite = useCallback(async () => {
    if (!user?.id) {
      Alert.alert(
        t("gym.favorite.loginNeededTitle", "Logga in krävs"),
        t("gym.favorite.loginNeededBody", "Du behöver vara inloggad för att spara favoriter."),
        [
          { text: t("common.cancel", "Avbryt"), style: "cancel" },
          {
            text: t("profile.login.title", "Logga in"),
            onPress: () => router.push("/onboarding"),
          },
        ]
      );
      return;
    }

    try {
      setTogglingFav(true);

      if (!isFavorite) {
        const { error } = await supabase
          .from("gym_favorites")
          .insert({ gym_id: gymId });
        if (error) throw error;
        setIsFavorite(true);
      } else {
        const { error } = await supabase
          .from("gym_favorites")
          .delete()
          .eq("gym_id", gymId)
          .eq("user_id", user.id); // ← FIXED
        if (error) throw error;
        setIsFavorite(false);
      }
    } catch (e: any) {
      Alert.alert(
        t("gym.favorite.failedTitle", "Kunde inte uppdatera favorit"),
        String(e?.message ?? e)
      );
    } finally {
      setTogglingFav(false);
    }
  }, [user?.id, isFavorite, gymId, t]);

  /* --------------------- Open in Google Maps link -------------------- */
  function openInGoogleMaps() {
    if (!gym) return;

    const hasPlace = !!gym.google_place_id;
    const destLatLon =
      gym.lat != null && gym.lon != null ? `${gym.lat},${gym.lon}` : null;

    // Prefer destination_place_id if we have it; otherwise fall back to coordinates.
    const url = hasPlace
      ? `https://www.google.com/maps/dir/?api=1&destination_place_id=${encodeURIComponent(
        gym.google_place_id!
      )}&destination=${encodeURIComponent(gym.name ?? "utegym")}`
      : destLatLon
        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          destLatLon
        )}`
        : null;

    if (!url) return;
    Linking.openURL(url).catch(() => { });
  }

  /* ---------------------------- Loading/err -------------------------- */
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!gym) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <Text style={{ color: theme.colors.text }}>{t("gym.loadError")}</Text>
      </View>
    );
  }

  // Lokalisera beskrivning: engelska om togglat, annars svenska
  const descriptionText = isEn
    ? gym.description_en ?? gym.description
    : gym.description;

  /* ----------------------- Cover attribution text -------------------- */
  const renderCoverAttribution = () => {
    if (coverAttr.kind === "placeholder") {
      return (
        <Text style={styles.placeholderCaption}>
          {t("gym.placeholderCaption")}
        </Text>
      );
    }
    if (coverAttr.kind === "google") {
      return (
        <Text style={[styles.attrText, { color: theme.colors.subtext }]}>
          {t("gym.attr.google", {
            authors: coverAttr.authors || t("gym.unknown"),
          })}
        </Text>
      );
    }
    if (coverAttr.kind === "commune") {
      const label = t("gym.attr.commune", {
        commune: coverAttr.commune ?? t("gym.commune"),
      });
      const onPress = () => {
        if (coverAttr.website) Linking.openURL(coverAttr.website).catch(() => { });
      };
      return (
        <AccessiblePressable
          onPress={onPress}
          disabled={!coverAttr.website}
          accessibilityRole="link"
          accessibilityLabel={t("gym.attr.commune.a11yLabel", {
            defaultValue: "Öppna webbplats för kommunen",
          })}
          accessibilityHint={t("gym.attr.commune.a11yHint", {
            defaultValue:
              "Öppnar kommunens webbplats i din webbläsare om en länk finns.",
          })}
        >
          <Text
            style={[
              styles.attrText,
              {
                color: theme.colors.subtext,
                textDecorationLine: coverAttr.website ? "underline" : "none",
              },
            ]}
          >
            {label}
          </Text>
        </AccessiblePressable>
      );
    }
    return null;
  };

  /* ------------------------------- UI -------------------------------- */
  return (
    <FlatList
      accessibilityLanguage={i18n.language}
      style={{ backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
      data={gallery}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <View>
          <Image
            source={toImageSource(cover)}
            style={[styles.cover, { backgroundColor: theme.colors.border }]}
            resizeMode="cover"
            accessibilityRole="image"
            accessibilityLabel={t("gym.cover.a11yLabel", {
              defaultValue: `Bild på ${gym.name ?? "utegym"}`,
            })}
          />

          {/* Captions under image */}
          <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
            {coverAttr.kind === "placeholder" ? (
              <View style={{ alignItems: "flex-end" }}>
                {renderCoverAttribution()}
              </View>
            ) : (
              renderCoverAttribution()
            )}
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 10, gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={[styles.title, { color: theme.colors.text, flexShrink: 1, flexGrow: 1 }]}
                accessibilityRole="header"
              >
                {gym.name}
              </Text>

              {/* ✅ Visited marker */}
              {hasVisited && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: theme.colors.primary, borderColor: theme.colors.card },
                  ]}
                  accessibilityRole="text"
                  accessibilityLabel={t("gym.visited.badge", "Besökt")}
                >
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={theme.colors.primaryText}
                  />
                </View>
              )}

              {/* ❤️ Favorite toggle */}
              <AccessiblePressable
                onPress={toggleFavorite}
                disabled={togglingFav}
                accessibilityRole="button"
                accessibilityLabel={
                  isFavorite
                    ? t("gym.favorite.remove", "Ta bort favorit")
                    : t("gym.favorite.add", "Spara som favorit")
                }
                style={{ marginLeft: 8, padding: 6 }}
              >
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={22}
                  color={isFavorite ? "#22c55e" : theme.colors.text}
                />
              </AccessiblePressable>
            </View>

            <Text style={[styles.sub, { color: theme.colors.subtext }]}>
              {[gym.address, gym.city].filter(Boolean).join(", ") ||
                t("gym.addressMissing")}
            </Text>

            {/* Google rating + count */}
            {(gym.google_rating != null ||
              gym.google_user_ratings_total != null) && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons
                    name="star"
                    size={16}
                    color={theme.colors.primary}
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                  />
                  <Text style={[styles.meta, { color: theme.colors.text }]}>
                    {gym.google_rating != null
                      ? Number(gym.google_rating).toFixed(1)
                      : "—"}
                  </Text>
                  {gym.google_user_ratings_total != null && (
                    <Text style={[styles.meta, { color: theme.colors.subtext }]}>
                      ({gym.google_user_ratings_total})
                    </Text>
                  )}
                </View>
              )}

            {/* Öppna i Google Maps */}
            {(gym.google_place_id || (gym.lat && gym.lon)) && (
              <AccessiblePressable
                onPress={openInGoogleMaps}
                accessibilityRole="link"
                accessibilityLabel={
                  gym.google_place_id
                    ? t(
                      "gym.openInGMaps.a11yWithPlace",
                      "Öppna vägbeskrivning till plats-ID i Google Maps"
                    )
                    : t("gym.openInGMaps.a11y", "Öppna vägbeskrivning i Google Maps")
                }
                accessibilityHint={t(
                  "gym.openInGMaps.hint",
                  "Öppnar Google Maps med vägbeskrivning till utegymmet."
                )}
                style={[
                  styles.mapLink,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  },
                ]}
              >
                <Ionicons
                  name="navigate"
                  size={16}
                  color={theme.colors.text}
                  style={{ marginRight: 6 }}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
                  {t("gym.openInGMaps", "Öppna i Google Maps")}
                </Text>
              </AccessiblePressable>
            )}
          </View>

          {hasCoords && MAPBOX_TOKEN ? (
            <View style={{ marginTop: 8 }}>
              <View
                style={[styles.mapWrap, { borderColor: theme.colors.border }]}
              >
                <MapboxGL.MapView
                  style={styles.map}
                  styleURL={MapboxGL.StyleURL.Outdoors}
                  logoEnabled={false}
                  compassEnabled
                  accessibilityLabel={t("gym.map.a11yLabel", {
                    defaultValue:
                      "Karta som visar var utegymmet ligger någonstans.",
                  })}
                  accessibilityRole="image"
                >
                  <MapboxGL.Camera
                    ref={cameraRef}
                    zoomLevel={13}
                    centerCoordinate={[gym.lon!, gym.lat!]}
                    animationMode="flyTo"
                    animationDuration={600}
                  />
                  <MapboxGL.MarkerView
                    id={`gym-${gym.id}`}
                    coordinate={[gym.lon!, gym.lat!]}
                    anchor={{ x: 0.5, y: 1 }}
                  >
                    <View
                      style={[
                        styles.pin,
                        {
                          backgroundColor: theme.colors.primary,
                          borderColor: theme.colors.card,
                        },
                      ]}
                    >
                      <Ionicons
                        name="barbell"
                        size={18}
                        color={theme.colors.primaryText}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      />
                    </View>
                  </MapboxGL.MarkerView>
                </MapboxGL.MapView>
              </View>

              {/* Kart-attribution under kartan */}
              <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
                <AccessiblePressable
                  onPress={() =>
                    router.push("/(tabs)/(profile)/about-attributions")
                  }
                  style={{ minHeight: 44, justifyContent: "center" }}
                  accessibilityRole="button"
                  accessibilityLabel={t(
                    "map.attribution.label",
                    "Visa kart- och datakällor för utegymkartan"
                  )}
                  accessibilityHint={t(
                    "map.attribution.hint",
                    "Öppnar en sida med detaljerad information om kartdata, kommuner och licenser."
                  )}
                >
                  <Text style={{ color: theme.colors.subtext, fontSize: 11 }}>
                    Kartdata © Mapbox · © OpenStreetMap
                  </Text>
                </AccessiblePressable>
              </View>
            </View>
          ) : null}

          <View
            style={{ padding: 16, flexDirection: "row", gap: 12, flexWrap: "wrap" }}
          >
            <AccessiblePressable
              onPress={onCreateWorkout}
              style={[
                styles.primaryBtn,
                { backgroundColor: theme.colors.primary },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t(
                "gym.a11y.createWorkout.label",
                "Starta ett träningspass på detta utegym"
              )}
              accessibilityHint={t(
                "gym.a11y.createWorkout.hint",
                "Öppnar guiden där du väljer övningar baserade på det här utegymmet."
              )}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  { color: theme.colors.primaryText },
                ]}
              >
                {t("gym.createWorkout")}
              </Text>
            </AccessiblePressable>

            <AccessiblePressable
              onPress={onUpload}
              style={[
                styles.secondaryBtn,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={t(
                "gym.a11y.uploadPhoto.label",
                "Ladda upp ett foto på utegymmet"
              )}
              accessibilityHint={t(
                "gym.a11y.uploadPhoto.hint",
                "Öppnar ditt bildbibliotek så att du kan välja en bild."
              )}
            >
              <Text
                style={[
                  styles.secondaryBtnText,
                  { color: theme.colors.text },
                ]}
              >
                {t("gym.uploadPhoto")}
              </Text>
            </AccessiblePressable>
          </View>

          {/* Beskrivning (SV/EN beroende på språk) */}
          {descriptionText ? (
            <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
              <Text style={[styles.descTitle, { color: theme.colors.text }]}>
                {t("gym.descriptionTitle", "Beskrivning")}
              </Text>
              <Text style={[styles.descBody, { color: theme.colors.text }]}>
                {descriptionText}
              </Text>
            </View>
          ) : null}

          <Text
            style={{
              paddingHorizontal: 16,
              fontWeight: "700",
              marginTop: 12,
              marginBottom: 8,
              color: theme.colors.text,
            }}
          >
            {t("gym.photos.title")}
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        return (
          <View style={{ width: "33.333%", paddingHorizontal: 8 }}>
            <Image
              source={toImageSource(item.src)}
              style={[styles.photo, { backgroundColor: theme.colors.border }]}
              accessibilityRole="image"
              accessibilityLabel={
                item.attr.kind === "google"
                  ? t("gym.photo.google", {
                    authors: item.attr.authors || t("gym.unknown"),
                  })
                  : item.attr.kind === "commune"
                    ? t("gym.photo.commune", {
                      commune: item.attr.commune ?? t("gym.commune"),
                    })
                    : item.attr.kind === "user"
                      ? t("gym.photo.userUploaded")
                      : t("gym.photo.generic", "Foto på utegymmet")
              }
            />
            {/* Attribution under varje bild (visuell) */}
            <Text style={[styles.photoCaption, { color: theme.colors.subtext }]}>
              {item.attr.kind === "google" &&
                t("gym.photo.google", {
                  authors: item.attr.authors || t("gym.unknown"),
                })}
              {item.attr.kind === "commune" &&
                t("gym.photo.commune", {
                  commune: item.attr.commune ?? t("gym.commune"),
                })}
              {item.attr.kind === "user" && t("gym.photo.userUploaded")}
            </Text>
          </View>
        );
      }}
      numColumns={3}
      columnWrapperStyle={{ gap: 6, paddingHorizontal: 8 }}
      ListEmptyComponent={
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <Text style={{ color: theme.colors.subtext }}>
            {t("gym.photos.empty")}
          </Text>
        </View>
      }
    />
  );
}

/* ------------------------------ styles ----------------------------- */
const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  cover: { width: "100%", height: 220 },

  // liten vit text till höger under bilden vid placeholder
  placeholderCaption: { color: "#fff", fontSize: 11, opacity: 0.9 },

  // attribution för google/kommun
  attrText: { fontSize: 12 },

  title: { fontSize: 22, fontWeight: "800" },
  sub: {},
  meta: { marginTop: 4, fontWeight: "600" },

  badge: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },

  // liten knapp-länk för Google Maps
  mapLink: {
    flexDirection: "row",
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },

  mapWrap: {
    height: 180,
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
  },
  map: { flex: 1 },

  primaryBtn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16 },
  primaryBtnText: { fontWeight: "700" },
  secondaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  secondaryBtnText: { fontWeight: "700" },

  // Beskrivning
  descTitle: {
    fontWeight: "700",
    marginBottom: 4,
    fontSize: 14,
  },
  descBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },

  photo: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    marginBottom: 4,
  },
  photoCaption: { fontSize: 10, marginBottom: 6, minHeight: 12 },

  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});