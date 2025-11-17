// app/(tabs)/(profile)/about-map-attributions.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking, ScrollView } from 'react-native';
import { useAppTheme } from '@/ui/useAppTheme';
import {
  loadLastMapAttributions,
  defaultMapAttributions,
  type MapAttributionSource,
} from '@/lib/mapAttributions';
import AccessiblePressable from '@/ui/AccessiblePressable';

export default function AboutMapAttributions() {
  const theme = useAppTheme();
  const [last, setLast] = useState<{ at?: number; sources: MapAttributionSource[] }>({
    sources: [],
  });
  const [lang, setLang] = useState<'sv' | 'en'>('sv');

  useEffect(() => {
    loadLastMapAttributions().then(setLast);
  }, []);

  const title = lang === 'sv' ? 'Kart-attributioner' : 'Map attributions';

  // Visa senast sparade källor, annars standard-attributioner
  const sourcesToShow =
    last.sources && last.sources.length > 0 ? last.sources : defaultMapAttributions;

  const savedLabel =
    last.at != null
      ? (lang === 'sv' ? 'Sparat: ' : 'Saved: ') + new Date(last.at).toLocaleString()
      : '—';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      accessibilityLabel={title}
    >
      <Text style={[styles.h1, { color: theme.colors.text }]}>{title}</Text>

      {/* Språkflikar */}
      <View style={styles.tabRow}>
        <AccessiblePressable
          onPress={() => setLang('sv')}
          style={[
            styles.tab,
            {
              borderColor: lang === 'sv' ? theme.colors.primary : theme.colors.border,
              backgroundColor: lang === 'sv' ? theme.colors.card : 'transparent',
              minHeight: 44,
              justifyContent: 'center',
            },
          ]}
          accessibilityRole="tab"
          accessibilityLabel="Visa kart-attributioner på svenska"
          accessibilityHint="Byter språk för den här sidan till svenska."
          accessibilityState={{ selected: lang === 'sv' }}
        >
          <Text
            style={{
              color: lang === 'sv' ? theme.colors.text : theme.colors.subtext,
              fontWeight: lang === 'sv' ? '700' : '500',
            }}
          >
            Svenska
          </Text>
        </AccessiblePressable>

        <AccessiblePressable
          onPress={() => setLang('en')}
          style={[
            styles.tab,
            {
              borderColor: lang === 'en' ? theme.colors.primary : theme.colors.border,
              backgroundColor: lang === 'en' ? theme.colors.card : 'transparent',
              minHeight: 44,
              justifyContent: 'center',
            },
          ]}
          accessibilityRole="tab"
          accessibilityLabel="Show map attributions in English"
          accessibilityHint="Changes the language for this page to English."
          accessibilityState={{ selected: lang === 'en' }}
        >
          <Text
            style={{
              color: lang === 'en' ? theme.colors.text : theme.colors.subtext,
              fontWeight: lang === 'en' ? '700' : '500',
            }}
          >
            English
          </Text>
        </AccessiblePressable>
      </View>

      {/* Mapbox-kort */}
      <View
        style={[
          styles.card,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
        ]}
        accessible
        accessibilityLabel={lang === 'sv' ? 'Mapbox och OpenStreetMap' : 'Mapbox and OpenStreetMap'}
      >
        <Text style={[styles.h2, { color: theme.colors.text }]}>Mapbox</Text>
        <Text style={{ color: theme.colors.subtext }}>
          {lang === 'sv'
            ? 'Denna app använder Mapbox för kartor. © Mapbox • © OpenStreetMap-bidragsgivare.'
            : 'This app uses Mapbox for maps. © Mapbox • © OpenStreetMap contributors.'}
        </Text>

        <AccessiblePressable
          onPress={() => Linking.openURL('https://www.mapbox.com/legal/tos')}
          style={{ marginTop: 8, minHeight: 44, justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="Öppna Mapbox Terms of Service"
          accessibilityHint={
            lang === 'sv'
              ? 'Öppnar Mapbox användarvillkor i din webbläsare.'
              : 'Opens Mapbox Terms of Service in your browser.'
          }
        >
          <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
            Mapbox Terms of Service
          </Text>
        </AccessiblePressable>

        <AccessiblePressable
          onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
          style={{ marginTop: 4, minHeight: 44, justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel={
            lang === 'sv'
              ? 'Öppna OpenStreetMap upphovsrättssida'
              : 'Open the OpenStreetMap copyright page'
          }
          accessibilityHint={
            lang === 'sv'
              ? 'Öppnar OpenStreetMaps upphovsrätts- och licensinformation i webbläsaren.'
              : 'Opens OpenStreetMap copyright and licensing information in your browser.'
          }
        >
          <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
            OpenStreetMap Copyright
          </Text>
        </AccessiblePressable>
      </View>

      {/* Övriga källor */}
      <View
        style={[
          styles.card,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
        ]}
        accessible
      >
        <Text style={[styles.h2, { color: theme.colors.text }]}>
          {lang === 'sv' ? 'Övriga källor' : 'Other sources'}
        </Text>
        <Text style={{ color: theme.colors.subtext }}>
          {lang === 'sv'
            ? 'Utegym-data tillhandahålls av kommuner och öppna dataportaler. Kreditering sker per källa nedan eller i appens kartvy.'
            : 'Outdoor gym data is provided by municipalities and open data portals. Attribution is shown per source below or directly in the map view.'}
        </Text>
      </View>

      {/* Senast använda / aktuella källor */}
      <View
        style={[
          styles.card,
          { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
        ]}
      >
        <Text style={[styles.h2, { color: theme.colors.text }]}>
          {lang === 'sv' ? 'Senast använda källor' : 'Most recently used sources'}
        </Text>

        <Text style={{ color: theme.colors.subtext, marginBottom: 8 }}>{savedLabel}</Text>

        {sourcesToShow.length === 0 ? (
          <Text style={{ color: theme.colors.subtext }}>
            {lang === 'sv' ? 'Inga källor sparade ännu.' : 'No sources saved yet.'}
          </Text>
        ) : (
          sourcesToShow.map((s, i) => (
            <View key={`${s.name}-${i}`} style={{ marginBottom: 8 }}>
              <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{s.name}</Text>
              {s.url ? (
                <AccessiblePressable
                  onPress={() => Linking.openURL(s.url!)}
                  style={{ minHeight: 40, justifyContent: 'center' }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    lang === 'sv'
                      ? `Öppna källa: ${s.name}`
                      : `Open source link: ${s.name}`
                  }
                  accessibilityHint={
                    lang === 'sv'
                      ? 'Öppnar källans webbplats i webbläsaren.'
                      : 'Opens the source website in your browser.'
                  }
                >
                  <Text style={{ color: theme.colors.primary }}>
                    {lang === 'sv' ? 'Öppna källa' : 'Open source link'}
                  </Text>
                </AccessiblePressable>
              ) : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: '800' },
  h2: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    alignItems: 'center',
  },
});