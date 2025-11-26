// app/(tabs)/(profile)/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';
import { useSession } from 'src/contexts/session-context';
import { getPendingWorkouts } from 'src/lib/workout-sync';
import { useAppTheme } from 'src/ui/useAppTheme';
import { useTranslation } from 'react-i18next';
import AccessiblePressable from 'src/ui/AccessiblePressable';

const REDIRECT_TO = 'utegym://auth/callback';

type EmailForm = { email: string };

type StatsDto = {
  total_workouts?: number | null;
  total_time_minutes?: number | null;
  favorite_gym_name?: string | null;
  current_streak?: number | null;
};

type RecentItemDto = { id: string; title: string; gym_name: string | null; when: string };
type RoutineDto = { id: string; title: string; thumbnail_url: string | null };

export default function Profile() {
  const tTheme = useAppTheme();
  const { t: T } = useTranslation();
  const router = useRouter();
  const { user } = useSession();
  const avatarUrl = (user?.user_metadata as any)?.avatar_url ?? null;

  const [pendingCount, setPendingCount] = useState(0);
  const [stats, setStats] = useState<StatsDto | null>(null);
  const [recent, setRecent] = useState<RecentItemDto[]>([]);
  const [routines, setRoutines] = useState<RoutineDto[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [errorState, setErrorState] = useState<{ message: string; isNetwork: boolean } | null>(
    null
  );

  const tz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Stockholm';
    } catch {
      return 'Europe/Stockholm';
    }
  }, []);

  useEffect(() => {
    getPendingWorkouts().then((items) => setPendingCount(items.length));
  }, []);

  // forms
  const emailSchema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .email(T('profile.login.errors.email', 'Ogiltig e-postadress')),
      }),
    [T]
  );
  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  // ---- Data loader ----
  const loadProfileData = useCallback(async () => {
    if (!user?.id) {
      setStats(null);
      setRecent([]);
      setRoutines([]);
      setErrorState(null);
      return;
    }

    setLoadingData(true);
    setErrorState(null);

    try {
      // 1) KRITISK DEL: stats (om detta failar visar vi bannern)
      let s: StatsDto | null = null;

      const { data: sData, error: sErr } = await supabase.rpc('api_profile_stats', {
        p_user: user.id,
        p_tz: tz,
      });

      if (sErr) {
        // kritiskt fel → visa banner
        throw sErr;
      }

      if (sData) {
        s = sData as StatsDto;
      }

      // Fallback om RPC saknas eller gav null-data
      if (!s) {
        const { data: q, error: qErr } = await supabase
          .from('workout_sessions')
          .select('started_at, finished_at, gym_id', { count: 'exact', head: false })
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .limit(200);

        if (qErr) {
          // detta är också kritiskt → visa banner
          throw qErr;
        }

        const total = q?.length ?? 0;
        const totalMin = (q ?? []).reduce((acc, r: any) => {
          if (r.finished_at && r.started_at) {
            acc +=
              (new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) /
              60000;
          }
          return acc;
        }, 0);

        s = {
          total_workouts: total,
          total_time_minutes: Math.floor(totalMin),
          favorite_gym_name: null,
          current_streak: null,
        };
      }

      // Hämta streak separat om den saknas (om RPC failar här loggar vi bara en warning)
      if (s && s.current_streak == null) {
        const { data: streakData, error: streakErr } = await supabase.rpc('api_current_streak', {
          p_user: user.id,
          p_tz: tz,
        });
        if (streakErr) {
          console.warn('api_current_streak error', streakErr);
        } else if (typeof streakData === 'number') {
          s.current_streak = streakData;
        }
      }

      setStats(s);

      // 2) ICKE-KRITISK: recent workouts
      try {
        const { data: rData, error: rErr } = await supabase.rpc('api_recent_workouts', {
          p_user: user.id,
          p_tz: tz,
          p_limit: 10,
        });

        if (rErr) {
          console.warn('api_recent_workouts error', rErr);
          setRecent([]);
        } else if (Array.isArray(rData)) {
          setRecent(
            rData.map((r: any) => ({
              id: String(r.id),
              title: String(
                r.title ?? T('profile.recent.defaultTitle', 'Träningspass')
              ),
              gym_name: r.gym_name ?? null,
              when: String(
                r.when_iso ??
                r.finished_at ??
                r.started_at ??
                new Date().toISOString()
              ),
            }))
          );
        } else {
          setRecent([]);
        }
      } catch (e) {
        console.warn('Recent workouts fetch failed', e);
        setRecent([]);
      }

      // 3) ICKE-KRITISK: routines
      try {
        const { data: mData, error: mErr } = await supabase.rpc('api_user_routines', {
          p_user: user.id,
        });

        if (mErr) {
          console.warn('api_user_routines error', mErr);
          setRoutines([]);
        } else if (Array.isArray(mData)) {
          setRoutines(
            mData.map((x: any) => ({
              id: String(x.id),
              title: String(
                x.title ?? T('profile.routines.defaultTitle', 'Min rutin')
              ),
              thumbnail_url: x.thumbnail_url ?? null,
            }))
          );
        } else {
          setRoutines([]);
        }
      } catch (e) {
        console.warn('User routines fetch failed', e);
        setRoutines([]);
      }
    } catch (e: any) {
      // ENDAST kritiska fel hamnar här
      const msg = String(e?.message ?? e ?? '');
      console.error('Profile loadProfileData critical error', e);
      const isNetwork = /network|offline|fetch|timeout/i.test(msg);
      setErrorState({ message: msg, isNetwork });
    } finally {
      setLoadingData(false);
    }
  }, [user?.id, tz, T]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData])
  );

  // ---- Auth actions ----
  async function sendMagicLink({ email }: EmailForm) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: REDIRECT_TO },
    });
    if (error) {
      Toast.show({
        type: 'error',
        text1: T('profile.login.magic.failed.title', 'Kunde inte skicka länk'),
        text2: T('profile.login.magic.failed.body', {
          msg: error.message,
        }),
      });
      return;
    }
    Toast.show({
      type: 'success',
      text1: T('profile.login.magic.sent', 'Inloggningslänk skickad'),
    });
  }

  // AVATAR UPLOAD
  async function pickAndUploadAvatar() {
    if (!user?.id) {
      Toast.show({
        type: 'error',
        text1: T('profile.errors.mustBeLoggedIn', 'Du måste vara inloggad.'),
      });
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Toast.show({
          type: 'error',
          text1: T(
            'profile.errors.photosPermission',
            'Appen behöver åtkomst till dina bilder för att byta avatar.'
          ),
        });
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (res.canceled || !res.assets?.[0]?.uri) return;

      const uri = res.assets[0].uri;
      const blob = await (await fetch(uri)).blob();
      const fileName = `avatars/${user!.id}.jpg`; // skriv över samma fil

      const { error: upErr } = await supabase.storage
        .from('avatar_photos')
        .upload(fileName, blob, {
          upsert: true,
          contentType: 'image/jpeg',
        });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from('avatar_photos').getPublicUrl(fileName);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error('No public URL.');

      const { error: metaErr } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      await supabase.auth.refreshSession(); // tvingar re-render
      if (metaErr) throw metaErr;

      Toast.show({
        type: 'success',
        text1: T('profile.avatar.updated', 'Profilbild uppdaterad'),
      });
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: T('profile.avatar.failed.title', 'Kunde inte uppdatera profilbild'),
        text2: T('profile.avatar.failed.body', {
          msg: String(e?.message ?? e),
        }),
      });
    }
  }

  async function signInWithGoogle() {
    try {
      Toast.show({
        type: 'info',
        text1: T('profile.login.google.opening', 'Öppnar Google-inloggning…'),
      });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: REDIRECT_TO, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (data?.url) await Linking.openURL(data.url);
      else throw new Error('No URL.');
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: T('profile.login.google.failed.title', 'Google-inloggning misslyckades'),
        text2: T('profile.login.google.failed.body', {
          msg: String(e?.message ?? e),
        }),
      });
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // ---- Helpers ----
  function minutesToHhMm(min?: number | null) {
    if (!min || min <= 0) return T('profile.stats.time.zero', '0 min');
    const h = Math.floor((min ?? 0) / 60);
    const m = (min ?? 0) % 60;
    return h > 0
      ? T('profile.stats.time.hhmm', { h, m })
      : T('profile.stats.time.mm', { m });
  }
  function relativeDay(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays =
      (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
        Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) /
      oneDay;
    const diff = Math.floor(diffDays);
    if (diff === 0) return T('profile.recent.when.today', 'Idag');
    if (diff === 1) return T('profile.recent.when.yesterday', 'Igår');
    return T('profile.recent.when.daysAgo', { n: diff });
  }

  // ---- UI ----
  const skeletonStats = [
    {
      label: T('profile.stats.totalWorkouts', 'Pass totalt'),
      value: '—',
      icon: 'barbell' as const,
    },
    {
      label: T('profile.stats.totalTime', 'Tid totalt'),
      value: '—',
      icon: 'time-outline' as const,
    },
    {
      label: T('profile.stats.favoriteGym', 'Favoritgym'),
      value: '—',
      icon: 'location-outline' as const,
    },
    {
      label: T('profile.stats.streak', 'Streak'),
      value: '—',
      icon: 'flame-outline' as const,
    },
  ];

  const statsView = (() => {
    const items = stats
      ? [
        {
          label: T('profile.stats.totalWorkouts', 'Pass totalt'),
          value: String(stats.total_workouts ?? 0),
          icon: 'barbell' as const,
        },
        {
          label: T('profile.stats.totalTime', 'Tid totalt'),
          value: minutesToHhMm(stats.total_time_minutes),
          icon: 'time-outline' as const,
        },
        {
          label: T('profile.stats.favoriteGym', 'Favoritgym'),
          value: stats.favorite_gym_name ?? '—',
          icon: 'location-outline' as const,
        },
        {
          label: T('profile.stats.streak', 'Streak'),
          value: T('profile.stats.streakDays', {
            n: stats.current_streak ?? 0,
          }),
          icon: 'flame-outline' as const,
        },
      ]
      : skeletonStats;

    return (
      <View style={styles.statsGrid}>
        {items.map((s, i) => (
          <View
            key={i}
            style={[
              styles.statCard,
              { backgroundColor: tTheme.colors.card, borderColor: tTheme.colors.border },
            ]}
            accessible
            accessibilityRole="summary"
            accessibilityLabel={s.label}
            accessibilityValue={{ text: s.value }}
          >
            <View
              style={[
                styles.statIconWrap,
                { backgroundColor: tTheme.colors.primary + '22' },
              ]}
              accessible={false}
            >
              <Ionicons name={s.icon} size={18} color={tTheme.colors.primary} />
            </View>
            <Text
              style={{
                color: tTheme.colors.subtext,
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              {s.label}
            </Text>
            <Text
              style={{
                color: tTheme.colors.primary,
                fontSize: 18,
                fontWeight: '800',
              }}
            >
              {s.value}
            </Text>
          </View>
        ))}
      </View>
    );
  })();

  const showErrorBanner = !!errorState && !!user;

  return (
    <ScrollView
      style={{ backgroundColor: tTheme.colors.bg }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: tTheme.colors.text }]}>
        {T('profile.title', 'Profil')}
      </Text>

      {/* Error / offline-banner för profilsidan */}
      {showErrorBanner ? (
        <View
          style={[
            styles.errorCard,
            { backgroundColor: tTheme.colors.card, borderColor: tTheme.colors.border },
          ]}
          accessible
          accessibilityRole="alert"
          accessibilityLabel={T('profile.error.title', 'Något gick fel')}
        >
          <Text style={[styles.errorTitle, { color: tTheme.colors.text }]}>
            {T('profile.error.title', 'Något gick fel')}
          </Text>
          <Text style={[styles.errorMessage, { color: tTheme.colors.subtext }]}>
            {errorState?.isNetwork
              ? T(
                'profile.error.network',
                'Vi kunde inte ladda din profil just nu. Kontrollera din internetuppkoppling och försök igen.'
              )
              : T(
                'profile.error.generic',
                'Vi kunde inte hämta all data just nu. Försök igen om en stund.'
              )}
          </Text>
          <AccessiblePressable
            onPress={loadProfileData}
            style={[styles.errorButton, { borderColor: tTheme.colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={T(
              'profile.error.retry',
              'Försök igen att ladda profildata'
            )}
            accessibilityHint={T(
              'profile.error.retryHint',
              'Försöker ladda om statistik och senaste aktivitet.'
            )}
          >
            <Text style={{ color: tTheme.colors.text, fontWeight: '700' }}>
              {T('profile.error.retry', 'Försök igen')}
            </Text>
          </AccessiblePressable>
        </View>
      ) : null}

      {user ? (
        <View
          style={[
            styles.card,
            { backgroundColor: tTheme.colors.card, borderColor: tTheme.colors.border },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <AccessiblePressable
              onPress={pickAndUploadAvatar}
              accessibilityRole="button"
              accessibilityLabel={T(
                'profile.avatar.buttonLabel',
                'Byt profilbild'
              )}
              accessibilityHint={T(
                'profile.avatar.buttonHint',
                'Öppnar ditt bildbibliotek så att du kan välja en ny profilbild.'
              )}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: tTheme.colors.border,
                      borderColor: tTheme.colors.border,
                    },
                  ]}
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: tTheme.colors.border,
                      borderColor: tTheme.colors.border,
                    },
                  ]}
                >
                  <Ionicons name="person" size={24} color={tTheme.colors.subtext} />
                </View>
              )}
            </AccessiblePressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: tTheme.colors.text }]}>
                {user.email}
              </Text>
              <Text style={[styles.cardSubtitle, { color: tTheme.colors.subtext }]}>
                {T('profile.aliasLabel', {
                  alias:
                    (user.user_metadata as { alias?: string } | undefined)?.alias ??
                    '—',
                })}
              </Text>
            </View>
          </View>

          <Text style={{ color: tTheme.colors.text }}>
            {T('profile.pendingToSync', {
              defaultValue: 'Offline-loggade pass att synka: {{n}}',
              n: pendingCount,
            })}
          </Text>

          <AccessiblePressable
            style={[
              styles.primaryButton,
              { backgroundColor: tTheme.colors.primary, minHeight: 44 },
            ]}
            onPress={() => router.push('/(tabs)/(profile)/settings')}
            accessibilityRole="button"
            accessibilityLabel={T(
              'profile.actions.settings',
              'Öppna profilinställningar'
            )}
            accessibilityHint={T(
              'profile.actions.settingsHint',
              'Öppnar sidan där du kan ändra alias, språk och andra inställningar.'
            )}
          >
            <Text
              style={[styles.primaryText, { color: tTheme.colors.primaryText }]}
            >
              {T('profile.actions.settings', 'Inställningar')}
            </Text>
          </AccessiblePressable>

          <AccessiblePressable
            style={[
              styles.secondaryButton,
              {
                borderColor: tTheme.colors.primary,
                backgroundColor: 'transparent',
                minHeight: 44,
              },
            ]}
            onPress={signOut}
            accessibilityRole="button"
            accessibilityLabel={T('profile.actions.signOut', 'Logga ut')}
            accessibilityHint={T(
              'profile.actions.signOutHint',
              'Loggar ut dig från Utegym-appen.'
            )}
          >
            <Text style={[styles.secondaryText, { color: tTheme.colors.primary }]}>
              {T('profile.actions.signOut', 'Logga ut')}
            </Text>
          </AccessiblePressable>
        </View>
      ) : (
        <View
          style={[
            styles.card,
            { backgroundColor: tTheme.colors.card, borderColor: tTheme.colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: tTheme.colors.text }]}>
            {T('profile.login.title', 'Logga in eller skapa konto')}
          </Text>

          <View
            style={[
              styles.inputWrap,
              {
                borderColor: tTheme.colors.border,
                backgroundColor: tTheme.colors.bg,
              },
            ]}
          >
            <Ionicons name="mail-outline" color={tTheme.colors.subtext} size={18} />
            <TextInput
              placeholder={T(
                'profile.login.emailPlaceholder',
                'din@emailadress.se'
              )}
              placeholderTextColor={tTheme.colors.subtext}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="send"
              style={[styles.input, { color: tTheme.colors.text }]}
              onChangeText={(text) => emailForm.setValue('email', text)}
              accessibilityLabel={T(
                'profile.login.emailLabel',
                'E-postadress för inloggning'
              )}
              accessibilityHint={T(
                'profile.login.emailHint',
                'Ange den e-postadress dit vi ska skicka din inloggningslänk.'
              )}
            />
          </View>
          {emailForm.formState.errors.email ? (
            <Text style={[styles.errorText, { color: tTheme.colors.error }]}>
              {emailForm.formState.errors.email.message}
            </Text>
          ) : null}

          <AccessiblePressable
            style={[
              styles.primaryButton,
              { backgroundColor: tTheme.colors.primary, minHeight: 44 },
            ]}
            onPress={emailForm.handleSubmit(sendMagicLink)}
            accessibilityRole="button"
            accessibilityLabel={T(
              'profile.login.sendMagicLink',
              'Skicka inloggningslänk via e-post'
            )}
            accessibilityHint={T(
              'profile.login.sendMagicLinkHint',
              'Skickar en magisk inloggningslänk till den e-postadress du har fyllt i.'
            )}
          >
            <Text
              style={[styles.primaryText, { color: tTheme.colors.primaryText }]}
            >
              {T('profile.login.sendMagicLink', 'Skicka magisk länk')}
            </Text>
          </AccessiblePressable>

          <AccessiblePressable
            hitSlop={8}
            style={[
              styles.oauthButton,
              {
                borderColor: tTheme.colors.border,
                backgroundColor: tTheme.colors.card,
                minHeight: 44,
              },
            ]}
            onPress={signInWithGoogle}
            accessibilityRole="button"
            accessibilityLabel={T(
              'profile.login.signInWithGoogle',
              'Logga in med Google'
            )}
            accessibilityHint={T(
              'profile.login.signInWithGoogleHint',
              'Öppnar Google för att logga in på Utegym-appen.'
            )}
          >
            <Ionicons
              name="logo-google"
              size={18}
              color={tTheme.colors.text}
            />
            <Text style={[styles.oauthText, { color: tTheme.colors.text }]}>
              {T('profile.login.signInWithGoogle', 'Logga in med Google')}
            </Text>
          </AccessiblePressable>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: tTheme.colors.text }]}>
        {T('profile.sections.stats', 'Din statistik')}
      </Text>
      {statsView}

      {/* Senaste aktivitet */}
      <Text
        style={[
          styles.sectionTitle,
          { color: tTheme.colors.text, marginTop: 8 },
        ]}
      >
        {T('profile.sections.recent', 'Senaste aktivitet')}
      </Text>
      <View style={{ gap: 8 }}>
        {recent.map((r) => (
          <View
            key={r.id}
            style={[
              styles.activityRow,
              {
                backgroundColor: tTheme.colors.card,
                borderColor: tTheme.colors.border,
              },
            ]}
            accessible
            accessibilityLabel={T(
              'profile.recent.row.label',
              'Träningspass {{title}} på {{gym}}',
              {
                title: r.title,
                gym: r.gym_name ?? T('profile.recent.unknownGym', 'okänt gym'),
              }
            )}
          >
            <View
              style={[
                styles.activityIcon,
                { backgroundColor: tTheme.colors.primary + '22' },
              ]}
            >
              <Ionicons
                name="fitness-outline"
                size={20}
                color={tTheme.colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: tTheme.colors.text,
                  fontWeight: '700',
                }}
              >
                {r.title}
              </Text>
              <Text style={{ color: tTheme.colors.subtext, fontSize: 12 }}>
                {r.gym_name ? `${r.gym_name} • ` : ''}
                {relativeDay(r.when)}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={tTheme.colors.subtext}
            />
          </View>
        ))}

        {!loadingData && user && recent.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={[styles.emptyTitle, { color: tTheme.colors.text }]}>
              {T('profile.recent.empty.title', 'Inga pass ännu')}
            </Text>
            <Text style={[styles.emptyText, { color: tTheme.colors.subtext }]}>
              {T(
                'profile.recent.empty.body',
                'När du loggar ditt första pass visas din senaste aktivitet här.'
              )}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Rutiner – fortfarande kommenterat tills ni aktiverar funktionen */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800' },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  cardSubtitle: { fontWeight: '500' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: { flex: 1, paddingVertical: 10 },
  primaryButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: { fontWeight: '700' },
  secondaryButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  secondaryText: { fontWeight: '700' },
  oauthButton: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  oauthText: { fontWeight: '700' },
  errorText: { fontWeight: '600' },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    gap: 6,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineCard: {
    width: 160,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    gap: 8,
  },
  routineThumb: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  // Error banner
  errorCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  errorTitle: { fontSize: 14, fontWeight: '800' },
  errorMessage: { fontSize: 13 },
  errorButton: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },

  // Empty states
  emptyBlock: {
    marginTop: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center' },
});