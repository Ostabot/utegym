import type { Tables } from '@/lib/types';

export type WizardGym = Tables<'gyms'> | Tables<'gym_preview'> | null;

export type WizardMethod = Tables<'workout_methods'> | null;

export type WizardExercise = Tables<'outdoor_exercises_v2'> & {
  selected: boolean;
  prescription: ExercisePrescription;
};

export type ExercisePrescription = {
  sets: number;
  reps?: number[];
  durationSeconds?: number;
  notes?: string;
};

export type WorkoutPlan = {
  gym: WizardGym;
  equipmentKeys: string[];
  bodyweightOnly: boolean;
  method: WizardMethod;
  exercises: WizardExercise[];
  scheduledAt: string;
};

export type WorkoutLogSet = {
  reps: number | null;
  loadKg: number | null;
  rpe: number | null;
  durationSeconds?: number | null;
};

export type WorkoutExerciseLog = {
  exerciseKey: string;
  sets: WorkoutLogSet[];
};

export type WorkoutRunState = {
  plan: WorkoutPlan;
  startedAt: string;
  logs: WorkoutExerciseLog[];
  notes?: string;
};

export type PendingWorkout = WorkoutRunState & {
  id: string;
  userId: string | null;
};
