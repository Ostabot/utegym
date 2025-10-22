import { Stack } from 'expo-router';

//tidigare FeedStack
export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Flöde' }} />
      <Stack.Screen name="[workoutId]" options={{ title: 'Pass' }} />
    </Stack>
  );
}
