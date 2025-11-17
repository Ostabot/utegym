// app/(tabs)/(train)/index.tsx
import { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkoutWizard } from '@/contexts/workout-wizard-context';
import { useGyms, type GymFilter } from '@/hooks/useGyms';
import type { Tables } from '@/lib/types';
import { useAppTheme } from '@/ui/useAppTheme';
import { useTranslation } from 'react-i18next';

type GymRow = Tables<'gym_preview'>;

export default function TrainStart() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { setGym } = useWorkoutWizard();

  const [filter, setFilter] = useState<GymFilter>({});
  const { data, isLoading, refetch, isRefetching } = useGyms(filter);

  const gyms = useMemo(() => (data ?? []) as GymRow[], [data]);

  function choose(g: GymRow) {
    setGym({
      id: g.id,
      name: g.name,
      city: g.city,
      lat: g.lat,
      lon: g.lon,
      image_url: g.image_url ?? undefined,
    });
    router.push('/(tabs)/(train)/equipment');
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <Text
        style={[styles.h1, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        {t('train.start.title', 'Välj utegym')}
      </Text>

      <View style={{ gap: 8, marginBottom: 12 }}>
        <TextInput
          placeholder={t('train.start.searchPlaceholder', 'Sök gym')}
          placeholderTextColor={theme.colors.subtext}
          value={filter.search ?? ''}
          onChangeText={(txt) => setFilter((f) => ({ ...f, search: txt }))}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          autoCapitalize="words"
          accessibilityLabel={t('train.start.searchLabel', 'Sök efter utegym')}
        />

        <TextInput
          placeholder={t('train.start.cityPlaceholder', 'Stad')}
          placeholderTextColor={theme.colors.subtext}
          value={filter.city ?? ''}
          onChangeText={(txt) => setFilter((f) => ({ ...f, city: txt }))}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          autoCapitalize="words"
          accessibilityLabel={t('train.start.cityLabel', 'Filtrera på stad')}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator
          color={theme.colors.primary}
          accessibilityLabel={t('train.start.loading', 'Laddar gym…')}
        />
      ) : null}

      <FlatList
        data={gyms}
        keyExtractor={(g) => g.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 10, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => choose(item)}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
                shadowColor: theme.colors.text,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.city ?? t('train.start.unknownCity', 'Okänd stad')}`}
          >
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.cardSub, { color: theme.colors.subtext }]}>
              {item.city ?? t('train.start.unknownCity', 'Okänd stad')}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <Text
              style={{ textAlign: 'center', color: theme.colors.subtext }}
              accessibilityLiveRegion="polite"
            >
              {t('train.start.empty', 'Inga gym hittades.')}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

/* Neutrala styles */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  h1: { fontSize: 22, fontWeight: '800', marginBottom: 8 },

  input: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },

  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: { fontWeight: '700' },
  cardSub: {},
});