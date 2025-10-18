
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { AuthBootstrapper } from '@/lib/auth-bootstrapper';

export default function RootLayout() {
  // Handle magic link callbacks & native deep links
  useEffect(() => { /* nothing needed here: AuthBootstrapper mounts globally */ }, []);

  return (
    <>
      <AuthBootstrapper />
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="index" options={{ title: 'Hem' }} />
        <Tabs.Screen name="train" options={{ title: 'Träna' }} />
        <Tabs.Screen name="feed" options={{ title: 'Flöde' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
      </Tabs>
    </>
  );
}
