import { useMemo, useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useGyms } from '@/hooks/useGyms';

//tidigare FeedScreen
export default function Feed() {
  const [filters, setFilters] = useState<{ gymId?: string; startDate?: string; endDate?: string }>({});
  const { data: workouts, isLoading } = useWorkouts(filters);
  const { data: gyms } = useGyms({});

  const sortedWorkouts = useMemo(() => workouts ?? [], [workouts]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Senaste pass</Text>

      <View style={styles.filters}>
        <TextInput
          placeholder="Filter: Gym ID"
          value={filters.gymId ?? ''}
          onChangeText={(text) => setFilters((prev) => ({ ...prev, gymId: text || undefined }))}
          style={styles.input}
        />
        <TextInput
          placeholder="Från (YYYY-MM-DD)"
          value={filters.startDate ?? ''}
          onChangeText={(text) => setFilters((prev) => ({ ...prev, startDate: text || undefined }))}
          style={styles.input}
        />
        <TextInput
          placeholder="Till (YYYY-MM-DD)"
          value={filters.endDate ?? ''}
          onChangeText={(text) => setFilters((prev) => ({ ...prev, endDate: text || undefined }))}
          style={styles.input}
        />
      </View>

      <FlatList
        data={sortedWorkouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 120 }}
        refreshing={isLoading}
        renderItem={({ item }) => (
          <Link href={{ pathname: '/feed/[workoutId]', params: { workoutId: item.id } }} asChild>
            <Pressable style={styles.card}>
              <Text style={styles.cardTitle}>{item.gyms?.name ?? 'Okänt gym'}</Text>
              <Text style={styles.cardSubtitle}>
                {item.started_at ? format(parseISO(item.started_at), 'd MMM yyyy HH:mm', { locale: sv }) : 'Okänt datum'}
              </Text>
              <Text style={styles.cardMeta}>{item.workout_logs?.length ?? 0} övningar</Text>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          !isLoading ? <Text style={styles.empty}>Inga pass ännu. Dela ditt första!</Text> : null
        }
      />

      {gyms && gyms.length > 0 ? (
        <Text style={styles.helper}>Tillgängliga gym: {gyms.slice(0, 5).map((gym) => gym.id).join(', ')} …</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  filters: {
    gap: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#64748b',
  },
  cardMeta: {
    color: '#0f172a',
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 32,
  },
  helper: {
    color: '#94a3b8',
    fontSize: 12,
  },
});
