// app/(tabs)/(profile)/settings.tsx
import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/contexts/session-context';
import { useAppTheme } from '@/ui/useAppTheme';
import { useRouter } from 'expo-router';
import { queryClient } from '@/lib/queryClient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { setAppLanguage, i18n } from '@/lib/i18n';
import AccessiblePressable from '@/ui/AccessiblePressable';

const LANG_KEY = 'utegym.lang';
const INTENSITY_KEY = 'utegym.default-intensity';

// --- helpers for alias ---
function normalizeAlias(input: string) {
  return (input ?? '').trim().replace(/^@+/, '').toLowerCase();
}
function validateAlias(clean: string, t: (k: string, def?: string) => string) {
  if (clean.length < 2 || clean.length > 30) {
    return t('settings.alias.errors.length', 'Alias måste vara 2–30 tecken');
  }
  if (!/^[a-z0-9_]+$/.test(clean)) {
    return t('settings.alias.errors.charset', 'Endast a–z, 0–9 och _ är tillåtet');
  }
  return null;
}

export default function ProfileSettingsScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const { user } = useSession();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // state
  const [alias, setAlias] = useState<string>('');
  const [intensity, setIntensity] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [lang, setLang] = useState<'sv' | 'en'>(i18n.language?.startsWith('sv') ? 'sv' : 'en');

  const pills: Array<{ key: 'easy' | 'medium' | 'hard'; label: string }> = [
    { key: 'easy', label: t('settings.intensity.easy', 'Lugn') },
    { key: 'medium', label: t('settings.intensity.medium', 'Lagom') },
    { key: 'hard', label: t('settings.intensity.hard', 'Tuff') },
  ];

  useEffect(() => {
    // init alias + intensity
    setAlias((user?.user_metadata as any)?.alias ?? '');
    AsyncStorage.getItem(INTENSITY_KEY).then((stored) => {
      if (stored === 'easy' || stored === 'medium' || stored === 'hard') setIntensity(stored);
    });
    // init language from storage (overrides i18n default if present)
    AsyncStorage.getItem(LANG_KEY).then((v) => {
      if (v === 'en' || v === 'sv') setLang(v);
    });
  }, [user?.id]);

  // language toggle handler (separate from save)
  const handleChangeLang = useCallback(async (next: 'sv' | 'en') => {
    setLang(next);
    await setAppLanguage(next); // ändrar i18n + sparar i AsyncStorage
    // Om du har serversträngar -> gör en bred refetch
    // await queryClient.invalidateQueries();
  }, []);

  async function save() {
    const cleanAlias = normalizeAlias(alias);
    const err = validateAlias(cleanAlias, t);
    if (err) {
      Toast.show({ type: 'error', text1: err });
      return;
    }

    try {
      if (user?.id) {
        // 1) sätt alias i DB via RPC (validering/unikhet på serversidan)
        const { error: aliasErr } = await supabase.rpc('set_alias', { p_alias: cleanAlias });
        if (aliasErr) throw aliasErr;

        // 2) spegla i user_metadata för enkel klientåtkomst
        const { error: metaErr } = await supabase.auth.updateUser({
          data: { alias: cleanAlias, preferred_locale: lang },
        });
        if (metaErr) throw metaErr;

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['workout_sessions_base'] }),
          queryClient.invalidateQueries({ queryKey: ['profile_stats'] }),
          queryClient.invalidateQueries({ queryKey: ['recent_workouts'] }),
        ]);
      }

      await AsyncStorage.setItem(INTENSITY_KEY, intensity);
      await AsyncStorage.setItem(LANG_KEY, lang);
      setAlias(cleanAlias);

      Toast.show({ type: 'success', text1: t('settings.toasts.saved', 'Inställningar sparade') });
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      const taken =
        msg.includes('duplicate key') ||
        msg.includes('already exists') ||
        msg.includes('23505') ||
        msg.toLowerCase().includes('unique');

      Toast.show({
        type: 'error',
        text1: taken
          ? t('settings.alias.errors.taken.title', 'Alias upptaget')
          : t('settings.toasts.couldNotSave', 'Kunde inte spara'),
        text2: taken ? cleanAlias : msg,
      });
    }
  }

  const deleteMyAccount = useCallback(() => {
    Alert.alert(
      t('account.delete.title', 'Radera konto'),
      t(
        'account.delete.body',
        'Detta tar bort ditt konto och alla träningspass. Åtgärden kan inte ångras.'
      ),
      [
        { text: t('common.cancel', 'Avbryt'), style: 'cancel' },
        {
          text: t('common.delete', 'Radera'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { data } = await supabase.auth.getSession();
              const token = data.session?.access_token ?? '';
              const fnUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`;
              const res = await fetch(fnUrl, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
              if (!res.ok) throw new Error(await res.text());
              Toast.show({ type: 'success', text1: t('settings.toasts.deletedOk', 'Konto raderat') });
            } catch (e: any) {
              Toast.show({
                type: 'error',
                text1: t('settings.toasts.couldNotDelete', 'Kunde inte radera'),
                text2: String(e?.message ?? e),
              });
            }
          },
        },
      ]
    );
  }, [t]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{
        padding: 20,
        gap: 16,
        paddingBottom: 24 + insets.bottom,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Alias */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('settings.alias.title', 'Alias')}
        </Text>
        <View
          style={[
            styles.inputWrap,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.bg,
            },
          ]}
        >
          <TextInput
            placeholder={t('settings.alias.placeholder', 't.ex. @styrkeLisa')}
            placeholderTextColor={theme.colors.subtext}
            value={alias}
            onChangeText={setAlias}
            autoCapitalize="none"
            style={[styles.input, { color: theme.colors.text }]}
            returnKeyType="done"
            accessibilityLabel={t(
              'settings.alias.accessibility.label',
              'Alias för din profil'
            )}
            accessibilityHint={t(
              'settings.alias.accessibility.hint',
              'Ange ett alias som kan visas i appen, till exempel när du delar pass.'
            )}
          />
        </View>
      </View>

      {/* Standardintensitet */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('settings.intensity.title', 'Standardintensitet')}
        </Text>
        <Text
          style={{
            color: theme.colors.subtext,
            fontSize: 13,
            marginBottom: 4,
          }}
        >
          {t(
            'settings.intensity.description',
            'Används som förval när du startar ett nytt pass i träningsguiden.'
          )}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {pills.map((p) => {
            const active = intensity === p.key;
            return (
              <AccessiblePressable
                key={p.key}
                onPress={() => setIntensity(p.key)}
                style={[
                  styles.pill,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                    minHeight: 44,
                    justifyContent: 'center',
                  },
                  active && { backgroundColor: theme.colors.primary },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t(
                  'settings.intensity.accessibility.label',
                  'Standardintensitet: {{label}}',
                  { label: p.label }
                )}
                accessibilityState={{ selected: active }}
                accessibilityHint={t(
                  'settings.intensity.accessibility.hint',
                  'Sätter den här nivån som förvald intensitet när du startar nya pass.'
                )}
              >
                <Text
                  style={{
                    color: active ? theme.colors.primaryText : theme.colors.text,
                    fontWeight: '700',
                  }}
                >
                  {p.label}
                </Text>
              </AccessiblePressable>
            );
          })}
        </View>
      </View>

      {/* Språk */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('settings.language.title', 'Språk')}
        </Text>
        <Text
          style={{
            color: theme.colors.subtext,
            fontSize: 13,
            marginBottom: 4,
          }}
        >
          {t(
            'settings.language.description',
            'Välj vilket språk appens gränssnitt ska visas på.'
          )}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['sv', 'en'] as const).map((code) => {
            const active = lang === code;
            const label = code === 'sv' ? 'Svenska' : 'English';
            return (
              <AccessiblePressable
                key={code}
                onPress={() => handleChangeLang(code)}
                style={[
                  styles.pill,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                    minHeight: 44,
                    justifyContent: 'center',
                  },
                  active && { backgroundColor: theme.colors.primary },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t(
                  'settings.language.accessibility.label',
                  'Språk: {{label}}',
                  { label }
                )}
                accessibilityState={{ selected: active }}
                accessibilityHint={t(
                  'settings.language.accessibility.hint',
                  'Byter språk i appens menyer och texter.'
                )}
              >
                <Text
                  style={{
                    color: active ? theme.colors.primaryText : theme.colors.text,
                    fontWeight: '700',
                  }}
                >
                  {label}
                </Text>
              </AccessiblePressable>
            );
          })}
        </View>
      </View>

      {/* Spara-knapp */}
      <AccessiblePressable
        style={[
          styles.primaryButton,
          { backgroundColor: theme.colors.primary, minHeight: 44 },
        ]}
        onPress={save}
        accessibilityRole="button"
        accessibilityLabel={t('common.save', 'Spara inställningar')}
        accessibilityHint={t(
          'settings.save.hint',
          'Sparar alias, standardintensitet och språk för din profil.'
        )}
      >
        <Text style={[styles.primaryText, { color: theme.colors.primaryText }]}>
          {t('common.save', 'Spara')}
        </Text>
      </AccessiblePressable>

      {/* Länkar */}
      <View style={{ height: 12 }} />

      <AccessiblePressable
        style={[
          styles.linkBtn,
          { borderColor: theme.colors.border, minHeight: 44, justifyContent: 'center' },
        ]}
        onPress={() => router.push('/(tabs)/(profile)/about-attributions')}
        accessibilityRole="button"
        accessibilityLabel={t(
          'settings.links.attrib',
          'Attributioner och licenser'
        )}
        accessibilityHint={t(
          'settings.links.attrib.hint',
          'Öppnar en sida med information om datakällor och licenser.'
        )}
      >
        <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
          {t('settings.links.attrib', 'Attributioner & licenser')}
        </Text>
      </AccessiblePressable>

      <AccessiblePressable
        style={[
          styles.linkBtn,
          { borderColor: theme.colors.border, minHeight: 44, justifyContent: 'center' },
        ]}
        onPress={() => router.push('/(tabs)/(profile)/about-oss-licenses')}
        accessibilityRole="button"
        accessibilityLabel={t(
          'settings.links.oss',
          'Öppen källkod och beroenden'
        )}
        accessibilityHint={t(
          'settings.links.oss.hint',
          'Visar lista över tredjepartsbibliotek och licenser.'
        )}
      >
        <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
          {t('settings.links.oss', 'Öppen källkod (beroenden)')}
        </Text>
      </AccessiblePressable>

      <AccessiblePressable
        style={[
          styles.linkBtn,
          { borderColor: theme.colors.border, minHeight: 44, justifyContent: 'center' },
        ]}
        onPress={() => router.push('/(tabs)/(profile)/about-map-attributions')}
        accessibilityRole="button"
        accessibilityLabel={t(
          'settings.links.map',
          'Kart-attributioner'
        )}
        accessibilityHint={t(
          'settings.links.map.hint',
          'Öppnar en sida med attributioner för Mapbox, OpenStreetMap och kommundata.'
        )}
      >
        <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
          {t('settings.links.map', 'Kart-attributioner')}
        </Text>
      </AccessiblePressable>

      <AccessiblePressable
        style={[
          styles.linkBtn,
          { borderColor: theme.colors.border, minHeight: 44, justifyContent: 'center' },
        ]}
        onPress={() => router.push('/(tabs)/(profile)/about-privacy')}
        accessibilityRole="button"
        accessibilityLabel={t(
          'settings.links.privacy',
          'Integritetspolicy'
        )}
        accessibilityHint={t(
          'settings.links.privacy.hint',
          'Visar hur vi hanterar dina personuppgifter och träningsdata.'
        )}
      >
        <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
          {t('settings.links.privacy', 'Integritetspolicy')}
        </Text>
      </AccessiblePressable>

      <AccessiblePressable
        style={[
          styles.linkBtn,
          { borderColor: theme.colors.border, minHeight: 44, justifyContent: 'center' },
        ]}
        onPress={() => router.push('/(tabs)/(profile)/about-terms')}
        accessibilityRole="button"
        accessibilityLabel={t(
          'settings.links.terms',
          'Användarvillkor'
        )}
        accessibilityHint={t(
          'settings.links.terms.hint',
          'Visar villkoren för att använda Utegym-appen.'
        )}
      >
        <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
          {t('settings.links.terms', 'Användarvillkor')}
        </Text>
      </AccessiblePressable>

      <AccessiblePressable
        style={[
          styles.linkBtn,
          { borderColor: theme.colors.border, minHeight: 44, justifyContent: 'center' },
        ]}
        onPress={deleteMyAccount}
        accessibilityRole="button"
        accessibilityLabel={t(
          'settings.links.deleteAccount',
          'Radera mitt konto'
        )}
        accessibilityHint={t(
          'settings.links.deleteAccount.hint',
          'Öppnar en bekräftelseruta för att radera ditt konto och all träningsdata.'
        )}
      >
        <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
          {t('settings.links.deleteAccount', 'Radera mitt konto')}
        </Text>
      </AccessiblePressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  title: { fontSize: 20, fontWeight: '800' },
  inputWrap: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  input: { paddingVertical: 10 },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryText: { fontWeight: '800' },
  linkBtn: {
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
});