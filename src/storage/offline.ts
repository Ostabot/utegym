import AsyncStorage from '@react-native-async-storage/async-storage';
const PENDING_KEY = "pending_workouts_v1";
export async function savePendingWorkout(w:any){ const cur=await AsyncStorage.getItem(PENDING_KEY); const arr=cur?JSON.parse(cur):[]; arr.push(w); await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(arr)); }
export async function readPendingWorkouts(){ const cur=await AsyncStorage.getItem(PENDING_KEY); return cur?JSON.parse(cur):[]; }
export async function clearPendingWorkouts(){ await AsyncStorage.removeItem(PENDING_KEY); }
