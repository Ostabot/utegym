import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncPendingWorkouts } from 'src/lib/workout-sync';

export function usePendingWorkoutSync() {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        syncPendingWorkouts().catch((error) => {
          console.warn('Pending workout sync failed', error);
        });
      }
    });

    return () => unsubscribe();
  }, []);
}
