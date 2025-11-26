import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from 'src/lib/storage/keys';
import { supabase } from '@/lib/supabase';
import type { PendingWorkout, WorkoutExerciseLog } from 'src/types/workout';

async function persistPendingWorkouts(workouts: PendingWorkout[]) {
  await AsyncStorage.setItem(STORAGE_KEYS.pendingWorkouts, JSON.stringify(workouts));
}

export async function getPendingWorkouts(): Promise<PendingWorkout[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.pendingWorkouts);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as PendingWorkout[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to parse pending workouts', error);
    return [];
  }
}

export async function addPendingWorkout(workout: PendingWorkout) {
  const existing = await getPendingWorkouts();
  await persistPendingWorkouts([...existing, workout]);
}

export async function removePendingWorkout(id: string) {
  const existing = await getPendingWorkouts();
  await persistPendingWorkouts(existing.filter((w) => w.id !== id));
}

export async function syncPendingWorkouts() {
  const pending = await getPendingWorkouts();
  if (pending.length === 0) return { synced: 0 };

  let synced = 0;
  for (const workout of pending) {
    try {
      const { error: workoutError, data } = await supabase
        .from('workouts')
        .insert({
          user_id: workout.userId,
          gym_id: workout.plan.gym?.id ?? null,
          started_at: workout.startedAt,
          ended_at: new Date().toISOString(),
          notes: workout.notes ?? null,
          meta: {
            equipment: workout.plan.equipmentKeys,
            method_key: workout.plan.method?.key ?? null,
            exercise_count: workout.logs.length,
          },
        })
        .select('id')
        .single();

      if (workoutError || !data) {
        console.warn('Failed to sync workout', workoutError);
        continue;
      }

      const payload: Array<{ workout_id: string; exercise_key: string; sets: number; reps: number[] | null; load_kg: number[] | null; rpe: number | null }> = [];
      workout.logs.forEach((log: WorkoutExerciseLog) => {
        payload.push({
          workout_id: data.id,
          exercise_key: log.exerciseKey,
          sets: log.sets.length,
          reps: log.sets.map((set) => set.reps ?? 0),
          load_kg: log.sets.map((set) => set.loadKg ?? 0),
          rpe:
            log.sets.length === 0
              ? null
              : Math.round(
                  (log.sets.reduce((acc, set) => acc + (set.rpe ?? 0), 0) / log.sets.length) * 10,
                ) / 10,
        });
      });

      const { error: logError } = await supabase.from('workout_logs').insert(payload);
      if (logError) {
        console.warn('Failed to sync workout logs', logError);
        continue;
      }

      await removePendingWorkout(workout.id);
      synced += 1;
    } catch (error) {
      console.warn('Unexpected sync error', error);
    }
  }

  return { synced };
}
