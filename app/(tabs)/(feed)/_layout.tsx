import { Stack } from 'expo-router';

export default function FeedStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Flöde' }} />
      <Stack.Screen name="[workoutId]" options={{ title: 'Pass' }} />
    </Stack>
  );
}
