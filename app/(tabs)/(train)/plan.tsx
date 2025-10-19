import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useWorkoutWizard } from '@/contexts/workout-wizard-context';
import { useCurrentRun } from '@/hooks/useCurrentRun';
import type { WorkoutExerciseLog, WorkoutLogSet } from '@/types/workout';

export default function TrainPlanScreen() {
  const router = useRouter();
  const { createPlan, exercises, method, gym } = useWorkoutWizard();
  const { setRun } = useCurrentRun();

  const plan = createPlan();

  if (!plan) {
    return (
      <View style={styles.center}>
        <Text>Planen kunde inte genereras. Kontrollera dina val.</Text>
      </View>
    );
  }

  async function startWorkout() {
    const logs: WorkoutExerciseLog[] = plan.exercises.map((exercise) => {
      const sets: WorkoutLogSet[] = Array.from({ length: exercise.prescription.sets }, (_, idx) => ({
        reps: exercise.prescription.reps?.[idx] ?? null,
        loadKg: null,
        rpe: null,
        durationSeconds: exercise.prescription.durationSeconds ?? null,
      }));
      return {
        exerciseKey: exercise.key,
        sets,
      };
    });

    await setRun({
      plan,
      startedAt: new Date().toISOString(),
      logs,
    });

    Toast.show({ type: 'info', text1: 'Pass igång!' });
    router.push('/train/run');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Träningsplan</Text>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{gym?.name ?? 'Valfritt gym'}</Text>
        <Text style={styles.summarySubtitle}>{method?.name_sv ?? method?.name}</Text>
        <Text style={styles.summaryMeta}>{exercises.length} övningar</Text>
      </View>

      <FlatList
        data={plan.exercises}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ gap: 12, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name_sv ?? item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.prescription.sets} set</Text>
            {item.prescription.reps ? (
              <Text style={styles.cardMeta}>Reps: {item.prescription.reps.join(', ')}</Text>
            ) : null}
            {item.prescription.durationSeconds ? (
              <Text style={styles.cardMeta}>Tid: {Math.round(item.prescription.durationSeconds / 60)} min</Text>
            ) : null}
          </View>
        )}
      />

      <Pressable style={styles.primaryButton} onPress={startWorkout}>
        <Text style={styles.primaryText}>Starta pass</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: '#0ea5e9',
    borderRadius: 16,
    padding: 20,
    gap: 4,
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  summarySubtitle: {
    color: '#e0f2fe',
  },
  summaryMeta: {
    color: '#e0f2fe',
    fontWeight: '600',
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
  },
  primaryButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
