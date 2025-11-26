import { describe, expect, it } from 'vitest';
import type { Tables } from '@/lib/types';
import { buildWizardExercises, toggleExerciseSelection, updateExercisePrescription } from 'src/utils/workout-plan';
import type { ExercisePrescription, WizardExercise } from 'src/types/workout';

const baseExercises: Tables<'outdoor_exercises_v2'>[] = [
  {
    key: 'pushup',
    name: 'Push Up',
    name_sv: 'Armhävning',
    description: null,
    modality: null,
    focus: null,
    difficulty: 'medium',
    bodyweight_ok: true,
    equipment_keys: [],
    demo_url: null,
    tags: null,
    created_at: null,
  },
  {
    key: 'pullup',
    name: 'Pull Up',
    name_sv: 'Chins',
    description: null,
    modality: null,
    focus: null,
    difficulty: 'hard',
    bodyweight_ok: false,
    equipment_keys: ['bar'],
    demo_url: null,
    tags: null,
    created_at: null,
  },
];

const prescription: ExercisePrescription = { sets: 3, reps: [10, 10, 10] };

describe('workout-plan helpers', () => {
  it('marks exercises as selected by default when no selection provided', () => {
    const result = buildWizardExercises(baseExercises, prescription);
    expect(result.map((exercise) => exercise.selected)).toEqual([true, true]);
  });

  it('respects a provided list of selected exercise keys', () => {
    const result = buildWizardExercises(baseExercises, prescription, ['pullup']);
    expect(result.find((exercise) => exercise.key === 'pullup')?.selected).toBe(true);
    expect(result.find((exercise) => exercise.key === 'pushup')?.selected).toBe(false);
  });

  it('can toggle exercise selection', () => {
    const list = buildWizardExercises(baseExercises, prescription);
    const toggled = toggleExerciseSelection(list as WizardExercise[], 'pushup');
    expect(toggled.find((exercise) => exercise.key === 'pushup')?.selected).toBe(false);
  });

  it('updates prescription for a single exercise', () => {
    const list = buildWizardExercises(baseExercises, prescription) as WizardExercise[];
    const updated = updateExercisePrescription(list, 'pushup', { sets: 5, reps: [5, 5, 5, 5, 5] });
    const exercise = updated.find((item) => item.key === 'pushup');
    expect(exercise?.prescription.sets).toBe(5);
    expect(exercise?.prescription.reps).toEqual([5, 5, 5, 5, 5]);
  });
});
