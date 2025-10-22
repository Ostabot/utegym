import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { format, parseISO } from 'date-fns';
import { sv } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/types';

interface WorkoutDetail extends Tables<'workouts'> {
  gyms: Tables<'gyms'> | null;
  workout_logs: Tables<'workout_logs'>[];
}

//tidigare WorkoutDetailScreen
export default function WorkoutDetail() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workoutId) return;
    supabase
      .from('workouts')
      .select('*, gyms(*), workout_logs(*)')
      .eq('id', workoutId)
      .maybeSingle()
      .then(({ data }) => setWorkout((data as WorkoutDetail | null) ?? null))
      .finally(() => setLoading(false));
  }, [workoutId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={styles.center}>
        <Text>Kunde inte hitta passet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{workout.gyms?.name ?? 'Okänt gym'}</Text>
      <Text style={styles.subtitle}>
        {workout.started_at ? format(parseISO(workout.started_at), 'd MMM yyyy HH:mm', { locale: sv }) : ''}
      </Text>
      <FlatList
        data={workout.workout_logs ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingVertical: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.exercise_key}</Text>
            <Text style={styles.cardMeta}>Set: {item.sets}</Text>
            {item.reps ? <Text style={styles.cardMeta}>Reps: {item.reps.join(', ')}</Text> : null}
            {item.load_kg ? <Text style={styles.cardMeta}>Vikt: {item.load_kg.join(', ')} kg</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#64748b',
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
  cardMeta: {
    color: '#0f172a',
  },
});
