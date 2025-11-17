import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/ui/useAppTheme';
import { useTranslation } from 'react-i18next';

export default function FeedStack() {
  const t = useAppTheme();
  const { t: T } = useTranslation();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: t.colors.bg },

        headerStyle: { backgroundColor: t.colors.header },
        headerTintColor: t.colors.headerText,
        headerTitleStyle: {
          color: t.colors.headerText,
          fontWeight: '700',
        },
        headerShadowVisible: false,

        // 🔹 Gradienten ska vara dekorativ → inte ta fokus
        headerBackground: () => (
          <View
            style={StyleSheet.absoluteFill}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <LinearGradient
              colors={t.colors.headerGradient as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: T('feed.title', 'Flöde'),
          headerAccessibilityLabel: T(
            'a11y.header.feed',
            'Flödesvy, visar senaste träningspassen'
          ),
        }}
      />

      <Stack.Screen
        name="[workoutId]"
        options={{
          title: T('feed.workoutDetail.title', 'Pass'),
          headerAccessibilityLabel: T(
            'a11y.header.workoutDetail',
            'Detaljer för träningspass'
          ),
        }}
      />
    </Stack>
  );
}