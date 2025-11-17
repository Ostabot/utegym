// app/(tabs)/(home)/gym/[id].tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  Alert,
  Linking,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import MapboxGL from "@rnmapbox/maps";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { supabase } from "@/lib/supabase";
import type { Tables } from "@/lib/types";
import { useWorkoutWizard } from "@/contexts/workout-wizard-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAppTheme } from "@/ui/useAppTheme";
import AccessiblePressable from "@/ui/AccessiblePressable";
import { saveLastMapAttributions } from "@/lib/mapAttributions";

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
  Constants.expoConfig?.extra?.mapboxToken ??
  Constants.manifestExtra?.mapboxToken ??
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
  const { id } = useLocalSearchParams<{ id?: string }>();
  const gymId = useMemo(() => (Array.isArray(id) ? id[0] : id) ?? "", [id]);

  const [gym, setGym] = useState<Gym | null>(null);

  const [cover, setCover] = useState<string | number>(PLACEHOLDERS[0]);
  const [coverAttr, setCoverAttr] = useState<CoverAttribution>({ kind: "none" });

  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!gymId) throw new Error("missing-gym-id");

        // 1) Hämta gym-rad inkl website + description_en
        const { data: gymRow, error: gErr } = await supabase
          .from("gyms")
          .select(
            "id,name,city,address,lat,lon,description,description_en,image_url,google_place_id,google_rating,website"
          )
          .eq("id", gymId)
          .single();
        if (gErr) throw gErr;
        if (!mounted) return;
        const full = gymRow as Gym;
        setGym(full);

        /* -------- omslagsbild: 1) kommun 2) google 3) placeholder -------- */
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

        // 2) Google (bästa fotot)
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
              pickedAttr = { kind: "google", authors: best.authors ?? null };
            }
          }
        }

        // 3) Placeholder (deterministisk per gym)
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

        // Google-bilder
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

  /* --------------------------- Upload flow --------------------------- */
  async function onUpload() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t("gym.perms.title"), t("gym.perms.body"));
        return;
      }
      const pick = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.9,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (pick.canceled || !pick.assets?.length) return;

      const asset = pick.assets[0];
      const ext = (asset.fileName?.split(".").pop() || "jpg").toLowerCase();
      const path = `${gymId}/${Date.now()}.${ext}`;

      const file = await fetch(asset.uri).then((r) => r.blob());
      const { error: upErr } = await supabase.storage
        .from("gym-photos")
        .upload(path, file, {
          upsert: false,
          contentType: asset.mimeType ?? "image/jpeg",
        });
      if (upErr) throw upErr;

      const { data: inserted, error: insErr } = await supabase
        .from("gym_photos")
        .insert({ gym_id: gymId, name: path })
        .select("id,name")
        .single();
      if (insErr) throw insErr;

      const url = await toPhotoUrlChecked("gym-photos", inserted!.name!);
      if (url) {
        setGallery((prev) => [
          { id: `user-${inserted!.id}`, src: url, attr: { kind: "user" } },
          ...prev,
        ]);
      }
    } catch (e: any) {
      console.warn(e);
      Alert.alert(
        t("gym.uploadFailed.title"),
        e?.message ?? t("gym.uploadFailed.fallback")
      );
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
        if (coverAttr.website)
          Linking.openURL(coverAttr.website).catch(() => { });
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

          <View style={{ padding: 16, gap: 8 }}>
            <Text
              style={[styles.title, { color: theme.colors.text }]}
              accessibilityRole="header"
            >
              {gym.name}
            </Text>
            <Text style={[styles.sub, { color: theme.colors.subtext }]}>
              {[gym.address, gym.city].filter(Boolean).join(", ") ||
                t("gym.addressMissing")}
            </Text>
            {gym.google_rating != null && (
              <Text style={[styles.meta, { color: theme.colors.text }]}>
                {t("gym.rating", {
                  r: Number(gym.google_rating).toFixed(1),
                })}
              </Text>
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
                  <Text
                    style={{ color: theme.colors.subtext, fontSize: 11 }}
                  >
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
              <Text
                style={[styles.descTitle, { color: theme.colors.text }]}
              >
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
            <Text
              style={[styles.photoCaption, { color: theme.colors.subtext }]}
            >
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