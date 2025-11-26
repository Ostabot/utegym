import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { WorkoutWizardProvider } from 'src/contexts/workout-wizard-context';
import { useAppTheme } from 'src/ui/useAppTheme';
import { useTranslation } from 'react-i18next';

export default function TabsLayout() {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <WorkoutWizardProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.subtext,
          tabBarStyle: {
            backgroundColor: theme.colors.bg,
            borderTopColor: theme.colors.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            elevation: 0,
          },
          sceneContainerStyle: { backgroundColor: theme.colors.bg },
        }}
      >
        <Tabs.Screen
          name="(home)"
          options={() => ({
            title: t('tabs.home', { defaultValue: 'Hem' }),
            tabBarLabel: t('tabs.home', { defaultValue: 'Hem' }),
            tabBarAccessibilityLabel: t('tabs.home', { defaultValue: 'Hem' }),
            tabBarAccessibilityHint: t('tabs.home.hint', {
              defaultValue: 'Visa kartan med utegym och starta pass.',
            }),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home" color={color} size={size} />
            ),
          })}
        />
        <Tabs.Screen
          name="(train)"
          options={() => ({
            title: t('tabs.train', { defaultValue: 'Träna' }),
            tabBarLabel: t('tabs.train', { defaultValue: 'Träna' }),
            tabBarAccessibilityLabel: t('tabs.train', { defaultValue: 'Träna' }),
            tabBarAccessibilityHint: t('tabs.train.hint', {
              defaultValue: 'Skapa eller starta träningspass.',
            }),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="barbell" color={color} size={size} />
            ),
          })}
        />
        <Tabs.Screen
          name="(feed)"
          options={() => ({
            title: t('tabs.feed', { defaultValue: 'Flöde' }),
            tabBarLabel: t('tabs.feed', { defaultValue: 'Flöde' }),
            tabBarAccessibilityLabel: t('tabs.feed', { defaultValue: 'Flöde' }),
            tabBarAccessibilityHint: t('tabs.feed.hint', {
              defaultValue: 'Visa loggade träningspass och topp-listor.',
            }),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="newspaper" color={color} size={size} />
            ),
          })}
        />
        <Tabs.Screen
          name="(profile)"
          options={() => ({
            title: t('tabs.profile', { defaultValue: 'Profil' }),
            tabBarLabel: t('tabs.profile', { defaultValue: 'Profil' }),
            tabBarAccessibilityLabel: t('tabs.profile', { defaultValue: 'Profil' }),
            tabBarAccessibilityHint: t('tabs.profile.hint', {
              defaultValue: 'Visa din profil, statistik och inställningar.',
            }),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" color={color} size={size} />
            ),
          })}
        />
      </Tabs>
    </WorkoutWizardProvider>
  );
}