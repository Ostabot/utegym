import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import ConfettiCannon from 'react-native-confetti-cannon';
import { supabase } from '@/lib/supabase';
import { useWorkoutWizard } from 'src/contexts/workout-wizard-context';
import { useAppTheme } from 'src/ui/useAppTheme';
import { useTranslation } from 'react-i18next';

const PLACEHOLDER = require('../../../assets/gym-placeholder.jpg');

export default function CompleteScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const { gym } = useWorkoutWizard();

  const [rating, setRating] = useState<number | null>(null);
  const confetti = useRef<ConfettiCannon | null>(null);

  async function onSkipOrContinue() {
    router.push('/(tabs)/(train)/share');
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
      <Stack.Screen
        options={{
          title: t('complete.title', 'Snyggt jobbat!'),
          headerBackTitle: t('common.back', 'Tillbaka'),
          headerStyle: { backgroundColor: theme.colors.header },
          headerTintColor: theme.colors.headerText,
          headerTitleStyle: { color: theme.colors.headerText, fontWeight: '700' },
        }}
      />

      {/* Confetti - göms från skärmläsare */}
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <ConfettiCannon ref={confetti as any} count={120} origin={{ x: 0, y: 0 }} fadeOut />
      </View>

      {/* Gym-bild */}
      <Image
        source={gym?.image_url ? { uri: gym.image_url } : PLACEHOLDER}
        style={[styles.cover, { backgroundColor: theme.colors.border }]}
        resizeMode="cover"
        accessibilityLabel={
          gym?.name
            ? t('complete.imageLabelGym', { defaultValue: `Bild från ${gym.name}` })
            : t('complete.imageLabelDefault', 'Bild på utegym')
        }
      />

      <View style={{ padding: 16 }}>
        <Text
          style={[styles.congrats, { color: theme.colors.text }]}
          accessibilityRole="header"
        >
          {t('complete.congrats', 'Snyggt jobbat!')}
        </Text>

        {gym?.name ? (
          <Text
            style={{ color: theme.colors.subtext, marginTop: 2 }}
            accessibilityLabel={t('complete.gymName', { defaultValue: `Gym: ${gym.name}` })}
          >
            {gym.name}
          </Text>
        ) : null}

        <Text style={[styles.rateLabel, { color: theme.colors.text }]}>
          {t('complete.ratePrompt', 'Betygsätt ditt träningspass')}
        </Text>

        <Stars value={rating} onChange={setRating} />

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <Pressable
            style={[
              styles.secondary,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
            ]}
            onPress={onSkipOrContinue}
            accessibilityRole="button"
            accessibilityLabel={t('complete.skip', 'Skippa')}
            accessibilityHint={t('complete.skipHint', 'Fortsätt utan betyg')}
          >
            <Text style={[styles.secondaryText, { color: theme.colors.text }]}>
              {t('complete.skip', 'Skippa')}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.primary, { backgroundColor: theme.colors.primary }]}
            onPress={onSkipOrContinue}
            accessibilityRole="button"
            accessibilityLabel={t('complete.continue', 'Fortsätt')}
            accessibilityHint={t('complete.continueHint', 'Gå vidare till nästa steg')}
          >
            <Text style={[styles.primaryText, { color: theme.colors.primaryText }]}>
              {t('complete.continue', 'Fortsätt')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/* Improved Stars component */
function Stars({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const active = value != null && i < value;
        const starNum = i + 1;

        return (
          <Pressable
            key={i}
            onPress={() => onChange(starNum)}
            style={{ padding: 6 }}
            accessibilityRole="button"
            accessibilityLabel={`${active ? 'Vald' : 'Ej vald'
              }, ${starNum} av 5 stjärnor`}
            accessibilityHint="Tryck för att ändra ditt betyg"
          >
            <Text style={{ fontSize: 28 }}>{active ? '⭐️' : '☆'}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  cover: { width: '100%', height: 180 },
  congrats: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  rateLabel: { fontWeight: '700', marginTop: 16 },
  primary: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  primaryText: { fontWeight: '700' },
  secondary: { borderWidth: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  secondaryText: { fontWeight: '700' },
});