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
import type {
  WizardExercise,
  WizardGym,
  WizardMethod,
  WorkoutPlan,
} from '@/types/workout';
import type { Focus, Intensity, DurationKey } from '@/lib/workout';

// -------------------------------------------------------
const STATE_VERSION = 1;

// -------------------------------------------------------
interface WizardState {
  gym: WizardGym | null;
  equipmentKeys: string[];
  bodyweightOnly: boolean;
  method: WizardMethod;            // <-- alltid definierad konfig
  exercises: WizardExercise[];
  _v: number;
}

const DEFAULT_METHOD: WizardMethod = {
  focus: 'full',
  intensity: 'medium',
  duration: '5',
};

const initialState: WizardState = {
  gym: null,
  equipmentKeys: [],
  bodyweightOnly: false,
  method: DEFAULT_METHOD,
  exercises: [],
  _v: STATE_VERSION,
};

type WizardAction =
  | { type: 'setGym'; gym: WizardGym | null }
  | { type: 'setEquipment'; equipmentKeys: string[]; bodyweightOnly: boolean }
  | { type: 'setMethod'; method: WizardMethod }
  | { type: 'patchMethod'; patch: Partial<WizardMethod> }
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
    case 'patchMethod':
      return { ...state, method: { ...state.method, ...action.patch } };
    case 'setExercises':
      return { ...state, exercises: action.exercises };
    case 'reset':
      return { ...initialState, _v: STATE_VERSION };
    default:
      return state;
  }
}

interface WizardContextValue {
  // statefält
  gym: WizardGym | null;
  equipmentKeys: string[];
  bodyweightOnly: boolean;
  method: WizardMethod;
  exercises: WizardExercise[];

  // actions
  setGym: (gym: WizardGym | null) => void;
  setEquipment: (equipmentKeys: string[], bodyweightOnly: boolean) => void;
  setMethod: (method: WizardMethod) => void;
  setExercises: (exercises: WizardExercise[]) => void;
  setFocus: (f: Focus) => void;
  setIntensity: (i: Intensity) => void;
  setDuration: (d: DurationKey) => void;
  reset: () => void;

  // helpers
  createPlan: () => WorkoutPlan | null;

  // komp-fält (så befintliga skärmar kan läsa direkt)
  state: {
    gym: WizardGym | null;
    equipment: string[];        // alias till equipmentKeys
    bodyweightOnly: boolean;
    method: WizardMethod | null; // för gammal kod som förväntar nullbar
    exercises: WizardExercise[];
    focus: Focus;
    intensity: Intensity;
    duration: DurationKey;
  };
}

// -------------------------------------------------------
const WizardContext = createContext<WizardContextValue | undefined>(undefined);

export function WorkoutWizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrera
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.wizardDraft);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<WizardState>;
        if (parsed?._v === STATE_VERSION) {
          if ('gym' in parsed) dispatch({ type: 'setGym', gym: (parsed.gym ?? null) as WizardGym | null });
          if ('equipmentKeys' in parsed || 'bodyweightOnly' in parsed) {
            dispatch({
              type: 'setEquipment',
              equipmentKeys: (parsed.equipmentKeys ?? []) as string[],
              bodyweightOnly: Boolean(parsed.bodyweightOnly),
            });
          }
          if ('method' in parsed) dispatch({ type: 'setMethod', method: { ...DEFAULT_METHOD, ...(parsed.method as Partial<WizardMethod>) } });
          if ('exercises' in parsed) dispatch({ type: 'setExercises', exercises: (parsed.exercises ?? []) as WizardExercise[] });
        } else {
          await AsyncStorage.removeItem(STORAGE_KEYS.wizardDraft);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Persist
  useEffect(() => {
    AsyncStorage.setItem(
      STORAGE_KEYS.wizardDraft,
      JSON.stringify({ ...state, _v: STATE_VERSION })
    ).catch(() => undefined);
  }, [state]);

  // Actions
  const setGym = useCallback((gym: WizardGym | null) => dispatch({ type: 'setGym', gym }), []);
  const setEquipment = useCallback((equipmentKeys: string[], bodyweightOnly: boolean) => {
    dispatch({ type: 'setEquipment', equipmentKeys, bodyweightOnly });
  }, []);
  const setMethod = useCallback((method: WizardMethod) => dispatch({ type: 'setMethod', method }), []);
  const setExercises = useCallback((exercises: WizardExercise[]) => dispatch({ type: 'setExercises', exercises }), []);
  const setFocus = useCallback((f: Focus) => dispatch({ type: 'patchMethod', patch: { focus: f } }), []);
  const setIntensity = useCallback((i: Intensity) => dispatch({ type: 'patchMethod', patch: { intensity: i } }), []);
  const setDuration = useCallback((d: DurationKey) => dispatch({ type: 'patchMethod', patch: { duration: d } }), []);
  const reset = useCallback(() => {
    dispatch({ type: 'reset' });
    AsyncStorage.removeItem(STORAGE_KEYS.wizardDraft).catch(() => undefined);
  }, []);

  // Se till att WorkoutPlan['gym']-typen tillåter { id, name?, image_url? } | null
  const createPlan = useCallback((): WorkoutPlan | null => {
    if (!state.exercises.length) return null;

    const normalizedGym = state.gym
      ? { id: state.gym.id, name: state.gym.name ?? null, image_url: state.gym.image_url ?? null }
      : null;

    const plan: WorkoutPlan = {
      gym: normalizedGym,               // <- viktigt!
      equipmentKeys: state.equipmentKeys,
      bodyweightOnly: state.bodyweightOnly,
      method: state.method,
      exercises: state.exercises,
      scheduledAt: new Date().toISOString(),
    };

    // tillfälligt: hjälp-logg
    console.log('[Wizard] createPlan → gym:', plan.gym);

    return plan;
  }, [state]);

  const value = useMemo<WizardContextValue>(() => ({
    gym: state.gym,
    equipmentKeys: state.equipmentKeys,
    bodyweightOnly: state.bodyweightOnly,
    method: state.method,
    exercises: state.exercises,

    setGym,
    setEquipment,
    setMethod,
    setExercises,
    setFocus,
    setIntensity,
    setDuration,
    reset,

    createPlan,

    state: {
      gym: state.gym,
      equipment: state.equipmentKeys,
      bodyweightOnly: state.bodyweightOnly,
      method: state.method, // nullbar för retro-komp
      exercises: state.exercises,
      focus: state.method.focus,
      intensity: state.method.intensity,
      duration: state.method.duration,
    },
  }), [state, setEquipment, setExercises, setGym, setMethod, setFocus, setIntensity, setDuration, reset, createPlan]);

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWorkoutWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWorkoutWizard must be used within WorkoutWizardProvider');
  return ctx;
}