import type { Tables } from '@/lib/types';
import type { ExercisePrescription } from '@/types/workout';

type MethodScheme = {
  sets?: number;
  reps?: number[];
  duration_seconds?: number;
  notes?: string;
};

export function parseMethodScheme(method: Tables<'workout_methods'> | null): ExercisePrescription {
  if (!method?.scheme) {
    return { sets: 3, reps: [10, 10, 10] };
  }

  const scheme = method.scheme as MethodScheme;
  return {
    sets: scheme.sets ?? 3,
    reps: scheme.reps ?? Array.from({ length: scheme.sets ?? 3 }, () => 10),
    durationSeconds: scheme.duration_seconds,
    notes: scheme.notes,
  };
}
