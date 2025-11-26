// app/(tabs)/(train)/_layout.tsx
import { Stack } from 'expo-router';
import { useAppTheme } from 'src/ui/useAppTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function TrainStack() {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <Stack
      // gör screenOptions reaktiva till språk + tema
      screenOptions={() => ({
        contentStyle: { backgroundColor: theme.colors.bg },
        headerStyle: { backgroundColor: theme.colors.header },
        headerTintColor: theme.colors.headerText,
        headerTitleStyle: {
          color: theme.colors.headerText,
          fontWeight: '700',
        },
        headerShadowVisible: false,
        headerBackTitle: t('common.back', { defaultValue: 'Tillbaka' }),
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
      })}
    >
      <Stack.Screen
        name="index"
        options={() => ({
          title: t('train.titles.chooseGym', {
            defaultValue: 'Välj ditt utegym',
          }),
        })}
      />
      <Stack.Screen
        name="equipment"
        options={() => ({
          title: t('train.titles.chooseEquipment', {
            defaultValue: 'Välj din utrustning',
          }),
        })}
      />
      <Stack.Screen
        name="method"
        options={() => ({
          title: t('train.titles.chooseMethod', {
            defaultValue: 'Välj ditt träningsupplägg',
          }),
        })}
      />
      <Stack.Screen
        name="exercises"
        options={() => ({
          title: t('train.titles.chooseExercises', {
            defaultValue: 'Välj dina övningar',
          }),
        })}
      />
      <Stack.Screen
        name="plan"
        options={() => ({
          title: t('train.titles.plan', {
            defaultValue: 'Plan',
          }),
        })}
      />
    </Stack>
  );
}