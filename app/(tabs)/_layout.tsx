console.log('Tabs layout mounted')

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemePreference } from '@/contexts/theme-context';

export default function TabsLayout() {
  const { resolved } = useThemePreference();
  const isDark = resolved === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#facc15' : '#0ea5e9',
        tabBarStyle: {
          backgroundColor: isDark ? '#0f172a' : '#fff',
          borderTopColor: isDark ? '#1f2937' : '#e5e7eb',
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Hem',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="(train)"
        options={{
          title: 'Träna',
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="(feed)"
        options={{
          title: 'Flöde',
          tabBarIcon: ({ color, size }) => <Ionicons name="newspaper" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
