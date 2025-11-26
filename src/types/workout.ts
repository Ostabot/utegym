// src/types/workout.ts
import type { Tables } from '@/lib/types';
import type { Focus, Intensity, DurationKey } from 'src/lib/workout';

// — Gym som väljs i guiden (antingen från vy eller tabell)
export type WizardGym = Tables<'gyms'> | Tables<'gym_preview'> | null;

// — DB-rad för metoder (om/när du vill läsa/visa riktiga metoder från DB)
export type WorkoutMethodRow = Tables<'workout_methods'>;

// — Vad guiden behöver för att generera ett pass
export type WizardMethod {
  focus: Focus;            // 'full' | 'upper' | 'lower' | 'core' | 'cardio'
  intensity: Intensity;    // 'light' | 'medium' | 'hard'
  duration: DurationKey;   // '5' | '10' | '15' | '30' | '45'
}

// — Övningar som väljs i guiden (v2-tabellen + recept)
export type ExercisePrescription = {
  sets: number;
  reps?: number[];
  durationSeconds?: number;
  notes?: string;
};

export type WizardExercise = Tables<'outdoor_exercises_v2'> & {
  selected: boolean;
  prescription: ExercisePrescription;
};

// — Själva planen som guiden skapar
export type WorkoutPlan = {
  gym: WizardGym;
  equipmentKeys: string[];
  bodyweightOnly: boolean;
  exercises: WizardExercise[];
  scheduledAt: string;
};

// — Loggning när pass körs
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