import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useWorkoutWizard } from '@/contexts/workout-wizard-context';
import { useCurrentRun } from '@/contexts/current-run-context';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/ui/useAppTheme';
import { useSession } from '@/contexts/session-context';
import { useTranslation } from 'react-i18next';

export default function TrainPlanScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();

  const { createPlan, gym: wizardGym } = useWorkoutWizard();
  const { user } = useSession();

  // 1) skapa plan
  const rawPlan = createPlan();

  if (!rawPlan) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <Text style={{ color: theme.colors.text }}>
          {t('train.plan.generateError')}
        </Text>
      </View>
    );
  }

  // 2) säkerställ gym
  const plan =
    !rawPlan.gym && wizardGym
      ? {
        ...rawPlan,
        gym: {
          id: wizardGym.id,
          name: wizardGym.name ?? null,
          image_url: wizardGym.image_url ?? null,
        },
      }
      : rawPlan;

  // 3) datumformat
  const locale = i18n.language?.startsWith('sv') ? 'sv-SE' : 'en-GB';
  const formattedDate = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  }).format(new Date());

  // gymnamn / bild
  const displayGymName =
    plan.gym?.name ?? t('train.plan.gymFallback', { defaultValue: 'Any outdoor gym' });

  const displayGymImage = plan.gym?.image_url
    ? { uri: plan.gym.image_url }
    : require('@/assets/gym-placeholder.png');

  // 4) övningsnamn baserat på språk
  const pickName = (ex) =>
    i18n.language?.startsWith('en')
      ? ex.name ?? ex.name_sv ?? ex.key
      : ex.name_sv ?? ex.name ?? ex.key;

  // 5) starta passet
  async function startWorkout() {
    try {
      if (!user?.id) {
        Toast.show({
          type: 'error',
          text1: t('train.plan.toast.loginRequired'),
        });
        return;
      }

      const planForInsert = plan;

      const logs = planForInsert.exercises.map((ex) => ({
        exerciseKey: ex.key,
        sets: Array.from({ length: ex.prescription.sets }, (_, i) => ({
          reps: ex.prescription.reps?.[i] ?? null,
          loadKg: null,
          rpe: null,
          durationSeconds: ex.prescription.durationSeconds ?? null,
          done: false,
        })),
      }));

      const runSeed = {
        plan: planForInsert,
        logs,
        startedAt: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          started_at: runSeed.startedAt,
          plan: runSeed.plan,
          logs: runSeed.logs,
          meta: {
            alias: (user.user_metadata as any)?.alias ?? null,
          },
        })
        .select('id')
        .single();

      if (error) throw error;

      const destId = data.id;
      router.push(`/run/${encodeURIComponent(destId)}`);
    } catch (err) {
      console.error('[Plan] startWorkout failed', err);
      Toast.show({
        type: 'error',
        text1: t('train.plan.toast.startFailedTitle'),
        text2: t('train.plan.toast.startFailedBody'),
      });
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <Text
        style={[styles.title, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        {t('train.plan.title')}
      </Text>

      {/* --- PLAN CARD --- */}
      <View
        style={[
          styles.planCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            shadowColor: theme.colors.shadow,
            shadowOpacity: 1,
          },
        ]}
      >
        <View style={styles.imageWrapper}>
          <Image
            source={displayGymImage}
            style={styles.gymImage}
            accessible={false}
          />
          <Text
            style={styles.gymNameOverlay}
            accessibilityLabel={`${t('gym.title')}: ${displayGymName}`}
          >
            {displayGymName}
          </Text>
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <Text style={[styles.planTitle, { color: theme.colors.text }]}>
            {t('train.plan.cardTitle')}
          </Text>

          <Text style={[styles.dateText, { color: theme.colors.subtext }]}>
            {formattedDate}
          </Text>

          <View style={styles.exerciseList}>
            {plan.exercises.map((ex) => (
              <View
                key={ex.key}
                style={styles.exerciseRow}
                accessible={true}
                accessibilityLabel={`${pickName(ex)}: ${ex.prescription.sets} x ${ex.prescription.reps?.[0] ?? '?'
                  }`}
              >
                <Text style={[styles.exerciseName, { color: theme.colors.text }]}>
                  {pickName(ex)}
                </Text>
                <Text style={[styles.exerciseMeta, { color: theme.colors.subtext }]}>
                  {ex.prescription.sets} × {ex.prescription.reps?.[0] ?? '?'}
                </Text>
              </View>
            ))}
          </View>

          {/* BADGES */}
          <View style={styles.labelsRow}>
            <View style={[styles.label, { backgroundColor: theme.colors.badgeBlue }]}>
              <Text style={[styles.labelText, { color: theme.colors.text }]}>
                {t(`workout.focus.${plan.method?.focus ?? 'full'}`)}
              </Text>
            </View>

            <View
              style={[styles.label, { backgroundColor: theme.colors.badgeYellow }]}
            >
              <Text style={[styles.labelText, { color: theme.colors.text }]}>
                {t(`workout.intensity.${plan.method?.intensity ?? 'medium'}`)}
              </Text>
            </View>

            <View
              style={[styles.label, { backgroundColor: theme.colors.badgeGreen }]}
            >
              <Text style={[styles.labelText, { color: theme.colors.text }]}>
                {plan.method?.duration} {t('common.min')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* --- START BUTTON --- */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('train.plan.startCta')}
        accessibilityHint={t('train.plan.startCta')}
        android_ripple={{ color: theme.colors.primaryText }}
        onPress={startWorkout}
        style={({ pressed }) => [
          styles.primaryButton,
          {
            backgroundColor: theme.colors.primary,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <Text style={[styles.primaryText, { color: theme.colors.primaryText }]}>
          {t('train.plan.startCta')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  title: { fontSize: 24, fontWeight: '800' },

  planCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },

  imageWrapper: { position: 'relative' },
  gymImage: { width: '100%', height: 180, resizeMode: 'cover' },

  gymNameOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    color: 'white',
    fontWeight: '800',
    fontSize: 18,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },

  planTitle: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  dateText: { marginBottom: 10 },

  exerciseList: { gap: 6 },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exerciseName: { fontWeight: '700' },
  exerciseMeta: {},

  labelsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  label: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  labelText: { fontWeight: '600', fontSize: 13 },

  primaryButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryText: { fontWeight: '700', fontSize: 16 },
});