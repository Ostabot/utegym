import { Stack } from 'expo-router';

export default function TrainStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Välj utegym' }} />
      <Stack.Screen name="equipment" options={{ title: 'Utrustning' }} />
      <Stack.Screen name="method" options={{ title: 'Metod' }} />
      <Stack.Screen name="exercises" options={{ title: 'Övningar' }} />
      <Stack.Screen name="plan" options={{ title: 'Plan' }} />
      <Stack.Screen name="run" options={{ headerShown: false }} />
    </Stack>
  );
}
