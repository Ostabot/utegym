// app/(tabs)/(feed)/[workoutId].tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { supabase } from '@/lib/supabase';
import WorkoutSummaryCard from '@/components/WorkoutSummaryCard';
import { useAppTheme } from '@/ui/useAppTheme';
import AccessiblePressable from '@/ui/AccessiblePressable';
import { useTranslation } from 'react-i18next';

type PlanExercise = {
  key: string;
  name?: string | null;
  name_sv?: string | null;
  prescription: {
    sets: number;
    reps?: number[] | null;
    durationSeconds?: number | null;
  };
};
type PlanLike = {
  exercises: PlanExercise[];
  gym?: {
    id?: string | null;
    name?: string | null;
    image_url?: string | null;
  } | null;
  method?: {
    focus?: string | null;
    intensity?: 'easy' | 'medium' | 'hard' | null;
    duration?: number | string | null;
    name?: string | null;
    name_sv?: string | null;
  } | null;
};

type Row = {
  id: string;
  started_at: string;
  plan: PlanLike;
  rating?: number | null;
  user_alias?: string | null;
  gym_name?: string | null;
  gym_image_url?: string | null;
};

export default function FeedWorkoutById() {
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();

  const [row, setRow] = useState<Row | null | undefined>(undefined);

  useEffect(() => {
    let on = true;
    (async () => {
      if (!workoutId) {
        if (on) setRow(null);
        return;
      }

      const { data, error } = await supabase
        .from('workout_sessions')
        .select('id, created_at, started_at, plan, meta')
        .eq('id', workoutId)
        .maybeSingle();

      if (!on) return;

      if (error || !data) {
        console.warn('[FeedWorkoutById] load failed', error);
        setRow(null);
        return;
      }

      const rawRating = data?.meta?.rating;
      const rating =
        typeof rawRating === 'number'
          ? rawRating
          : typeof rawRating === 'string' &&
            rawRating.trim() !== '' &&
            !Number.isNaN(Number(rawRating))
            ? Number(rawRating)
            : null;

      const out: Row = {
        id: data.id,
        started_at: data.started_at ?? data.created_at,
        plan: data.plan,
        rating,
        user_alias: data?.meta?.alias ?? null,
        gym_name: data?.plan?.gym?.name ?? null,
        gym_image_url: data?.plan?.gym?.image_url ?? null,
      };

      setRow(out);
    })();

    return () => {
      on = false;
    };
  }, [workoutId]);

  // 🔹 Laddningsvy med a11y
  if (row === undefined) {
    return (
      <View
        style={[styles.center, { backgroundColor: theme.colors.bg }]}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t(
          'feed.detail.loading',
          'Laddar träningspass'
        )}
      >
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  // 🔹 Fel / ej hittad-vy med tillgänglig back-knapp
  if (row === null) {
    return (
      <View
        style={[styles.center, { backgroundColor: theme.colors.bg, padding: 24 }]}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={t(
          'feed.detail.notFound.a11y',
          'Träningspasset kunde inte hittas'
        )}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 16,
            fontWeight: '600',
            textAlign: 'center',
          }}
        >
          {t('feed.detail.notFound', 'Hittade inte passet.')}
        </Text>

        <AccessiblePressable
          onPress={() => router.back()}
          style={[styles.backButton, { borderColor: theme.colors.border }]}
          accessibilityLabel={t('common.back', 'Tillbaka')}
          accessibilityHint={t(
            'feed.detail.back.hint',
            'Gå tillbaka till föregående vy'
          )}
        >
          <Text
            style={{
              color: theme.colors.primary,
              fontWeight: '700',
              fontSize: 15,
            }}
          >
            {t('common.back', 'Tillbaka')}
          </Text>
        </AccessiblePressable>
      </View>
    );
  }

  const gymName = row.plan?.gym?.name ?? row.gym_name ?? null;
  const gymImageUrl = row.plan?.gym?.image_url ?? row.gym_image_url ?? null;

  return (
    <View
      style={{
        flex: 1,
        padding: 16,
        backgroundColor: theme.colors.bg,
      }}
    >
      <WorkoutSummaryCard
        gymName={gymName}
        gymImageUrl={gymImageUrl}
        dateISO={row.started_at}
        exercises={row.plan?.exercises ?? []}
        method={row.plan?.method as any}
        rating={row.rating ?? undefined}
        userAlias={row.user_alias ?? '@användare'}
      // (valfritt) extra label för VoiceOver om du vill:
      // accessibilityLabel={t('feed.detail.card.a11y', 'Detaljer för träningspass')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    minWidth: 120,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});