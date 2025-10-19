import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/lib/storage/keys';
import type { WorkoutRunState } from '@/types/workout';

export function useCurrentRun() {
  const [run, setRun] = useState<WorkoutRunState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.currentRun)
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored) as WorkoutRunState;
        setRun(parsed);
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async (value: WorkoutRunState | null) => {
    setRun(value);
    if (!value) {
      await AsyncStorage.removeItem(STORAGE_KEYS.currentRun);
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEYS.currentRun, JSON.stringify(value));
  }, []);

  return { run, setRun: persist, loading };
}
