import { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGyms, type GymFilter } from '@/hooks/useGyms';
import { useUserLocation } from '@/hooks/useUserLocation';
import { calculateDistance } from '@/utils/geo';
import type { Tables } from '@/lib/types';

export default function HomeScreen() {
  const [filter, setFilter] = useState<GymFilter>({});
  const { coords } = useUserLocation();
  const { data, isLoading, refetch, isRefetching } = useGyms(filter);

  const gyms = useMemo(() => {
    if (!data) return [];
    const mapped = data.map((gym) => {
      const distance = coords && gym.lat && gym.lon
        ? calculateDistance(coords, { latitude: gym.lat, longitude: gym.lon })
        : null;
      return { ...gym, distance };
    });

    return mapped.sort((a, b) => {
      if (a.distance != null && b.distance != null) {
        return a.distance - b.distance;
      }
      if (a.distance != null) return -1;
      if (b.distance != null) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [data, coords]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Utegym i Sverige</Text>
      <View style={styles.filterRow}>
        <View style={styles.inputWrapper}>
          <Ionicons name="search" size={18} color="#6b7280" style={styles.inputIcon} />
          <TextInput
            placeholder="Sök gym"
            value={filter.search ?? ''}
            onChangeText={(text) => setFilter((current) => ({ ...current, search: text }))}
            style={styles.input}
            autoCapitalize="words"
          />
        </View>
        <TextInput
          placeholder="Stad"
          value={filter.city ?? ''}
          onChangeText={(text) => setFilter((current) => ({ ...current, city: text }))}
          style={styles.input}
          autoCapitalize="words"
        />
        <View style={styles.filterChips}>
          {[0, 3, 4].map((rating) => (
            <Pressable
              key={rating}
              onPress={() =>
                setFilter((current) => ({
                  ...current,
                  minRating: rating === 0 ? undefined : rating,
                }))
              }
              style={[styles.chip, filter.minRating === rating && rating !== 0 ? styles.chipActive : null]}
            >
              <Text style={filter.minRating === rating && rating !== 0 ? styles.chipTextActive : styles.chipText}>
                {rating === 0 ? 'Alla betyg' : `${rating}+ ★`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading || isRefetching ? <ActivityIndicator /> : null}

      <FlatList
        data={gyms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 120 }}
        refreshing={isRefetching}
        onRefresh={() => refetch()}
        renderItem={({ item }) => <GymCard gym={item} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Inga gym hittades</Text>
              <Text style={styles.emptySubtitle}>Justera dina filter eller prova en annan sökning.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

type GymWithDistance = Tables<'gym_preview'> & { distance: number | null };

function GymCard({ gym }: { gym: GymWithDistance }) {
  return (
    <Link
      href={{ pathname: '/gym/[id]', params: { id: gym.id } }}
      asChild
    >
      <Pressable style={styles.card}>
        <Text style={styles.cardTitle}>{gym.name}</Text>
        <Text style={styles.cardSubtitle}>{gym.city ?? 'Okänd stad'}</Text>
        {gym.distance != null ? (
          <Text style={styles.cardMeta}>{gym.distance.toFixed(1)} km bort</Text>
        ) : (
          <Text style={styles.cardMeta}>Betyg {gym.google_rating ? gym.google_rating.toFixed(1) : '–'}</Text>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
  },
  filterRow: {
    gap: 12,
    marginBottom: 16,
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    top: 14,
    left: 12,
    zIndex: 1,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingLeft: 40,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#0ea5e9',
  },
  chipText: {
    color: '#1f2937',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: '#64748b',
  },
  cardMeta: {
    marginTop: 8,
    color: '#0f172a',
    fontWeight: '500',
  },
  emptyState: {
    marginTop: 48,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#64748b',
    textAlign: 'center',
  },
});
