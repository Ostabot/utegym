import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import type { WizardExercise, WizardGym, WizardMethod, WorkoutPlan } from '@/types/workout';

// Versionera state så vi kan migrera enkelt i framtiden
const STATE_VERSION = 1;

interface WizardState {
  gym: WizardGym | null;
  equipmentKeys: string[];
  bodyweightOnly: boolean;
  method: WizardMethod | null;
  exercises: WizardExercise[];
  _v: number; // intern versionsmarkör
}

const initialState: WizardState = {
  gym: null,
  equipmentKeys: [],
  bodyweightOnly: false,
  method: null,
  exercises: [],
  _v: STATE_VERSION,
};

type WizardAction =
  | { type: 'setGym'; gym: WizardGym | null }
  | { type: 'setEquipment'; equipmentKeys: string[]; bodyweightOnly: boolean }
  | { type: 'setMethod'; method: WizardMethod | null }
  | { type: 'setExercises'; exercises: WizardExercise[] }
  | { type: 'reset' };

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'setGym':
      return { ...state, gym: action.gym };
    case 'setEquipment':
      return { ...state, equipmentKeys: action.equipmentKeys, bodyweightOnly: action.bodyweightOnly };
    case 'setMethod':
      return { ...state, method: action.method };
    case 'setExercises':
      return { ...state, exercises: action.exercises };
    case 'reset':
      return initialState;
    default:
      return state;
  }
}

interface WizardContextValue extends Omit<WizardState, '_v'> {
  setGym: (gym: WizardGym | null) => void;
  setEquipment: (equipmentKeys: string[], bodyweightOnly: boolean) => void;
  setMethod: (method: WizardMethod | null) => void;
  setExercises: (exercises: WizardExercise[]) => void;
  reset: () => void;
  createPlan: () => WorkoutPlan | null;
}

const WizardContext = createContext<WizardContextValue | undefined>(undefined);

export function WorkoutWizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // --- Hydration från AsyncStorage (robust med try/catch)
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.wizardDraft);
        if (!stored) return;
        const parsed = JSON.parse(stored) as Partial<WizardState>;
        // enkel migrations-gate
        if (parsed && parsed._v === STATE_VERSION) {
          if ('gym' in parsed) dispatch({ type: 'setGym', gym: (parsed.gym ?? null) as WizardGym | null });
          if ('equipmentKeys' in parsed || 'bodyweightOnly' in parsed) {
            dispatch({
              type: 'setEquipment',
              equipmentKeys: (parsed.equipmentKeys ?? []) as string[],
              bodyweightOnly: Boolean(parsed.bodyweightOnly),
            });
          }
          if ('method' in parsed) dispatch({ type: 'setMethod', method: (parsed.method ?? null) as WizardMethod | null });
          if ('exercises' in parsed) dispatch({ type: 'setExercises', exercises: (parsed.exercises ?? []) as WizardExercise[] });
        } else {
          // version okänd → börja om
          await AsyncStorage.removeItem(STORAGE_KEYS.wizardDraft);
        }
      } catch {
        // ignorera korrupt state
      }
    })();
  }, []);

  // --- Persistens
  useEffect(() => {
    AsyncStorage.setItem(
      STORAGE_KEYS.wizardDraft,
      JSON.stringify({ ...state, _v: STATE_VERSION })
    ).catch(() => undefined);
  }, [state]);

  // --- Actions
  const setGym = useCallback((gym: WizardGym | null) => dispatch({ type: 'setGym', gym }), []);
  const setEquipment = useCallback((equipmentKeys: string[], bodyweightOnly: boolean) => {
    dispatch({ type: 'setEquipment', equipmentKeys, bodyweightOnly });
  }, []);
  const setMethod = useCallback((method: WizardMethod | null) => dispatch({ type: 'setMethod', method }), []);
  const setExercises = useCallback((exercises: WizardExercise[]) => dispatch({ type: 'setExercises', exercises }), []);
  const reset = useCallback(() => {
    dispatch({ type: 'reset' });
    AsyncStorage.removeItem(STORAGE_KEYS.wizardDraft).catch(() => undefined);
  }, []);

  // --- Plan-generator
  const createPlan = useCallback((): WorkoutPlan | null => {
    if (!state.method || state.exercises.length === 0) return null;
    return {
      gym: state.gym,
      equipmentKeys: state.equipmentKeys,
      bodyweightOnly: state.bodyweightOnly,
      method: state.method,
      exercises: state.exercises,
      scheduledAt: new Date().toISOString(),
    };
  }, [state]);

  const value = useMemo<WizardContextValue>(
    () => ({
      gym: state.gym,
      equipmentKeys: state.equipmentKeys,
      bodyweightOnly: state.bodyweightOnly,
      method: state.method,
      exercises: state.exercises,
      setGym,
      setEquipment,
      setMethod,
      setExercises,
      reset,
      createPlan,
    }),
    [state, setEquipment, setExercises, setGym, setMethod, reset, createPlan]
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWorkoutWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWorkoutWizard must be used within WorkoutWizardProvider');
  return ctx;
}