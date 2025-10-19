import { Stack } from 'expo-router';

export default function HomeStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Utegym', headerShown: false }} />
      <Stack.Screen name="gym/[id]" options={{ title: 'Gym', headerBackTitle: 'Tillbaka' }} />
    </Stack>
  );
}
