import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, Share } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useCurrentRun } from '@/hooks/useCurrentRun';
import { useWorkoutWizard } from '@/contexts/workout-wizard-context';
import { useSession } from '@/contexts/session-context';
import { supabase } from '@/lib/supabase';
import { addPendingWorkout } from '@/lib/workout-sync';
import type { WorkoutLogSet, WorkoutRunState } from '@/types/workout';

//tidigare RunWorkoutScreen
export default function Run() {
  const router = useRouter();
  const { run, setRun, loading } = useCurrentRun();
  const { reset } = useWorkoutWizard();
  const { user } = useSession();
  const [localRun, setLocalRun] = useState<WorkoutRunState | null>(run);
  const [activeIndex, setActiveIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [completedWorkoutId, setCompletedWorkoutId] = useState<string | null>(null);

  useEffect(() => {
    setLocalRun(run);
  }, [run]);

  useEffect(() => {
    if (!localRun) return;
    setRun(localRun).catch(() => undefined);
  }, [localRun, setRun]);

  const activeExercise = useMemo(() => localRun?.logs[activeIndex] ?? null, [localRun, activeIndex]);
  const activeExerciseDetails = useMemo(
    () => localRun?.plan.exercises[activeIndex] ?? null,
    [localRun, activeIndex],
  );

  function updateSetValue(exerciseIndex: number, setIndex: number, key: keyof WorkoutLogSet, value: number | null) {
    setLocalRun((current) => {
      if (!current) return current;
      const logs = current.logs.map((log, idx) => {
        if (idx !== exerciseIndex) return log;
        const sets = log.sets.map((set, sIdx) => {
          if (sIdx !== setIndex) return set;
          return { ...set, [key]: value };
        });
        return { ...log, sets };
      });
      return { ...current, logs };
    });
  }

  function updateNotes(notes: string) {
    setLocalRun((current) => (current ? { ...current, notes } : current));
  }

  async function shareSummary() {
    if (!localRun) return;
    const summary = `${localRun.plan.exercises.length} övningar på ${localRun.plan.gym?.name ?? 'utegym'}`;
    await Share.share({ message: `Jag körde ett pass via Utegym i Sverige! ${summary}` });
  }

  async function finishWorkout() {
    if (!localRun || saving) return;
    setSaving(true);

    const payload = localRun.logs.map((log) => ({
      workout_id: '',
      exercise_key: log.exerciseKey,
      sets: log.sets.length,
      reps: log.sets.map((set) => set.reps ?? 0),
      load_kg: log.sets.map((set) => set.loadKg ?? 0),
      rpe:
        log.sets.length === 0
          ? null
          : Math.round((log.sets.reduce((sum, set) => sum + (set.rpe ?? 0), 0) / log.sets.length) * 10) / 10,
    }));

    try {
      const { data, error } = await supabase
        .from('workouts')
        .insert({
          user_id: user?.id ?? null,
          gym_id: localRun.plan.gym?.id ?? null,
          started_at: localRun.startedAt,
          ended_at: new Date().toISOString(),
          notes: localRun.notes ?? null,
          meta: {
            equipment: localRun.plan.equipmentKeys,
            method_key: localRun.plan.method?.key ?? null,
            exercise_count: localRun.logs.length,
          },
        })
        .select('id')
        .single();

      if (error || !data) throw error;

      const logsPayload = payload.map((item) => ({ ...item, workout_id: data.id }));
      const { error: logError } = await supabase.from('workout_logs').insert(logsPayload);
      if (logError) throw logError;

      await setRun(null);
      reset();
      setCompletedWorkoutId(data.id);
      Toast.show({ type: 'success', text1: 'Pass sparat!' });
    } catch (error) {
      await addPendingWorkout({ ...localRun, id: `pending-${Date.now()}`, userId: user?.id ?? null });
      Toast.show({ type: 'info', text1: 'Sparat offline', text2: 'Synkas när du är online igen.' });
      await setRun(null);
      reset();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!localRun) {
    return (
      <View style={styles.center}>
        <Text>Ingen aktiv träning. Skapa en plan först.</Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/train/index')}>
          <Text style={styles.secondaryText}>Tillbaka till guiden</Text>
        </Pressable>
      </View>
    );
  }

  if (completedWorkoutId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Grymt jobbat! 🎉</Text>
        <Text style={styles.subtitle}>Ditt pass är sparat.</Text>
        <Pressable style={styles.primaryButton} onPress={shareSummary}>
          <Text style={styles.primaryText}>Dela passet</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/feed')}>
          <Text style={styles.secondaryText}>Visa flödet</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{localRun.plan.method?.name_sv ?? localRun.plan.method?.name}</Text>
      <Text style={styles.subtitle}>{localRun.plan.exercises.length} övningar</Text>

      {activeExercise && activeExerciseDetails ? (
        <View style={styles.activeCard}>
          <Text style={styles.activeTitle}>{activeExerciseDetails.name_sv ?? activeExerciseDetails.name}</Text>
          <Text style={styles.subtitle}>Rekommenderat: {activeExerciseDetails.prescription.sets} set</Text>
          <ScrollView contentContainerStyle={{ gap: 12 }}>
            {activeExercise.sets.map((set, index) => (
              <View key={index} style={styles.setRow}>
                <Text style={styles.setLabel}>Set {index + 1}</Text>
                <TextInput
                  placeholder="Reps"
                  keyboardType="number-pad"
                  value={set.reps?.toString() ?? ''}
                  onChangeText={(text) => updateSetValue(activeIndex, index, 'reps', text ? Number(text) : null)}
                  style={styles.input}
                />
                <TextInput
                  placeholder="Vikt (kg)"
                  keyboardType="number-pad"
                  value={set.loadKg?.toString() ?? ''}
                  onChangeText={(text) => updateSetValue(activeIndex, index, 'loadKg', text ? Number(text) : null)}
                  style={styles.input}
                />
                <TextInput
                  placeholder="RPE"
                  keyboardType="number-pad"
                  value={set.rpe?.toString() ?? ''}
                  onChangeText={(text) => updateSetValue(activeIndex, index, 'rpe', text ? Number(text) : null)}
                  style={styles.input}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.navigationRow}>
        <Pressable
          style={[styles.secondaryButton, activeIndex === 0 && styles.secondaryButtonDisabled]}
          disabled={activeIndex === 0}
          onPress={() => setActiveIndex((index) => Math.max(0, index - 1))}
        >
          <Text style={styles.secondaryText}>Föregående</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, activeIndex >= localRun.logs.length - 1 && styles.secondaryButtonDisabled]}
          disabled={activeIndex >= localRun.logs.length - 1}
          onPress={() => setActiveIndex((index) => Math.min(localRun.logs.length - 1, index + 1))}
        >
          <Text style={styles.secondaryText}>Nästa</Text>
        </Pressable>
      </View>

      <View style={styles.notesBox}>
        <Text style={styles.notesLabel}>Anteckningar</Text>
        <TextInput
          placeholder="Hur kändes passet?"
          multiline
          numberOfLines={3}
          value={localRun.notes ?? ''}
          onChangeText={updateNotes}
          style={styles.notesInput}
        />
      </View>

      <Pressable style={[styles.primaryButton, saving && styles.primaryButtonDisabled]} onPress={finishWorkout} disabled={saving}>
        <Text style={styles.primaryText}>{saving ? 'Sparar...' : 'Avsluta pass'}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: '#64748b',
  },
  activeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flex: 1,
  },
  activeTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setLabel: {
    width: 60,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 8,
    backgroundColor: '#f8fafc',
  },
  navigationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#16a34a',
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
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0ea5e9',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonDisabled: {
    borderColor: '#cbd5f5',
  },
  secondaryText: {
    color: '#0ea5e9',
    fontWeight: '600',
  },
  notesBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    gap: 6,
    backgroundColor: '#fff',
  },
  notesLabel: {
    fontWeight: '600',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
