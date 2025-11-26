// app/onboarding.tsx
import { useEffect, useState, useCallback, ReactNode } from 'react';
import {
    View, Text, StyleSheet, TextInput, Alert, Platform,
    KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from 'src/lib/supabase';
import { useAppTheme } from 'src/ui/useAppTheme';
import { useTranslation } from 'react-i18next';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import 'react-native-get-random-values';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AccessiblePressable from 'src/ui/AccessiblePressable';
import { setAppLanguage, i18n } from 'src/lib/i18n';
import * as WebBrowser from 'expo-web-browser';      
import { startGoogleOAuth } from '@/lib/auth/google';

// Säkrar att WebBrowser stänger auth-session korrekt när vi kommer tillbaka via deeplink
WebBrowser.maybeCompleteAuthSession();                    // ⬅️ NEW

const AUTH_REDIRECT = 'utegym://auth/callback';
const GUEST_KEY = 'utegym.guestMode';

export default function OnboardingScreen() {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { t } = useTranslation();

    const [email, setEmail] = useState('');
    
    const [appleAvailable, setAppleAvailable] = useState(false);
    const [appleWhy, setAppleWhy] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                if (Platform.OS !== 'ios') {
                    setAppleAvailable(false);
                    setAppleWhy('Endast iOS');
                    return;
                }
                // Räcker – returnerar false om entitlement saknas eller om device/OS inte stöds
                const ok = await AppleAuthentication.isAvailableAsync();
                setAppleAvailable(ok);
                setAppleWhy(ok ? null : 'Sign in with Apple är inte tillgängligt i denna build.');
                console.log('SIWA available (onboarding)?', ok);
            } catch (e: any) {
                setAppleAvailable(false);
                setAppleWhy(String(e?.message ?? e));
                console.log('SIWA check failed (onboarding):', e);
            }
        })();
    }, []);

    


    const [lang, setLang] = useState<'sv' | 'en'>(i18n.language?.startsWith('sv') ? 'sv' : 'en');
    const handleChangeLang = useCallback(async (next: 'sv' | 'en') => {
        setLang(next);
        await setAppLanguage(next);
    }, []);

    // ---------------- Apple (oförändrat) ----------------
    const signInWithApple = useCallback(async () => {
        try {
            console.log("Apple is available?", appleAvailable);
            if (!appleAvailable) return;
            const rawNonce = Crypto.randomUUID();
            const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
            const cred = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
                nonce: hashedNonce,
            });
            if (!cred.identityToken) throw new Error('No identity token.');
            const { error } = await supabase.auth.signInWithIdToken({
                provider: 'apple',
                token: cred.identityToken,
                nonce: rawNonce,
            });
            if (error) throw error;
            await AsyncStorage.removeItem(GUEST_KEY);
            router.replace('/(tabs)');
        } catch (e: any) {
            if (e?.code === 'ERR_CANCELED') return;
            Alert.alert(t('auth.apple.failed.title', 'Kunde inte logga in med Apple'), String(e?.message ?? e));
        }
    }, [appleAvailable, router, t]);

    // ---------------- Google (NYTT robust flöde) ----------------

    const signInWithGoogle = useCallback(async () => {
        try {
            const r = await startGoogleOAuth();
            if (!r.cancelled) router.replace('/(tabs)');
        } catch (e: any) {
            Alert.alert(
                t('auth.google.failed.title', 'Kunde inte logga in med Google'),
                String(e?.message ?? e)
            );
        }
    }, [router, t]);

    // ---- Magic link
    const sendMagicLink = useCallback(async () => {
        try {
            const addr = (email ?? '').trim();
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) {
                Alert.alert(
                    t('auth.magic.badEmail.title', 'Ogiltig e-post'),
                    t('auth.magic.badEmail.body', 'Ange en giltig adress.')
                );
                return;
            }
            const { error } = await supabase.auth.signInWithOtp({
                email: addr,
                options: { emailRedirectTo: AUTH_REDIRECT },
            });
            if (error) throw error;
            Alert.alert(
                t('auth.magic.sent.title', 'Länk skickad'),
                t('auth.magic.sent.body', 'Kolla din e-post och öppna länken på den här enheten.')
            );
        } catch (e: any) {
            Alert.alert(t('auth.magic.failed.title', 'Kunde inte skicka länk'), String(e?.message ?? e));
        }
    }, [email, t]);

    // ---- Fortsätt som gäst
    const continueAsGuest = useCallback(async () => {
        await AsyncStorage.setItem(GUEST_KEY, '1');
        router.replace('/(tabs)');
    }, [router]);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1, backgroundColor: theme.colors.bg }}
            >
                <ScrollView
                    contentContainerStyle={{
                        paddingTop: 8 + insets.top, // flytta ner under statusbar/notch
                        paddingHorizontal: 20,
                        paddingBottom: 24,
                        gap: 16,
                    }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View style={{ gap: 6 }}>
                        <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: '800' }}>
                            {t('onboarding.title', 'Välkommen!')}
                        </Text>
                        <Text style={{ color: theme.colors.subtext }}>
                            {t('onboarding.subtitle', 'Logga in för att spara pass, foton och få full funktionalitet.')}
                        </Text>
                    </View>

                    {/* Språkval */}
                    <View
                        style={[
                            styles.cardRow,
                            { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
                        ]}
                    >
                        <Text style={{ color: theme.colors.text, fontWeight: '800' }}>
                            {t('onboarding.language.title', 'Språk')}
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
                                                minHeight: 40,
                                                justifyContent: 'center',
                                            },
                                            active && { backgroundColor: theme.colors.primary },
                                        ]}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: active }}
                                        accessibilityLabel={t('onboarding.language.a11y', 'Välj språk: {{label}}', { label })}
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

                    {/* Apple availability debug (visas bara om otillgänglig) */}
                    {
                        !appleAvailable && !!appleWhy && (
                            <Text style={{ color: theme.colors.subtext, fontSize: 12 }}>
                                Apple-inloggning ej tillgänglig: {appleWhy}
                            </Text>
                        )
                    }

                    {/* Apple */}
                    {appleAvailable && (
                        <AppleAuthentication.AppleAuthenticationButton
                            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                            buttonStyle={
                                theme.name === 'dark'
                                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                            }
                            cornerRadius={12}
                            style={{ width: '100%', height: 48 }}
                            onPress={signInWithApple}
                            accessibilityLabel={t('auth.apple.buttonLabel', 'Logga in med Apple')}
                        />
                    )}

                    {/* Google */}
                    <PrimaryBtn onPress={signInWithGoogle} bg={theme.colors.primary} fg={theme.colors.primaryText}>
                        {t('auth.google.signIn', 'Logga in med Google')}
                    </PrimaryBtn>

                    {/* Magic link */}
                    <View
                        style={[styles.card, { borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
                    >
                        <Text style={{ color: theme.colors.text, fontWeight: '800', marginBottom: 8 }}>
                            {t('auth.magic.title', 'Magisk länk')}
                        </Text>
                        <View
                            style={[
                                styles.inputWrap,
                                { borderColor: theme.colors.border, backgroundColor: theme.colors.bg },
                            ]}
                        >
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                placeholder={t('auth.magic.placeholder', 'din@email.com')}
                                placeholderTextColor={theme.colors.subtext}
                                style={{ paddingVertical: 10, color: theme.colors.text }}
                                accessibilityLabel={t('auth.magic.inputLabel', 'E-postadress för magisk länk')}
                                returnKeyType="send"
                                onSubmitEditing={sendMagicLink}
                            />
                        </View>
                        <SecondaryBtn onPress={sendMagicLink} border={theme.colors.border} bg={theme.colors.card} fg={theme.colors.text}>
                            {t('auth.magic.send', 'Skicka länk')}
                        </SecondaryBtn>
                    </View>

                    {/* Fortsätt som gäst */}
                    <SecondaryBtn onPress={continueAsGuest} border={theme.colors.border} bg={theme.colors.card} fg={theme.colors.text}>
                        {t('onboarding.guest', 'Fortsätt som gäst')}
                    </SecondaryBtn>

                    {/* Legal footer */}
                    <Text
                        style={{ color: theme.colors.subtext, fontSize: 12, textAlign: 'center', marginTop: 8 }}
                        accessible
                        accessibilityLabel={t(
                            'onboarding.legal.full',
                            'Genom att fortsätta godkänner du användarvillkor och integritetspolicy.'
                        )}
                    >
                        {t('onboarding.legal.prefix', 'Genom att fortsätta godkänner du')}{' '}
                        <Text
                            style={{ textDecorationLine: 'underline', color: theme.colors.text }}
                            onPress={() => router.push('/(tabs)/(profile)/about-terms')}
                        >
                            {t('legal.terms', 'användarvillkor')}
                        </Text>{' '}
                        {t('onboarding.legal.and', 'och')}{' '}
                        <Text
                            style={{ textDecorationLine: 'underline', color: theme.colors.text }}
                            onPress={() => router.push('/(tabs)/(profile)/about-privacy')}
                        >
                            {t('legal.privacy', 'integritetspolicy')}
                        </Text>
                        .
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

/* ----- små UI-hjälpare ----- */
function PrimaryBtn({ onPress, children, bg, fg }: { onPress: () => void; children: ReactNode; bg: string; fg: string }) {
    return (
        <AccessiblePressable
            onPress={onPress}
            accessibilityRole="button"
            style={[styles.primaryBtn, { backgroundColor: bg }]}
        >
            <Text style={[styles.primaryText, { color: fg }]}>{children}</Text>
        </AccessiblePressable>
    );
}
function SecondaryBtn({
    onPress,
    children,
    border,
    bg,
    fg,
}: {
    onPress: () => void;
    children: ReactNode;
    border: string;
    bg: string;
    fg: string;
}) {
    return (
        <AccessiblePressable
            onPress={onPress}
            accessibilityRole="button"
            style={[styles.secondaryBtn, { borderColor: border, backgroundColor: bg }]}
        >
            <Text style={[styles.secondaryText, { color: fg }]}>{children}</Text>
        </AccessiblePressable>
    );
}

const styles = StyleSheet.create({
    card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
    cardRow: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        gap: 10,
    },
    inputWrap: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
    pill: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
    },
    primaryBtn: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    secondaryBtn: {
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    primaryText: { fontWeight: '800' },
    secondaryText: { fontWeight: '700' },
});