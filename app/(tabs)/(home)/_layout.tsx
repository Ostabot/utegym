// app/(tabs)/(home)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WorkoutWizardProvider } from '@/contexts/workout-wizard-context';
import { useAppTheme } from '@/ui/useAppTheme';
import { useTranslation } from 'react-i18next';

export default function HomeStack() {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <WorkoutWizardProvider>
      <Stack
        screenOptions={{
          // Grundbakgrund för hela stacken
          contentStyle: { backgroundColor: theme.colors.bg },

          // Header-design
          headerStyle: { backgroundColor: theme.colors.header },
          headerTintColor: theme.colors.headerText,
          headerTitleStyle: {
            color: theme.colors.headerText,
            fontWeight: '700',
          },
          headerShadowVisible: false,

          // Gradient-header
          headerBackground: () => (
            <View style={StyleSheet.absoluteFill}>
              <LinearGradient
                colors={theme.colors.headerGradient as any}
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
            // startsidan har ingen header
            headerShown: false,
            // title finns kvar för eventuella systemytor
            title: t('home.title', 'Utegym'),
          }}
        />
        <Stack.Screen
          name="gym/[id]"
          options={{
            title: t('gym.title', 'Gym'),
            headerBackTitle: t('common.back', 'Tillbaka'),
          }}
        />
      </Stack>
    </WorkoutWizardProvider>
  );
}