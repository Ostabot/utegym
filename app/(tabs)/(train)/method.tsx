import { useRouter } from 'expo-router';
import { useWorkoutWizard } from '@/contexts/workout-wizard-context';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useAppTheme } from '@/ui/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const focusOpts = [
  { key: 'full', icon: 'body-outline' },
  { key: 'upper', icon: 'arrow-up-outline' },
  { key: 'lower', icon: 'arrow-down-outline' },
  { key: 'core', icon: 'flame-outline' },
  { key: 'cardio', icon: 'fitness-outline' }
] as const;

const intensityOpts = [
  { key: 'light', icon: 'battery-half-outline' },
  { key: 'medium', icon: 'battery-charging-outline' },
  { key: 'hard', icon: 'battery-full-outline' }
] as const;

const durationOpts = ['5', '10', '15', '30'] as const;

export default function MethodScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { state, setMethod } = useWorkoutWizard();

  const current = state.method ?? { focus: 'full', intensity: 'medium', duration: '5' };

  function updateMethod(partial: Partial<typeof current>) {
    setMethod({ ...current, ...partial });
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.colors.bg }]}
    >
      {/* Fokus */}
      <Text
        style={[styles.h1, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        {t('train.method.focusTitle')}
      </Text>

      <View style={styles.grid}>
        {focusOpts.map((f) => {
          const active = current.focus === f.key;
          return (
            <Pressable
              key={f.key}
              accessibilityRole="button"
              accessibilityLabel={t(`workout.focus.${f.key}`)}
              accessibilityState={{ selected: active }}
              onPress={() => updateMethod({ focus: f.key })}
              android_ripple={{ color: theme.colors.border }}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: active
                    ? theme.colors.primary
                    : theme.colors.card,
                  borderColor: active
                    ? theme.colors.primary
                    : theme.colors.border,
                  opacity: pressed ? 0.85 : 1
                }
              ]}
            >
              <Ionicons
                name={f.icon as any}
                size={28}
                color={active ? theme.colors.primaryText : theme.colors.text}
                accessible={false}
              />
              <Text
                style={[
                  styles.cardLabel,
                  { color: active ? theme.colors.primaryText : theme.colors.text },
                  active && { fontWeight: '700' }
                ]}
              >
                {t(`workout.focus.${f.key}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Intensitet */}
      <Text
        style={[styles.h1, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        {t('train.method.intensityTitle')}
      </Text>

      <View style={styles.grid}>
        {intensityOpts.map((i) => {
          const active = current.intensity === i.key;
          return (
            <Pressable
              key={i.key}
              accessibilityRole="button"
              accessibilityLabel={t(`workout.intensity.${i.key}`)}
              accessibilityState={{ selected: active }}
              onPress={() => updateMethod({ intensity: i.key })}
              android_ripple={{ color: theme.colors.border }}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active
                    ? theme.colors.primary
                    : theme.colors.card,
                  borderColor: active
                    ? theme.colors.primary
                    : theme.colors.border,
                  opacity: pressed ? 0.85 : 1
                }
              ]}
            >
              <Ionicons
                name={i.icon as any}
                size={28}
                color={active ? theme.colors.primaryText : theme.colors.text}
                style={{ marginRight: 6 }}
                accessible={false}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: active ? theme.colors.primaryText : theme.colors.text },
                  active && { fontWeight: '700' }
                ]}
              >
                {t(`workout.intensity.${i.key}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Tid */}
      <Text
        style={[styles.h1, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        {t('train.method.timeTitle')}
      </Text>

      <View style={styles.grid}>
        {durationOpts.map((d) => {
          const active = current.duration === d;
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityLabel={`${d} ${t('common.min')}`}
              accessibilityState={{ selected: active }}
              onPress={() => updateMethod({ duration: d })}
              android_ripple={{ color: theme.colors.border }}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active
                    ? theme.colors.primary
                    : theme.colors.card,
                  borderColor: active
                    ? theme.colors.primary
                    : theme.colors.border,
                  opacity: pressed ? 0.85 : 1
                }
              ]}
            >
              <Ionicons
                name="time-outline"
                size={28}
                color={active ? theme.colors.primaryText : theme.colors.text}
                style={{ marginRight: 6 }}
                accessible={false}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: active ? theme.colors.primaryText : theme.colors.text },
                  active && { fontWeight: '700' }
                ]}
              >
                {d} {t('common.min')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* CTA */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('train.method.continue')}
        onPress={() => router.push('/(tabs)/(train)/exercises')}
        android_ripple={{ color: theme.colors.primaryText }}
        style={({ pressed }) => [
          styles.cta,
          {
            backgroundColor: theme.colors.primary,
            opacity: pressed ? 0.9 : 1
          }
        ]}
      >
        <Text style={[styles.ctaText, { color: theme.colors.primaryText }]}>
          {t('train.method.continue')}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, flexGrow: 1 },
  h1: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '33%',
    aspectRatio: 1.25,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  cardLabel: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  chipText: { fontSize: 15 },
  cta: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center'
  },
  ctaText: { fontWeight: '800', fontSize: 16 }
});