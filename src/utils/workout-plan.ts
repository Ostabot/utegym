import type { Tables } from '@/lib/types';
import type { ExercisePrescription, WizardExercise } from '@/types/workout';

export function buildWizardExercises(
  exercises: Tables<'outdoor_exercises_v2'>[],
  prescription: ExercisePrescription,
  selectedKeys: string[] = [],
): WizardExercise[] {
  return exercises.map((exercise) => ({
    ...exercise,
    selected: selectedKeys.length === 0 ? true : selectedKeys.includes(exercise.key),
    prescription,
  }));
}

export function toggleExerciseSelection(list: WizardExercise[], key: string) {
  return list.map((exercise) =>
    exercise.key === key ? { ...exercise, selected: !exercise.selected } : exercise,
  );
}

export function updateExercisePrescription(list: WizardExercise[], key: string, prescription: ExercisePrescription) {
  return list.map((exercise) =>
    exercise.key === key
      ? {
          ...exercise,
          prescription,
        }
      : exercise,
  );
}
