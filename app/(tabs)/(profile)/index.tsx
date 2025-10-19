import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import Toast from 'react-native-toast-message';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/contexts/session-context';
import { useThemePreference } from '@/contexts/theme-context';
import { getPendingWorkouts } from '@/lib/workout-sync';

const emailSchema = z.object({ email: z.string().email('Ogiltig e-post') });
const aliasSchema = z.object({ alias: z.string().min(2).max(30) });

type EmailForm = z.infer<typeof emailSchema>;
type AliasForm = z.infer<typeof aliasSchema>;

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useSession();
  const { preference, setPreference } = useThemePreference();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    getPendingWorkouts().then((items) => setPendingCount(items.length));
  }, []);

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const aliasForm = useForm<AliasForm>({
    resolver: zodResolver(aliasSchema),
    defaultValues: { alias: (user?.user_metadata as { alias?: string } | undefined)?.alias ?? '' },
  });

  useEffect(() => {
    aliasForm.reset({ alias: (user?.user_metadata as { alias?: string } | undefined)?.alias ?? '' });
  }, [user, aliasForm]);

  async function sendMagicLink({ email }: EmailForm) {
    const redirectTo = Linking.createURL('/auth/callback');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    if (error) {
      Toast.show({ type: 'error', text1: 'Kunde inte skicka magisk länk' });
      return;
    }
    Toast.show({ type: 'success', text1: 'Kolla din inkorg!' });
  }

  async function signInWithGoogle() {
    const redirectTo = Linking.createURL('/auth/callback');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) {
      Toast.show({ type: 'error', text1: 'Google-inloggning misslyckades' });
    }
  }

  async function saveAlias({ alias }: AliasForm) {
    const { error } = await supabase.auth.updateUser({ data: { alias } });
    if (error) {
      Toast.show({ type: 'error', text1: 'Kunde inte spara alias' });
    } else {
      Toast.show({ type: 'success', text1: 'Alias uppdaterat' });
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Din profil</Text>
      {user ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{user.email}</Text>
          <Text style={styles.cardSubtitle}>Alias: {(user.user_metadata as { alias?: string } | undefined)?.alias ?? '—'}</Text>
          <Text style={styles.cardMeta}>Pending pass att synka: {pendingCount}</Text>
          <Text style={styles.cardMeta}>Tema: {preference}</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/profile/settings')}>
            <Text style={styles.primaryText}>Inställningar</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={signOut}>
            <Text style={styles.secondaryText}>Logga ut</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Logga in</Text>
          <TextInput
            placeholder="din@epost.se"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            onChangeText={(text) => emailForm.setValue('email', text)}
          />
          {emailForm.formState.errors.email ? (
            <Text style={styles.errorText}>{emailForm.formState.errors.email.message}</Text>
          ) : null}
          <Pressable style={styles.primaryButton} onPress={emailForm.handleSubmit(sendMagicLink)}>
            <Text style={styles.primaryText}>Skicka magisk länk</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={signInWithGoogle}>
            <Text style={styles.secondaryText}>Logga in med Google</Text>
          </Pressable>
        </View>
      )}

      {user ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Uppdatera alias</Text>
          <TextInput
            placeholder="Alias"
            style={styles.input}
            defaultValue={aliasForm.getValues('alias')}
            onChangeText={(text) => aliasForm.setValue('alias', text)}
          />
          {aliasForm.formState.errors.alias ? (
            <Text style={styles.errorText}>{aliasForm.formState.errors.alias.message}</Text>
          ) : null}
          <Pressable style={styles.primaryButton} onPress={aliasForm.handleSubmit(saveAlias)}>
            <Text style={styles.primaryText}>Spara</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tema</Text>
        <View style={styles.themeRow}>
          {(['light', 'dark', 'system'] as const).map((mode) => (
            <Pressable key={mode} style={[styles.chip, preference === mode && styles.chipActive]} onPress={() => setPreference(mode)}>
              <Text style={preference === mode ? styles.chipTextActive : styles.chipText}>{mode}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#64748b',
  },
  cardMeta: {
    color: '#0f172a',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  primaryButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#0ea5e9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#0ea5e9',
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  chipText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
});
