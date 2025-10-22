import { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useExercises } from '@/hooks/useExercises';
import { useWorkoutWizard } from '@/contexts/workout-wizard-context';
import { buildWizardExercises, toggleExerciseSelection } from '@/utils/workout-plan';
import { parseMethodScheme } from '@/utils/methods';
import type { WizardExercise } from '@/types/workout';

//tidigare TrainExercisesScreen
export default function Exercises() {
  const router = useRouter();
  const { data } = useExercises();
  const { equipmentKeys, bodyweightOnly, method, exercises, setExercises } = useWorkoutWizard();
  const [list, setList] = useState<WizardExercise[]>(exercises);

  useEffect(() => {
    if (!data || !method) return;
    const prescription = parseMethodScheme(method);
    const relevant = data.filter((exercise) => {
      if (bodyweightOnly) return exercise.bodyweight_ok;
      if (!equipmentKeys || equipmentKeys.length === 0) return exercise.bodyweight_ok;
      return (exercise.equipment_keys ?? []).some((key) => equipmentKeys.includes(key));
    });

    const merged = buildWizardExercises(relevant, prescription, exercises.map((ex) => ex.key));
    setList(merged);
  }, [data, method, equipmentKeys, bodyweightOnly, exercises]);

  const selectedCount = useMemo(() => list.filter((item) => item.selected).length, [list]);

  function toggle(key: string) {
    setList((current) => toggleExerciseSelection(current, key));
  }

  function onContinue() {
    const selected = list.filter((item) => item.selected);
    setExercises(selected);
    router.push('/train/plan');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Välj övningar ({selectedCount} valda)</Text>
      <FlatList
        data={list}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ gap: 12, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => toggle(item.key)}
            style={[styles.card, item.selected && styles.cardActive]}
          >
            <Text style={styles.cardTitle}>{item.name_sv ?? item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.difficulty ?? 'Okänd svårighetsgrad'}</Text>
            <Text style={styles.cardMeta}>Set: {item.prescription.sets}</Text>
            {item.prescription.reps ? (
              <Text style={styles.cardMeta}>Reps: {item.prescription.reps.join(', ')}</Text>
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Hittade inga övningar. Justera dina val.</Text>}
      />

      <Pressable
        disabled={selectedCount === 0}
        onPress={onContinue}
        style={[styles.primaryButton, selectedCount === 0 && styles.primaryButtonDisabled]}
      >
        <Text style={styles.primaryText}>Skapa plan</Text>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  cardActive: {
    borderColor: '#0ea5e9',
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
  empty: {
    textAlign: 'center',
    color: '#94a3b8',
  },
  primaryButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
