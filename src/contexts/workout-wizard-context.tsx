import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import type { WizardExercise, WizardGym, WizardMethod, WorkoutPlan } from '@/types/workout';

interface WizardState {
  gym: WizardGym;
  equipmentKeys: string[];
  bodyweightOnly: boolean;
  method: WizardMethod;
  exercises: WizardExercise[];
}

const initialState: WizardState = {
  gym: null,
  equipmentKeys: [],
  bodyweightOnly: false,
  method: null,
  exercises: [],
};

type WizardAction =
  | { type: 'setGym'; gym: WizardGym }
  | { type: 'setEquipment'; equipmentKeys: string[]; bodyweightOnly: boolean }
  | { type: 'setMethod'; method: WizardMethod }
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

interface WizardContextValue extends WizardState {
  setGym: (gym: WizardGym) => void;
  setEquipment: (equipmentKeys: string[], bodyweightOnly: boolean) => void;
  setMethod: (method: WizardMethod) => void;
  setExercises: (exercises: WizardExercise[]) => void;
  reset: () => void;
  createPlan: () => WorkoutPlan | null;
}

const WizardContext = createContext<WizardContextValue | undefined>(undefined);

export function WorkoutWizardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.wizardDraft)
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored) as WizardState;
        dispatch({ type: 'setGym', gym: parsed.gym });
        dispatch({ type: 'setEquipment', equipmentKeys: parsed.equipmentKeys, bodyweightOnly: parsed.bodyweightOnly });
        dispatch({ type: 'setMethod', method: parsed.method });
        dispatch({ type: 'setExercises', exercises: parsed.exercises });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEYS.wizardDraft, JSON.stringify(state)).catch(() => undefined);
  }, [state]);

  const setGym = useCallback((gym: WizardGym) => dispatch({ type: 'setGym', gym }), []);
  const setEquipment = useCallback((equipmentKeys: string[], bodyweightOnly: boolean) => {
    dispatch({ type: 'setEquipment', equipmentKeys, bodyweightOnly });
  }, []);
  const setMethod = useCallback((method: WizardMethod) => dispatch({ type: 'setMethod', method }), []);
  const setExercises = useCallback((exercises: WizardExercise[]) => dispatch({ type: 'setExercises', exercises }), []);
  const reset = useCallback(() => {
    dispatch({ type: 'reset' });
    AsyncStorage.removeItem(STORAGE_KEYS.wizardDraft).catch(() => undefined);
  }, []);

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

  const value = useMemo(
    () => ({ ...state, setGym, setEquipment, setMethod, setExercises, reset, createPlan }),
    [state, setEquipment, setExercises, setGym, setMethod, reset, createPlan],
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWorkoutWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWorkoutWizard must be used within WorkoutWizardProvider');
  return ctx;
}
