// src/components/WorkoutSummaryCard.tsx
import React from 'react';
import { View, Text, Image } from 'react-native';
import Card from 'src/ui/Card';
import Chip from 'src/ui/Chip';
import { useAppTheme } from 'src/ui/useAppTheme';
import { useTranslation } from 'react-i18next';
import type { Focus, Intensity } from 'src/lib/workout';

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

type MethodLike = {
  focus?: Focus | null;
  intensity?: Intensity | null;
  duration?: number | string | null;
  name_sv?: string | null;
  name?: string | null;
};

export type WorkoutSummaryCardProps = {
  gymName?: string | null;
  gymImageUrl?: string | null;
  dateISO: string;
  exercises: PlanExercise[];
  method?: MethodLike | null;
  rating?: number | null;
  userAlias?: string | null;
};

function fmtDateYYYY_MÅN_DD(d: Date) {
  const months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAJ',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OKT',
    'NOV',
    'DEC',
  ];
  return `${d.getFullYear()}-${months[d.getMonth()]}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function allEqual<T>(arr: T[]) {
  return arr.length > 0 && arr.every((v) => v === arr[0]);
}
function formatSetsReps(sets: number, reps?: number[] | null) {
  if (!reps?.length) return `${sets} set`;
  if (allEqual(reps)) return `${sets} set × ${reps[0]} reps`;
  return `${sets} set × ${reps.join('/')}`;
}

function StarRow({ value, color }: { value?: number | null; color: string }) {
  const v = Number.isFinite(value as number)
    ? Math.max(0, Math.min(5, Math.round(value as number)))
    : 0;
  const starsOn = '★★★★★'.slice(0, v);
  const starsOff = '★★★★★'.slice(v);
  return (
    <Text style={{ color, fontSize: 12, letterSpacing: 1 }}>
      {starsOn}
      <Text style={{ color: '#cbd5e1' }}>{starsOff}</Text>
    </Text>
  );
}

export default function WorkoutSummaryCard({
  gymName,
  gymImageUrl,
  dateISO,
  exercises,
  method,
  rating,
  userAlias,
}: WorkoutSummaryCardProps) {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const d = new Date(dateISO);

  const gap = theme.spacing.xs;
  const pad = theme.spacing.md;
  const isEn = i18n.language?.startsWith('en');

  // Lokaliserade labels för fokus/intensitet
  const focusKey = method?.focus ?? undefined;
  const intensityKey = method?.intensity ?? undefined;

  const focusLabel = focusKey
    ? t(`workout.focus.${focusKey}`, focusKey)
    : null;

  const intensityLabel = intensityKey
    ? t(`workout.intensity.${intensityKey}`, intensityKey)
    : null;

  const durationLabel =
    method?.duration != null
      ? `${method.duration} ${t('common.min', 'min')}`
      : null;

  const titleText = gymName
    ? t('feed.card.workoutAt', 'Träningspass på {{gym}}', { gym: gymName })
    : t('feed.card.workout', 'Träningspass');

  const gymImageA11yLabel = gymName
    ? t('feed.card.gymImageLabel', 'Bild för {{gym}}', { gym: gymName })
    : t('feed.card.gymImageGeneric', 'Bild för utegym');

  return (
    <Card
      style={{
        padding: pad,
        gap,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.card,
      }}
    >
      {/* Header-bild + namn */}
      <View style={{ alignItems: 'center', gap: theme.spacing.xs }}>
        <Image
          source={
            gymImageUrl
              ? { uri: gymImageUrl }
              : require('@/assets/gym-placeholder.png')
          }
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.bg,
          }}
          accessibilityRole="image"
          accessibilityLabel={gymImageA11yLabel}
          accessibilityIgnoresInvertColors
        />
        <Text style={{ fontWeight: '700', color: theme.colors.text }}>
          {gymName ?? t('gym.unknown', 'Valfritt utegym')}
        </Text>
      </View>

      {/* Titel + datum */}
      <Text
        style={{
          marginTop: theme.spacing.xs,
          fontSize: 18,
          fontWeight: '800',
          color: theme.colors.text,
        }}
      >
        {titleText}
      </Text>
      <Text
        style={{
          color: theme.colors.subtext,
          fontSize: 12,
          marginBottom: 2,
        }}
      >
        {fmtDateYYYY_MÅN_DD(d)}
      </Text>

      {/* Övningslista */}
      <View style={{ gap: 6, marginTop: 10 }}>
        {exercises.map((ex) => {
          const name = isEn
            ? ex.name ?? ex.name_sv ?? ex.key
            : ex.name_sv ?? ex.name ?? ex.key;
          const sr = formatSetsReps(
            ex.prescription.sets,
            ex.prescription.reps ?? null,
          );
          return (
            <Text key={ex.key} style={{ color: theme.colors.text }}>
              <Text style={{ fontWeight: '700' }}>{name}</Text>
              <Text> : {sr}</Text>
            </Text>
          );
        })}
      </View>

      {/* Chippar */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 6,
          marginTop: 8,
        }}
      >
        {focusLabel ? <Chip>{focusLabel}</Chip> : null}
        {intensityLabel ? <Chip>{intensityLabel}</Chip> : null}
        {durationLabel ? <Chip>{durationLabel}</Chip> : null}
      </View>

      {/* Footer: betyg + alias */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <StarRow value={rating ?? null} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>
            {Number.isFinite(rating as number)
              ? `${rating}/5`
              : t('feed.card.unrated', 'Ej betygsatt')}
          </Text>
        </View>
        <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>
          {userAlias ?? '@användare'}
        </Text>
      </View>
    </Card>
  );
}