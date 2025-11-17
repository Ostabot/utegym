import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/ui/useAppTheme';
import { useTranslation } from 'react-i18next';

export default function ProfileStack() {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        // Basbakgrund för hela stacken
        contentStyle: { backgroundColor: theme.colors.bg },

        // Header-stil och färger
        headerStyle: { backgroundColor: theme.colors.header },
        headerTintColor: theme.colors.headerText,
        headerTitleStyle: {
          color: theme.colors.headerText,
          fontWeight: '700',
        },
        headerShadowVisible: false,
        headerBackTitle: t('common.back', { defaultValue: 'Tillbaka' }),

        // Gradient i headern
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
          title: t('profile.title', { defaultValue: 'Profil' }),
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: t('settings.title', { defaultValue: 'Inställningar' }),
        }}
      />
    </Stack>
  );
}