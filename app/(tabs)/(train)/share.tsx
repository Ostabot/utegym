//app/(tabs)/(train)/share.tsx
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Share,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import { useWorkoutWizard } from 'src/contexts/workout-wizard-context';
import { useAppTheme } from 'src/ui/useAppTheme';
import { useTranslation } from 'react-i18next';

const PLACEHOLDER = require('../../../assets/gym-placeholder.jpg');

export default function ShareWorkoutScreen() {
  const { gym } = useWorkoutWizard();
  const theme = useAppTheme();
  const { t } = useTranslation();

  const [picked, setPicked] = useState<string | null>(null);

  const img = picked
    ? { uri: picked }
    : gym?.image_url
      ? { uri: gym.image_url }
      : PLACEHOLDER;

  async function onPick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        t('train.share.permsTitle'),
        t('train.share.permsBody')
      );
      return;
    }

    const res = await launchImageLibraryAsync({
      mediaTypes: [ImagePicker.MediaType.image],
      allowsEditing: true,
      quality: 0.8,
      selectionLimit: 1,
    });

    if (!r.canceled && r.assets?.[0]?.uri) {
      setPicked(r.assets[0].uri);
    }
  }

  async function onShare() {
    try {
      await Share.share({
        message: t('train.share.message'),
      });
    } catch {
      Alert.alert(t('common.error', 'Ett fel inträffade'));
    }
  }

  function onContinue() {
    // router.replace('/(tabs)/feed');
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
      <Stack.Screen
        options={{
          title: t('train.share.title'),
          headerStyle: { backgroundColor: theme.colors.header },
          headerTintColor: theme.colors.headerText,
          headerTitleStyle: { color: theme.colors.headerText, fontWeight: '700' },
        }}
      />

      <Image
        source={img}
        style={[styles.cover, { backgroundColor: theme.colors.border }]}
        resizeMode="cover"
        accessible={false}
      />

      <View style={{ padding: 16, gap: 12 }}>
        {/* Upload image */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('train.share.upload')}
          accessibilityHint={t('train.share.upload')}
          android_ripple={{ color: theme.colors.primary }}
          onPress={onPick}
          style={({ pressed }) => [
            styles.secondary,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <Text style={[styles.secondaryText, { color: theme.colors.text }]}>
            {t('train.share.upload')}
          </Text>
        </Pressable>

        {/* Share workout */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('train.share.challenge')}
          accessibilityHint={t('train.share.challenge')}
          android_ripple={{ color: theme.colors.primary }}
          onPress={onShare}
          style={({ pressed }) => [
            styles.secondary,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <Text style={[styles.secondaryText, { color: theme.colors.text }]}>
            {t('train.share.challenge')}
          </Text>
        </Pressable>

        {/* Continue */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('train.share.continue')}
          accessibilityHint={t('train.share.continue')}
          android_ripple={{ color: theme.colors.primaryText }}
          onPress={onContinue}
          style={({ pressed }) => [
            styles.primary,
            {
              backgroundColor: theme.colors.primary,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <Text style={[styles.primaryText, { color: theme.colors.primaryText }]}>
            {t('train.share.continue')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  cover: { width: '100%', height: 220 },

  primary: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: {
    fontWeight: '700',
    fontSize: 16,
  },

  secondary: {
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryText: {
    fontWeight: '700',
    fontSize: 15,
  },
});