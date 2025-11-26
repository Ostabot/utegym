// app/run/[id].tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    TextInput,
    Image,
    Platform,
    Share,
    ActionSheetIOS,
    Linking,
    Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfettiCannon from 'react-native-confetti-cannon';

import * as ImagePicker from 'expo-image-picker';

import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { supabase } from '@/lib/supabase';
import { useAppTheme } from 'src/ui/useAppTheme';
import { useSession } from 'src/contexts/session-context';
import { useTranslation } from 'react-i18next';

function base64ToUint8Array(base64: string) {
    const binaryString = (global as any).atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

type PlanExercise = {
    key: string;
    name?: string | null;
    name_sv?: string | null;
    prescription: { sets: number; reps?: number[] | null; durationSeconds?: number | null };

    // Beskrivningar
    description_sv?: string | null;
    description_en?: string | null;
};

type ExerciseLogSet = {
    reps: number | null;
    loadKg: number | null;
    rpe: number | null;
    durationSeconds: number | null;
    done: boolean;
};

type ExerciseLog = { exerciseKey: string; sets: ExerciseLogSet[] };

type Plan = {
    exercises: PlanExercise[];
    gym?: { name?: string | null; image_url?: string | null } | null;
    method?: { focus?: string | null; intensity?: string | null; duration?: string | number | null } | null;
};

type Seed = { plan: Plan; logs: ExerciseLog[]; startedAt: string };

type Step = 'exercise' | 'congrats';

// Helper – spara workout till servern via RPC
async function saveServerWorkoutFromSeed(seed: Seed) {
    const startedISO = seed.startedAt;
    const finishedISO = new Date().toISOString();
    const plan = seed.plan ?? {};
    const logs = seed.logs ?? [];
    const meta = (seed as any)?.meta ?? {};

    const { data, error } = await supabase.rpc('api_log_workout', {
        p_started: startedISO,
        p_finished: finishedISO,
        p_plan: plan,
        p_logs: logs,
        p_meta: meta,
    });

    if (error) {
        console.warn('[api_log_workout] error', error);
        throw error;
    }

    return data as string; // nya id:t
}

export default function RunById() {
    const theme = useAppTheme();
    const { t: tr, i18n } = useTranslation();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ id?: string }>();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const [loading, setLoading] = useState(true);
    const [seed, setSeed] = useState<Seed | null>(null);

    // lokala states för flow
    const [step, setStep] = useState<Step>('exercise');
    const [index, setIndex] = useState(0);
    const [rating, setRating] = useState<number | null>(null);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [confetti, setConfetti] = useState(false);
    const { user } = useSession();

    const isEn = i18n.language?.startsWith('en');
    const pickName = (ex: PlanExercise) =>
        isEn ? (ex.name ?? ex.name_sv ?? ex.key) : (ex.name_sv ?? ex.name ?? ex.key);

    // --- Load seed + enrich descriptions ---
    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                setLoading(true);

                let loaded: Seed | null = null;

                if (id === 'local-debug') {
                    const raw = await AsyncStorage.getItem('run/local-debug');
                    loaded = raw ? JSON.parse(raw) : null;
                } else if (id && id.startsWith('local-')) {
                    const raw = await AsyncStorage.getItem(`pending:${id}`);
                    loaded = raw ? JSON.parse(raw) : null;
                } else if (id) {
                    const { data, error } = await supabase
                        .from('workout_sessions')
                        .select('plan, logs, started_at')
                        .eq('id', id)
                        .single();

                    if (!error && data) {
                        // If no started_at yet => set it now and use that value for the seed
                        let startedISO = (data.started_at as string | null) ?? null;
                        if (!startedISO) {
                            startedISO = new Date().toISOString();
                            await supabase
                                .from('workout_sessions')
                                .update({ started_at: startedISO })
                                .eq('id', id);
                        }

                        loaded = {
                            plan: data.plan,
                            logs: data.logs,
                            startedAt: startedISO!, // <-- ensure seed has a started time
                        };
                    }
                }

                if (!loaded) {
                    if (!cancelled) setSeed(null);
                    return;
                }

                // Hämta både description_sv och description_en för alla exercises
                const exKeys = (loaded.plan?.exercises ?? []).map((e) => e.key).filter(Boolean);
                if (exKeys.length) {
                    const { data: descs } = await supabase
                        .from('outdoor_exercises')
                        .select('key,description_sv,description_en')
                        .in('key', exKeys);

                    const byKey: Record<string, { sv: string | null; en: string | null }> = Object.fromEntries(
                        (descs ?? []).map((r: any) => [
                            String(r.key),
                            {
                                sv: r.description_sv ?? null,
                                en: r.description_en ?? null,
                            },
                        ]),
                    );

                    loaded = {
                        ...loaded,
                        plan: {
                            ...loaded.plan,
                            exercises: (loaded.plan.exercises ?? []).map((e) => {
                                const found = byKey[e.key] ?? { sv: null, en: null };
                                return {
                                    ...e,
                                    description_sv: e.description_sv ?? found.sv ?? null,
                                    description_en: (e as any).description_en ?? found.en ?? null,
                                } as PlanExercise;
                            }),
                        },
                    };
                }

                if (!cancelled) setSeed(loaded);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [id]);

    // Zippa ex + log
    const rows = useMemo(() => {
        const out: Array<{ ex: PlanExercise; log: ExerciseLog }> = [];
        const exs = seed?.plan?.exercises ?? [];
        const logs = seed?.logs ?? [];
        for (let i = 0; i < exs.length; i++) {
            const wantedSets = exs[i].prescription.sets;
            const have: ExerciseLog | undefined = logs[i];
            const norm: ExerciseLog = have
                ? {
                    exerciseKey: have.exerciseKey ?? exs[i].key,
                    sets: (have.sets ?? []).slice(0, wantedSets).concat(
                        Array.from(
                            { length: Math.max(0, wantedSets - (have.sets?.length ?? 0)) },
                            () => ({
                                reps: exs[i].prescription.reps?.[0] ?? null,
                                loadKg: null,
                                rpe: null,
                                durationSeconds: exs[i].prescription.durationSeconds ?? null,
                                done: false,
                            }),
                        ),
                    ),
                }
                : {
                    exerciseKey: exs[i].key,
                    sets: Array.from({ length: wantedSets }, () => ({
                        reps: exs[i].prescription.reps?.[0] ?? null,
                        loadKg: null,
                        rpe: null,
                        durationSeconds: exs[i].prescription.durationSeconds ?? null,
                        done: false,
                    })),
                };
            out.push({ ex: exs[i], log: norm });
        }
        return out;
    }, [seed]);

    const current = rows[index];

    // Helpers: persist progress (best effort)
    async function saveProgress(nextSeed: Seed) {
        if (!id) return;
        if (id.startsWith('local-')) {
            await AsyncStorage.setItem(`pending:${id}`, JSON.stringify(nextSeed));
            return;
        }
        try {
            await supabase
                .from('workout_sessions')
                .update({
                    plan: nextSeed.plan,
                    logs: nextSeed.logs,
                })
                .eq('id', id);
        } catch {
            // best-effort
        }
    }

    function updateSeed(updater: (s: Seed) => Seed) {
        setSeed((prev) => {
            if (!prev) return prev;
            const next = updater(prev);
            void saveProgress(next);
            return next;
        });
    }

    // --- Mutators: sets/reps/done ---
    function toggleSetDone(setIdx: number) {
        updateSeed((s) => {
            const logs = [...s.logs];
            logs[index] = {
                ...logs[index],
                sets: logs[index].sets.map((st, i) =>
                    i === setIdx ? { ...st, done: !st.done } : st,
                ),
            };
            return { ...s, logs };
        });
    }

    function changeSets(newCount: number) {
        if (!current) return;
        newCount = Math.max(1, Math.min(10, newCount));

        updateSeed((s) => {
            const plan = { ...s.plan };
            const exs = [...(plan.exercises ?? [])];
            const ex = { ...exs[index] };
            ex.prescription = { ...ex.prescription, sets: newCount };
            exs[index] = ex;
            plan.exercises = exs;

            const logs = [...s.logs];
            const baseRep = ex.prescription.reps?.[0] ?? null;
            const currSets = logs[index]?.sets ?? [];
            const nextSets =
                newCount <= currSets.length
                    ? currSets.slice(0, newCount)
                    : currSets.concat(
                        Array.from({ length: newCount - currSets.length }, () => ({
                            reps: baseRep,
                            loadKg: null,
                            rpe: null,
                            durationSeconds: ex.prescription.durationSeconds ?? null,
                            done: false,
                        })),
                    );
            logs[index] = { exerciseKey: ex.key, sets: nextSets };

            return { ...s, plan, logs };
        });
    }

    function changeRepForSet(setIdx: number, text: string) {
        const n = Number(text.replace(/[^\d]/g, '')) || 0;
        updateSeed((s) => {
            const logs = [...s.logs];
            const sets = logs[index].sets.map((st, i) =>
                i === setIdx ? { ...st, reps: n } : st,
            );
            logs[index] = { ...logs[index], sets };
            return { ...s, logs };
        });
    }

    // Funktion för att gå till nästa övning eller avsluta
    async function nextExercise() {
        if (index < rows.length - 1) {
            setIndex((i) => i + 1);
            return;
        }

        // Done → congrats
        setStep('congrats');
        setConfetti(true);
        setTimeout(() => setConfetti(false), 3000);

        try {
            if (!id) return;

            if (!id.startsWith('local-')) {
                // Passet finns redan på servern → uppdatera finished_at
                const finishedISO = new Date().toISOString();
                const { error: upErr } = await supabase
                    .from('workout_sessions')
                    .update({ finished_at: finishedISO })
                    .eq('id', id);

                if (upErr) console.warn('[run] update finished_at failed', upErr);
            } else {
                // Lokalt pass → skapa server-rad via RPC
                if (!seed) return;

                await AsyncStorage.setItem(
                    `pending:${id}`,
                    JSON.stringify({ ...seed, finishedAt: new Date().toISOString() }),
                );

                try {
                    const newId = await saveServerWorkoutFromSeed({
                        ...seed,
                        startedAt: seed.startedAt,
                    } as Seed);

                    await AsyncStorage.removeItem(`pending:${id}`);
                    // valfri navigation med newId (om du vill)
                } catch (e) {
                    console.warn('[run] RPC insert failed, keeping local pending', e);
                }
            }
        } catch (e) {
            console.warn('[run] exception setting finished/creating', e);
        }

        updateSeed((s) => s);
    }

    // --- Congrats rating ---
    async function saveRatingAndContinue() {
        if (rating == null) {
            Alert.alert(
                '',
                tr(
                    'run.rating.selectRating',
                    'Välj ett betyg (1–5) innan du fortsätter.',
                ),
            );
            return;
        }
        updateSeed((s) => s);

        try {
            if (id && !id.startsWith('local-')) {
                const { data: currentRow, error: selErr } = await supabase
                    .from('workout_sessions')
                    .select('meta, finished_at')
                    .eq('id', id)
                    .single();

                if (selErr) console.warn('[congrats] select failed', selErr);

                const alias = (user?.user_metadata as any)?.alias ?? null;
                const mergedMeta = {
                    ...(currentRow?.meta ?? {}),
                    ...(seed as any)?.meta,
                    rating: Number(rating),
                    ...(alias ? { alias } : {}),
                };

                const { error: upErr } = await supabase
                    .from('workout_sessions')
                    .update({
                        meta: mergedMeta,
                        finished_at: currentRow?.finished_at ?? new Date().toISOString(),
                    })
                    .eq('id', id);

                if (upErr) console.warn('[congrats] update failed', upErr);
            } else if (id?.startsWith('local-')) {
                setSeed((prev) =>
                    prev ? ({ ...prev, meta: { ...(prev as any).meta, rating } } as any) : prev,
                );
            }
        } catch (e) {
            console.warn('saveRatingAndContinue: exception', e);
        }

        await AsyncStorage.setItem('feed.defaultTab', 'all');
        router.replace('/(tabs)/(feed)');
    }

    // --- Share / upload photo ---
    async function pickPhoto() {
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (perm.status !== 'granted') {
                Alert.alert(
                    '',
                    tr(
                        'run.photo.perms',
                        'Behöver tillgång till dina bilder för att kunna ladda upp ett foto.',
                    ),
                );
                return;
            }

            const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'], // ny stil enligt SDK 54
                allowsEditing: true,
                quality: 0.8,
                selectionLimit: 1,
            });

            if (res.canceled || !res.assets?.[0]?.uri) return;

            const uri = res.assets[0].uri;
            setPhotoUri(uri);

            if (!id) return;

            // Läs filen som base64-sträng
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64',
            });

            const fileName = `workout_${id}_${Date.now()}.jpg`;

            // Konvertera base64 → Uint8Array (ArrayBufferView)
            const binary = base64ToUint8Array(base64);

            const { error: uploadError } = await supabase.storage
                .from('workout_photos')
                .upload(fileName, binary, {
                    contentType: 'image/jpeg',
                    cacheControl: '3600',
                    upsert: true,
                });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                Alert.alert('', tr('run.photo.uploadError', 'Kunde inte ladda upp bilden.'));
                return;
            }

            const { data } = supabase.storage.from('workout_photos').getPublicUrl(fileName);
            const publicUrl = data?.publicUrl;
            if (!publicUrl) return;

            const { error: updateError } = await supabase
                .from('workout_sessions')
                .update({
                    meta: { ...(seed as any)?.meta, photo_url: publicUrl },
                })
                .eq('id', id);

            if (updateError) {
                console.error('DB update error:', updateError);
                Alert.alert('', tr('run.photo.linkError', 'Kunde inte spara bildlänken.'));
                return;
            }
        } catch (e) {
            console.warn('pickPhoto failed', e);
        }
    }

    async function goToFeedMine() {
        await AsyncStorage.setItem('feed.defaultTab', 'mine');
        router.replace('/(tabs)/(feed)');
    }

    async function shareWorkout() {
        const gymName = seed?.plan?.gym?.name ?? tr('run.exercise.gymFallback', 'Utegym');
        const link = `https://utegym.app/pass/${id}`;
        const smsBody = tr(
            'run.shareSheet.smsBody',
            'Kolla mitt träningspass på {{gym}}! {{link}}',
            {
                gym: gymName,
                link,
            },
        );
        const emailSubject = tr('run.shareSheet.emailSubject', 'Mitt träningspass');
        const emailBody = tr(
            'run.shareSheet.emailBody',
            'Kolla mitt träningspass på {{gym}}! {{link}}',
            { gym: gymName, link },
        );

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: tr('run.shareSheet.title', 'Dela ditt pass'),
                    options: [
                        tr('run.shareSheet.sms', 'SMS'),
                        tr('run.shareSheet.copy', 'Kopiera länk'),
                        tr('run.shareSheet.email', 'E-post'),
                        tr('common.cancel', 'Avbryt'),
                    ],
                    cancelButtonIndex: 3,
                },
                async (btn) => {
                    if (btn === 0) {
                        await Linking.openURL(`sms:&body=${encodeURIComponent(smsBody)}`);
                    }
                    if (btn === 1) {
                        await Clipboard.setStringAsync(link);
                        Alert.alert(
                            '',
                            tr('run.shareSheet.copied', 'Länk kopierad!'),
                        );
                    }
                    if (btn === 2) {
                        await Linking.openURL(
                            `mailto:?subject=${encodeURIComponent(
                                emailSubject,
                            )}&body=${encodeURIComponent(emailBody)}`,
                        );
                    }
                },
            );
            return;
        }

        try {
            await Share.share({
                title: tr('run.share.title', 'Dela ditt pass'),
                message: tr(
                    'run.share.message',
                    'Kolla mitt träningspass på {{gym}}! {{link}}',
                    { gym: gymName, link },
                ),
            });
        } catch (e) {
            console.error('Share error:', e);
        }
    }

    // --- Render guards ---
    if (!id) {
        return (
            <Centered>
                <Text style={[styles.h1, { color: theme.colors.text }]}>RUN / [id]</Text>
                <Text style={[styles.muted, { color: theme.colors.subtext }]}>
                    {tr('run.guard.noId', 'Ingen id-param kom fram.')}
                </Text>
                <Primary
                    theme={theme}
                    onPress={() => router.replace('/(tabs)/(train)')}
                    label={tr('run.guard.backToWizard', 'Tillbaka till guiden')}
                />
            </Centered>
        );
    }
    if (loading) {
        return (
            <Centered>
                <ActivityIndicator />
                <Text style={[styles.muted, { color: theme.colors.subtext }]}>
                    {tr('run.loading', 'Laddar pass…')}
                </Text>
            </Centered>
        );
    }
    if (!seed || !current) {
        return (
            <Centered>
                <Text style={[styles.h1, { color: theme.colors.text }]}>RUN / {id}</Text>
                <Text style={[styles.muted, { color: theme.colors.subtext }]}>
                    {tr('run.guard.notFound', 'Kunde inte hitta något pass för detta id.')}
                </Text>
                <Primary
                    theme={theme}
                    onPress={() => router.replace('/(tabs)/(train)')}
                    label={tr('run.guard.backToWizard', 'Tillbaka till guiden')}
                />
            </Centered>
        );
    }

    // --- UI per steg ---
    if (step === 'exercise') {
        const total = rows.length;
        const name = pickName(current.ex);

        // språkberoende beskrivning med fallback
        const desc = isEn
            ? current.ex.description_en ??
            current.ex.description_sv ??
            ''
            : current.ex.description_sv ??
            current.ex.description_en ??
            '';

        const gymLabel = seed.plan.gym?.name ?? tr('run.exercise.gymFallback', 'Utegym');

        return (
            <FlatList
                style={{ flex: 1, backgroundColor: theme.colors.bg }}
                data={current.log.sets}
                keyExtractor={(_, i) => String(i)}
                contentContainerStyle={{
                    padding: 16,
                    gap: 12,
                    paddingTop: insets.top + 8,
                    paddingBottom: insets.bottom + 24,
                }}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListHeaderComponent={
                    <>
                        <Text style={[styles.h1, { color: theme.colors.text }]}>{name}</Text>
                        <Text style={[styles.muted, { color: theme.colors.subtext }]}>
                            {tr('run.exercise.progress', 'Övning {{index}} av {{total}} · {{gym}}', {
                                index: index + 1,
                                total,
                                gym: gymLabel,
                            })}
                        </Text>

                        {desc ? (
                            <View
                                style={[
                                    styles.descBox,
                                    {
                                        borderColor: theme.colors.border,
                                        backgroundColor: theme.colors.card,
                                    },
                                ]}
                            >
                                <Text style={[styles.descText, { color: theme.colors.text }]}>{desc}</Text>
                            </View>
                        ) : null}

                        {/* Set & reps editor */}
                        <View style={styles.editorRow}>
                            <Text style={[styles.label, { color: theme.colors.text }]}>
                                {tr('run.exercise.setsLabel', 'Antal set')}
                            </Text>
                            <View style={styles.counterRow}>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={tr(
                                        'run.exercise.decreaseSets',
                                        'Minska antal set',
                                    )}
                                    onPress={() =>
                                        changeSets(Math.max(1, current.ex.prescription.sets - 1))
                                    }
                                    style={({ pressed }) => [
                                        styles.pill,
                                        {
                                            borderColor: theme.colors.border,
                                            backgroundColor: theme.colors.card,
                                            opacity: pressed ? 0.7 : 1,
                                        },
                                    ]}
                                >
                                    <Text style={[styles.pillText, { color: theme.colors.text }]}>–</Text>
                                </Pressable>
                                <Text style={[styles.counter, { color: theme.colors.text }]}>
                                    {current.ex.prescription.sets}
                                </Text>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={tr(
                                        'run.exercise.increaseSets',
                                        'Öka antal set',
                                    )}
                                    onPress={() => changeSets(current.ex.prescription.sets + 1)}
                                    style={({ pressed }) => [
                                        styles.pill,
                                        {
                                            borderColor: theme.colors.border,
                                            backgroundColor: theme.colors.card,
                                            opacity: pressed ? 0.7 : 1,
                                        },
                                    ]}
                                >
                                    <Text style={[styles.pillText, { color: theme.colors.text }]}>+</Text>
                                </Pressable>
                            </View>
                        </View>
                    </>
                }
                renderItem={({ item: setRow, index: sidx }) => (
                    <View
                        style={[
                            styles.setCard,
                            {
                                backgroundColor: theme.colors.card,
                                borderColor: theme.colors.border,
                            },
                        ]}
                    >
                        <Pressable
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: setRow.done }}
                            accessibilityLabel={tr('run.exercise.setLabel', 'Set {{n}}', {
                                n: sidx + 1,
                            })}
                            onPress={() => toggleSetDone(sidx)}
                            style={({ pressed }) => [
                                styles.check,
                                { borderColor: theme.colors.border },
                                setRow.done && {
                                    backgroundColor: theme.colors.primary,
                                    borderColor: theme.colors.primary,
                                },
                                pressed && { opacity: 0.7 },
                            ]}
                        >
                            <Text
                                style={{
                                    color: setRow.done ? theme.colors.primaryText : theme.colors.text,
                                }}
                            >
                                {setRow.done ? '✓' : ''}
                            </Text>
                        </Pressable>

                        <Text style={[styles.setLabel, { color: theme.colors.text }]}>
                            {tr('run.exercise.setLabel', 'Set {{n}}', { n: sidx + 1 })}
                        </Text>

                        <TextInput
                            keyboardType="number-pad"
                            defaultValue={String(setRow.reps ?? '')}
                            onChangeText={(tval) => changeRepForSet(sidx, tval)}
                            placeholder={tr('run.exercise.repsPlaceholder', 'reps')}
                            placeholderTextColor={theme.colors.subtext}
                            style={[
                                styles.repsInput,
                                {
                                    borderColor: theme.colors.border,
                                    backgroundColor: theme.colors.card,
                                    color: theme.colors.text,
                                },
                            ]}
                        />
                        <Text style={[styles.repsSuffix, { color: theme.colors.subtext }]}>
                            {tr('run.exercise.repsSuffix', 'reps')}
                        </Text>
                    </View>
                )}
                ListFooterComponent={
                    <View style={{ marginTop: 12 }}>
                        <Primary
                            theme={theme}
                            onPress={nextExercise}
                            label={
                                index < rows.length - 1
                                    ? tr('run.exercise.next', 'Fortsätt')
                                    : tr('run.exercise.finish', 'Avsluta pass')
                            }
                        />
                    </View>
                }
                ListFooterComponentStyle={{ backgroundColor: theme.colors.bg }}
            />
        );
    }

    if (step === 'congrats') {
        const gymName = seed.plan.gym?.name ?? tr('run.exercise.gymFallback', 'Utegym');

        return (
            <View
                style={[
                    styles.stepContainer,
                    { paddingTop: insets.top + 8, backgroundColor: theme.colors.bg },
                ]}
            >
                <View style={{ flex: 1, padding: 16, alignItems: 'center', gap: 12 }}>
                    {confetti && (
                        <View style={StyleSheet.absoluteFill} pointerEvents="none">
                            <ConfettiCannon count={120} origin={{ x: 180, y: 0 }} fadeOut />
                        </View>
                    )}
                    <Image
                        source={
                            seed.plan.gym?.image_url
                                ? { uri: seed.plan.gym.image_url }
                                : require('../../assets/gym-placeholder.jpg')
                        }
                        style={{
                            width: 140,
                            height: 140,
                            borderRadius: 70,
                            backgroundColor: theme.colors.border,
                        }}
                        accessibilityIgnoresInvertColors
                    />
                    <Text style={[styles.h1, { color: theme.colors.text }]}>
                        {tr('complete.title', 'Snyggt jobbat!')}
                    </Text>
                    <Text style={[styles.muted, { color: theme.colors.subtext }]}>
                        {tr('run.congrats.subtitle', 'Träningspass på {{gym}}', { gym: gymName })}
                    </Text>

                    <Text
                        style={{
                            marginTop: 24,
                            marginBottom: 8,
                            fontWeight: '500',
                            color: theme.colors.text,
                        }}
                    >
                        {tr('complete.ratePrompt', 'Betygsätt ditt pass')}
                    </Text>

                    {/* Stjärnor */}
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                        {[1, 2, 3, 4, 5].map((n) => (
                            <Pressable
                                key={n}
                                accessibilityRole="button"
                                accessibilityLabel={tr(
                                    'run.rating.starLabel',
                                    'Sätt betyg {{n}} av 5',
                                    { n },
                                )}
                                onPress={() => setRating(n)}
                                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                            >
                                <Text style={{ fontSize: 28, color: theme.colors.text }}>
                                    {(rating ?? 0) >= n ? '★' : '☆'}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* FOTO + DELA */}
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={tr('run.congrats.photoCta', 'Ladda upp foto')}
                        accessibilityHint={tr(
                            'run.photo.perms',
                            'Behöver tillgång till dina bilder för att kunna ladda upp ett foto.',
                        )}
                        style={({ pressed }) => [
                            styles.actionBtn,
                            {
                                borderColor: theme.colors.border,
                                backgroundColor: theme.colors.card,
                                opacity: pressed ? 0.85 : 1,
                            },
                        ]}
                        onPress={pickPhoto}
                    >
                        <Ionicons name="image-outline" size={18} color={theme.colors.text} />
                        <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>
                            {tr('run.congrats.photoCta', 'Ladda upp foto')}
                        </Text>
                        {photoUri ? (
                            <Image
                                source={{ uri: photoUri }}
                                style={{ width: 200, height: 200, borderRadius: 12, marginTop: 8 }}
                            />
                        ) : null}
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={tr('run.congrats.shareCta', 'Dela ditt pass')}
                        style={({ pressed }) => [
                            styles.actionBtn,
                            {
                                borderColor: theme.colors.border,
                                backgroundColor: theme.colors.card,
                                opacity: pressed ? 0.85 : 1,
                            },
                        ]}
                        onPress={shareWorkout}
                    >
                        <Ionicons
                            name="share-social-outline"
                            size={18}
                            color={theme.colors.text}
                        />
                        <Text style={[styles.actionBtnText, { color: theme.colors.text }]}>
                            {tr('run.congrats.shareCta', 'Dela ditt pass')}
                        </Text>
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={tr('complete.continue', 'Fortsätt')}
                        style={({ pressed }) => [
                            styles.primaryButton,
                            {
                                backgroundColor: theme.colors.primary,
                                marginTop: 28,
                                opacity: pressed ? 0.9 : 1,
                            },
                        ]}
                        onPress={saveRatingAndContinue}
                    >
                        <Text style={[styles.primaryText, { color: theme.colors.primaryText }]}>
                            {tr('complete.continue', 'Fortsätt')}
                        </Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return null;
}

/* ---------- UI helpers ---------- */
function Centered({ children }: { children: React.ReactNode }) {
    const theme = useAppTheme();
    return (
        <View
            style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: 16,
                backgroundColor: theme.colors.bg,
            }}
        >
            {children}
        </View>
    );
}

function Primary({
    onPress,
    label,
    theme,
}: {
    onPress: () => void;
    label: string;
    theme: ReturnType<typeof useAppTheme>;
}) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [
                styles.primary,
                {
                    backgroundColor: theme.colors.primary,
                    opacity: pressed ? 0.9 : 1,
                },
            ]}
            onPress={onPress}
        >
            <Text style={[styles.primaryText, { color: theme.colors.primaryText }]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    h1: { fontSize: 20, fontWeight: '800' },
    muted: { color: '#64748b' },

    descBox: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
    },
    descText: {},

    editorRow: {
        marginTop: 6,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    label: { fontWeight: '700' },
    counterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    pill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
    },
    pillText: { fontWeight: '800', fontSize: 16 },
    counter: { minWidth: 24, textAlign: 'center', fontWeight: '800' },

    stepContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingBottom: 24,
    },

    setCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
    },
    check: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    setLabel: { fontWeight: '700', width: 60 },
    repsInput: {
        flex: 0,
        width: 60,
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    repsSuffix: {},

    photoBox: {
        height: 180,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
    },

    toggleShare: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
    },
    toggleShareOn: { borderColor: '#16a34a', backgroundColor: '#ecfdf5' },
    toggleShareFlag: { borderColor: '#16a34a', backgroundColor: '#ecfdf5' },
    toggleShareText: { color: '#0f172a', fontWeight: '700' },
    toggleShareTextOn: { color: '#16a34a' },

    actionBtn: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
    },
    actionBtnText: { fontWeight: '700' },

    badgeOn: {
        marginLeft: 'auto',
        backgroundColor: '#dcfce7',
        color: '#166534',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        fontWeight: '700',
    },
    badgeOff: {
        marginLeft: 'auto',
        backgroundColor: '#f1f5f9',
        color: '#334155',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        fontWeight: '700',
    },

    primary: {
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 12,
    },
    primaryText: { fontWeight: '700', fontSize: 16 },
    primaryButton: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 14,
        alignItems: 'center',
    },
});