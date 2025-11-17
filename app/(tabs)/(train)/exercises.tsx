// app/(tabs)/(train)/exercises.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { supabase } from '@/lib/supabase';
import { useWorkoutWizard } from '@/contexts/workout-wizard-context';
import type { Focus, Intensity, DurationKey } from '@/lib/workout';
import { fetchEquipmentMaster } from '@/lib/equipment-utils';
import { useAppTheme } from '@/ui/useAppTheme';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// ---------- policies ----------
type Difficulty = 'easy' | 'medium' | 'hard';

function allowedDifficulties(intensity?: Intensity): Difficulty[] {
  switch (intensity) {
    case 'light':
      return ['easy'];
    case 'hard':
      return ['medium', 'hard'];
    case 'medium':
    default:
      return ['easy', 'medium'];
  }
}

// ---------- utils ----------
function humanizeKey(key: string) {
  const map: Record<string, string> = {
    pullup_bar: 'Pull-up bar',
    pull_up_bar: 'Pull-up bar',
    dip_bar: 'Dip bar',
    situp_bench: 'Sit-up bench',
    open_space: 'Open area',
    open_area: 'Open area',
    box: 'Plyo box',
    box_bench: 'Bench/box',
    step_platform: 'Step platform',
    band: 'Resistance band',
  };
  if (map[key]) return map[key];
  return (key || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

const DEFAULT_EQUIPMENT_WHEN_EMPTY = [
  'pullup_bar',
  'dip_bar',
  'situp_bench',
  'box',
  'open_space',
] as const;
const EX_COUNT_BY_DURATION: Record<DurationKey, number> = {
  '5': 2,
  '10': 3,
  '15': 5,
  '30': 7,
  '45': 10,
};
const SETS_BY_DURATION: Record<DurationKey, number> = {
  '5': 3,
  '10': 3,
  '15': 3,
  '30': 4,
  '45': 4,
};
const REPS_BY_INTENSITY: Record<Intensity, number> = {
  light: 8,
  medium: 10,
  hard: 12,
} as const;

// ---------- types ----------
type DbExercise = {
  key: string;
  name: string | null; // EN (från DB)
  name_sv: string | null; // SV (från DB)
  focus: Focus | null;
  modality?: string | null;
  difficulty: Difficulty | null;
  bodyweight_ok?: boolean | null;

  // Beskrivningar
  description?: string | null; // ev. legacy EN
  description_sv?: string | null; // SV
  description_en?: string | null; // NY: EN
  equipment_keys?: string[] | null;
};

export default function TrainExercisesScreen() {
  const router = useRouter();
  const tTheme = useAppTheme();
  const { t, i18n } = useTranslation();

  const { gym, method, equipmentKeys, bodyweightOnly, exercises, setExercises } =
    useWorkoutWizard();

  const [loading, setLoading] = useState(false);
  const [pool, setPool] = useState<DbExercise[]>([]);
  const [seed, setSeed] = useState<string>(() => makeSeed(gym?.id ?? 'any'));

  // Add-exercise modal state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCat, setPickerCat] = useState<string>('all');

  // Utrustningsnamn (språkberoende: SV från DB, EN humaniserad fallback)
  const [equipNames, setEquipNames] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const list = await fetchEquipmentMaster();
        const map: Record<string, string> = {};
        const isEn = i18n.language?.startsWith('en');
        for (const r of list) {
          const key = r.key;
          map[key] = isEn ? humanizeKey(key) : (r.name ?? humanizeKey(key));
        }
        if (alive) setEquipNames(map);
      } catch (e) {
        console.warn('[Exercises] failed to load equipment names', e);
        if (alive) setEquipNames({}); // fallback tom; vi humaniserar vid render
      }
    })();
    return () => {
      alive = false;
    };
  }, [i18n.language]);

  // ny seed när metod/gym ändras
  useEffect(() => {
    setSeed(
      makeSeed(
        (gym?.id ?? 'any') +
        '-' +
        method.focus +
        '-' +
        method.intensity +
        '-' +
        method.duration
      )
    );
  }, [gym?.id, method.focus, method.intensity, method.duration]);

  // alias för utrustning
  const EQUIP_ALIASES: Record<string, string | string[]> = {
    pullup_bar: 'pull_up_bar',
    'pull-up_bar': 'pull_up_bar',
    high_bar: 'pull_up_bar',
    chin_bar: 'pull_up_bar',
    dip_rack: 'dip_bar',
    dip_racks: 'dip_bar',
    dip_bars: 'dip_bar',
    dip_station: 'dip_bar',
    parallel_bars: 'dip_bar',
    parallettes: 'dip_bar',
    open_area: 'open_space',
    resistance_band: 'band',
    gummiband: 'band',
    box: ['box_bench', 'step_platform'],
    bench_box: 'box_bench',
  };

  function normalizeEquipKey(k: string): string {
    const key = (k || '').trim().toLowerCase();
    const alias = EQUIP_ALIASES[key];
    if (!alias) return key;
    return Array.isArray(alias) ? alias[0] : alias;
  }
  function expandSelectedEquipment(keys: string[]): string[] {
    const out: string[] = [];
    for (const raw of keys) {
      const k = (raw || '').trim().toLowerCase();
      const alias = EQUIP_ALIASES[k];
      if (!alias) out.push(k);
      else if (Array.isArray(alias)) out.push(...alias);
      else out.push(alias);
    }
    return Array.from(new Set(out.map(normalizeEquipKey)));
  }

  // språkberoende beskrivning
  const pickDesc = (ex: {
    description?: string | null;
    description_sv?: string | null;
    description_en?: string | null;
  }) =>
    i18n.language?.startsWith('en')
      ? ex.description_en ?? ex.description ?? ex.description_sv ?? null
      : ex.description_sv ?? ex.description ?? ex.description_en ?? null;

  // ---------- bygg förslag ----------
  function buildSuggestion(
    pool: DbExercise[],
    seed: string,
    method: { duration: DurationKey; intensity: Intensity },
    equipmentKeys: string[],
    excludeKeys: Set<string> = new Set()
  ) {
    const count = EX_COUNT_BY_DURATION[method.duration];

    const selectedRaw = equipmentKeys.length
      ? equipmentKeys
      : [...DEFAULT_EQUIPMENT_WHEN_EMPTY];
    const selectedCanon = new Set(
      expandSelectedEquipment(selectedRaw).map(normalizeEquipKey)
    );
    const wantOpenSpace = selectedCanon.has('open_space');

    const equipList = pool.filter(
      (r) =>
        (r.equipment_keys ?? [])
          .map(normalizeEquipKey)
          .some((k) => selectedCanon.has(k)) && !excludeKeys.has(r.key)
    );

    const bwList = pool.filter(
      (r) =>
        (r.equipment_keys ?? []).length === 0 &&
        r.bodyweight_ok === true &&
        !excludeKeys.has(r.key)
    );

    const targetEquip = Math.min(
      equipList.length,
      Math.max(1, Math.ceil(count * 0.5))
    );
    const takeEquip = seededShuffle(equipList, seed + ':equip').slice(
      0,
      targetEquip
    );
    const rest = count - takeEquip.length;
    const takeBW = wantOpenSpace
      ? seededShuffle(bwList, seed + ':bw').slice(0, Math.max(0, rest))
      : [];

    let picked = uniqueBy([...takeEquip, ...takeBW], (x) => x.key);
    if (picked.length < count) {
      const exclude = new Set([...excludeKeys, ...picked.map((x) => x.key)]);
      const fallback = seededShuffle(pool, seed + ':fallback')
        .filter((x) => !exclude.has(x.key))
        .slice(0, count - picked.length);
      picked = [...picked, ...fallback];
    }

    const sets = SETS_BY_DURATION[method.duration];
    const repsPerSet = REPS_BY_INTENSITY[method.intensity];

    return picked.slice(0, count).map((ex) => ({
      key: ex.key,
      // Display name väljs vid render; behåll båda
      name: ex.name ?? ex.name_sv ?? ex.key,
      name_sv: ex.name_sv ?? ex.name ?? ex.key,
      description: pickDesc(ex),
      prescription: {
        sets,
        reps: Array.from({ length: sets }, () => repsPerSet),
        durationSeconds: null as number | null,
      },
      focus: (ex.focus ?? 'full') as Focus,
      equipment_keys: ex.equipment_keys ?? [],
    }));
  }

  // ---------- hämta pool ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const selectedEquip =
          equipmentKeys.length > 0
            ? equipmentKeys
            : [...DEFAULT_EQUIPMENT_WHEN_EMPTY];
        const onlyBW = isBodyweightOnly(selectedEquip);
        const focus =
          method.focus && method.focus !== 'full' ? method.focus : null;

        let rows: DbExercise[] = [];

        const selectedRaw =
          equipmentKeys.length > 0
            ? equipmentKeys
            : [...DEFAULT_EQUIPMENT_WHEN_EMPTY];
        const selectedExpanded = expandSelectedEquipment(selectedRaw);
        const selectedCanon = new Set(
          selectedExpanded.map(normalizeEquipKey)
        );

        const { data: rpcData, error: rpcErr } = await supabase.rpc(
          'exercises_for_equipment',
          {
            p_equipment: onlyBW ? [] : selectedEquip,
            p_focus: focus,
          }
        );

        if (!rpcErr && rpcData) {
          rows = (rpcData as any[]).map((r) => ({
            key: r.key,
            name: r.name,
            name_sv: r.name_sv,
            focus: r.focus ?? null,
            modality: r.modality ?? null,
            difficulty: (r.difficulty ?? 'medium') as DbExercise['difficulty'],
            bodyweight_ok: r.bodyweight_ok ?? null,
            description: r.description ?? null,
            description_sv: r.description_sv ?? null,
            description_en: (r as any).description_en ?? null,
          }));
        } else {
          let q = supabase
            .from('outdoor_exercises')
            .select(
              'key,name,name_sv,focus,modality,difficulty,bodyweight_ok,description,description_sv,description_en'
            );

          if (focus) q = q.eq('focus', focus);
          if (onlyBW || bodyweightOnly) q = q.eq('bodyweight_ok', true);

          const { data: base, error: baseErr } = await q;
          if (baseErr) throw baseErr;
          rows = (base ?? []) as DbExercise[];
        }

        // filter difficulty
        rows = rows.filter(
          (r) =>
            !r.difficulty ||
            allowedDifficulties(method.intensity as Intensity).includes(
              r.difficulty
            )
        );

        // enrich equipment map
        if (rows.length) {
          const exerciseKeys = rows.map((r) => r.key);
          const { data: mapRows, error: mapErr } = await supabase
            .from('exercise_equipment_map')
            .select('exercise_key,equipment_key')
            .in('exercise_key', exerciseKeys);
          if (mapErr) throw mapErr;

          const byEx: Record<string, string[]> = {};
          for (const m of mapRows ?? []) {
            if (!byEx[m.exercise_key]) byEx[m.exercise_key] = [];
            byEx[m.exercise_key].push(m.equipment_key);
          }
          rows = rows.map((r) => ({
            ...r,
            equipment_keys: byEx[r.key] ?? [],
          }));
        }

        // match equipment (and open_space special)
        if (selectedCanon.size) {
          const wantOpenSpace = selectedCanon.has('open_space');
          rows = rows.filter((r) => {
            const eq = (r.equipment_keys ?? []).map(normalizeEquipKey);
            const hasEquipMatch = eq.some((k) => selectedCanon.has(k));
            const isPureBW = eq.length === 0 && r.bodyweight_ok === true;
            return wantOpenSpace ? hasEquipMatch || isPureBW : hasEquipMatch;
          });
        }

        // Capitalize both language names once
        rows = rows.map((r) => ({
          ...r,
          name_sv: r.name_sv ? capitalize(r.name_sv) : r.name_sv,
          name: r.name ? capitalize(r.name) : r.name,
        }));

        if (!cancelled) setPool(rows);
      } catch (e) {
        console.warn('[Exercises] load failed', e);
        if (!cancelled) {
          setPool([]);
          Toast.show({
            type: 'error',
            text1: t('errors.fetchExercises', 'Kunde inte hämta övningar'),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // OBS: ta inte med `t` i dependencies (funktion), och temaobjekt behövs inte här
  }, [equipmentKeys.join(','), method.focus, bodyweightOnly, i18n.language]);

  // ---------- generera förslag ----------
  const suggestion = useMemo(() => {
    if (!pool.length) return [];
    const count = EX_COUNT_BY_DURATION[method.duration];

    const selectedRaw = equipmentKeys.length
      ? equipmentKeys
      : [...DEFAULT_EQUIPMENT_WHEN_EMPTY];
    const selectedCanon = new Set(
      expandSelectedEquipment(selectedRaw).map(normalizeEquipKey)
    );
    const wantOpenSpace = selectedCanon.has('open_space');

    const equipList = pool.filter((r) =>
      (r.equipment_keys ?? [])
        .map(normalizeEquipKey)
        .some((k) => selectedCanon.has(k))
    );
    const bwList = pool.filter(
      (r) =>
        (r.equipment_keys ?? []).length === 0 && r.bodyweight_ok === true
    );

    const targetEquip = Math.min(
      equipList.length,
      Math.max(1, Math.ceil(count * 0.5))
    );
    const takeEquip = seededShuffle(equipList, seed + ':equip').slice(
      0,
      targetEquip
    );
    const rest = count - takeEquip.length;
    const takeBW = wantOpenSpace
      ? seededShuffle(bwList, seed + ':bw').slice(0, Math.max(0, rest))
      : [];

    const picked = uniqueBy([...takeEquip, ...takeBW], (x) => x.key).slice(
      0,
      count
    );

    const sets = SETS_BY_DURATION[method.duration];
    const repsPerSet = REPS_BY_INTENSITY[method.intensity];

    return picked.map((ex) => ({
      key: ex.key,
      name: ex.name ?? ex.name_sv ?? ex.key,
      name_sv: ex.name_sv ?? ex.name ?? ex.key,
      description: pickDesc(ex),
      prescription: {
        sets,
        reps: Array.from({ length: sets }, () => repsPerSet),
        durationSeconds: null as number | null,
      },
      focus: (ex.focus ?? 'full') as Focus,
      equipment_keys: ex.equipment_keys ?? [],
    }));
  }, [pool, seed, method.duration, method.intensity, equipmentKeys.join(',')]);

  // initiera wizard-listan en gång
  useEffect(() => {
    if (pool.length && !exercises.length) {
      const first = buildSuggestion(pool, seed, method, equipmentKeys);
      setExercises(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.length]);

  // ---------- add exercise picker (derived data) ----------
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of pool)
      for (const k of r.equipment_keys ?? []) set.add(normalizeEquipKey(k));
    const list = Array.from(set).sort();
    return ['all', ...list];
  }, [pool]);

  const pickerItems = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    const notAlready = new Set(exercises.map((e) => e.key));
    return pool
      .filter((r) => !notAlready.has(r.key))
      .filter((r) => {
        if (pickerCat !== 'all') {
          const eq = (r.equipment_keys ?? []).map(normalizeEquipKey);
          if (!eq.includes(pickerCat)) return false;
        }
        if (!q) return true;
        const n1 = (r.name ?? '').toLowerCase();
        const n2 = (r.name_sv ?? '').toLowerCase();
        return n1.includes(q) || n2.includes(q);
      })
      .slice(0, 200);
  }, [pool, exercises, pickerCat, pickerSearch]);

  // helper to pick localized name
  const pickName = (r: {
    name?: string | null;
    name_sv?: string | null;
    key: string;
  }) =>
    i18n.language?.startsWith('en')
      ? r.name ?? r.name_sv ?? r.key
      : r.name_sv ?? r.name ?? r.key;

  function addExercise(r: DbExercise) {
    const sets = SETS_BY_DURATION[method.duration];
    const repsPerSet = REPS_BY_INTENSITY[method.intensity];
    if (exercises.some((e) => e.key === r.key)) {
      Toast.show({
        type: 'info',
        text1: t('exercises.toast.already', 'Övningen finns redan i listan'),
      });
      return;
    }
    setExercises([
      ...exercises,
      {
        key: r.key,
        name: r.name ?? r.name_sv ?? r.key,
        name_sv: r.name_sv ?? r.name ?? r.key,
        description: pickDesc(r),
        prescription: {
          sets,
          reps: Array.from({ length: sets }, () => repsPerSet),
          durationSeconds: null,
        },
        focus: (r.focus ?? 'full') as Focus,
        equipment_keys: r.equipment_keys ?? [],
      },
    ]);
    Toast.show({
      type: 'success',
      text1: t('exercises.toast.added', 'Övning tillagd'),
    });
  }

  // ---------- actions ----------
  function regenerateAll() {
    if (!pool.length) return;
    const exclude = new Set(exercises.map((e) => e.key));
    const newSeed = makeSeed(
      `${Date.now()}-${Math.random()}-${gym?.id ?? 'any'}`
    );
    setSeed(newSeed);
    const next = buildSuggestion(pool, newSeed, method, equipmentKeys, exclude);
    setExercises(next);
    Toast.show({
      type: 'success',
      text1: t('exercises.toast.newSuggestion', 'Nytt förslag skapat'),
      position: 'top',
    });
  }

  function rerollOne(index: number) {
    if (!pool.length || !exercises.length) return;

    const usedKeys = new Set(
      exercises.map((e, i) => (i === index ? '__skip__' : e.key))
    );

    const selectedRaw = equipmentKeys.length
      ? equipmentKeys
      : [...DEFAULT_EQUIPMENT_WHEN_EMPTY];
    const selectedCanon = new Set(
      expandSelectedEquipment(selectedRaw).map(normalizeEquipKey)
    );
    const wantOpenSpace = selectedCanon.has('open_space');

    const equipList = pool
      .filter((r) =>
        (r.equipment_keys ?? [])
          .map(normalizeEquipKey)
          .some((k) => selectedCanon.has(k))
      )
      .filter((r) => !usedKeys.has(r.key));

    const bwList = pool
      .filter(
        (r) =>
          (r.equipment_keys ?? []).length === 0 && r.bodyweight_ok === true
      )
      .filter((r) => !usedKeys.has(r.key));

    const currentEquipCount = exercises.filter(
      (e) => (e.equipment_keys ?? []).length > 0
    ).length;
    const needEquip = currentEquipCount < Math.ceil(exercises.length * 0.5);

    let poolChoice: DbExercise[] =
      needEquip && equipList.length
        ? equipList
        : wantOpenSpace && bwList.length
          ? bwList
          : equipList.length
            ? equipList
            : bwList;

    if (!poolChoice.length) {
      poolChoice = pool.filter((r) => !usedKeys.has(r.key));
    }

    const candidate = seededShuffle(
      poolChoice,
      `${seed}:single:${index}:${Date.now()}-${Math.random()}`
    ).find(Boolean);
    if (!candidate) {
      Toast.show({
        type: 'info',
        text1: t(
          'exercises.toast.noMore',
          'Inga fler övningar matchar ditt urval'
        ),
      });
      return;
    }

    const sets = SETS_BY_DURATION[method.duration];
    const repsPerSet = REPS_BY_INTENSITY[method.intensity];

    const next = [...exercises];
    next[index] = {
      key: candidate.key,
      name: candidate.name ?? candidate.name_sv ?? candidate.key,
      name_sv: candidate.name_sv ?? candidate.name ?? candidate.key,
      description: pickDesc(candidate),
      prescription: {
        sets,
        reps: Array.from({ length: sets }, () => repsPerSet),
        durationSeconds: null,
      },
      focus: (candidate.focus ?? 'full') as Focus,
      equipment_keys: candidate.equipment_keys ?? [],
    };
    setExercises(next);
  }

  function goPlan() {
    if (!suggestion.length) {
      Toast.show({
        type: 'info',
        text1: t('exercises.toast.noneYet', 'Inga övningar att visa än'),
      });
      return;
    }
    if (!exercises.length) setExercises(suggestion);
    router.push('/(tabs)/(train)/plan');
  }

  // ---------- render ----------
  const isEn = i18n.language?.startsWith('en');

  const metaLine = (() => {
    const methodName = isEn
      ? method?.name ?? method?.name_sv
      : method?.name_sv ?? method?.name;
    const gymName = gym?.name ?? '';
    return t(
      'exercises.meta',
      '{{method}} · {{duration}} min{{gym}}',
      {
        method: methodName ?? '',
        duration: method.duration,
        gym: gymName ? ` · ${gymName}` : '',
      }
    );
  })();

  return (
    <View style={[styles.container, { backgroundColor: tTheme.colors.bg }]}>
      <Text
        style={[styles.title, { color: tTheme.colors.text }]}
        accessibilityRole="header"
      >
        {t('train.titles.chooseExercises', {
          defaultValue: 'Välj dina övningar',
        })}
      </Text>

      <Text style={[styles.sub, { color: tTheme.colors.subtext }]}>
        {metaLine}
      </Text>

      <Text style={[styles.helper, { color: tTheme.colors.subtext }]}>
        {t(
          'exercises.helper',
          'Justera listan genom att slumpa om eller lägga till egna övningar.'
        )}
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={tTheme.colors.primary} />
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={exercises}
          keyExtractor={(it) => it.key}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Text style={{ color: tTheme.colors.subtext }}>
                {t(
                  'exercises.emptyList',
                  'Inga övningar föreslagna ännu. Prova att generera nya övningar.'
                )}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const eqKeys = Array.from(
              new Set((item.equipment_keys ?? []).map(normalizeEquipKey))
            );
            const hasChips = eqKeys.length > 0;

            return (
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: tTheme.colors.card,
                    borderColor: tTheme.colors.border,
                    shadowOpacity: 0,
                    elevation: 0,
                  },
                ]}
                accessible
                accessibilityRole="summary"
                accessibilityLabel={pickName(item)}
              >
                <Pressable
                  onPress={() => rerollOne(index)}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t(
                    'exercises.a11y.reroll',
                    'Slumpa ny övning'
                  )}
                  accessibilityHint={t(
                    'exercises.a11y.rerollHint',
                    'Byter ut den här övningen mot en annan som passar ditt valda upplägg.'
                  )}
                  style={({ pressed }) => [
                    styles.rerollFab,
                    {
                      borderColor: tTheme.colors.border,
                      backgroundColor: tTheme.colors.card,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={16}
                    color={tTheme.colors.text}
                    accessible={false}
                    importantForAccessibility="no"
                  />
                </Pressable>

                <Text style={[styles.cardTitle, { color: tTheme.colors.text }]}>
                  {pickName(item)}
                </Text>

                <Text
                  style={[styles.cardMetaStrong, { color: tTheme.colors.text }]}
                >
                  {formatSetsReps(
                    item.prescription.sets,
                    item.prescription.reps,
                    t
                  )}
                </Text>

                {hasChips && (
                  <View style={styles.chipsRow}>
                    {eqKeys.map((k) => (
                      <View
                        key={k}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: tTheme.colors.border,
                            borderColor: tTheme.colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: tTheme.colors.text },
                          ]}
                        >
                          {equipNames[k] ?? humanizeKey(k)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Add exercise button */}
      <Pressable
        onPress={() => setPickerOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('exercises.add', 'Lägg till övning')}
        accessibilityHint={t(
          'exercises.a11y.addHint',
          'Öppnar en lista där du kan lägga till fler övningar.'
        )}
        style={({ pressed }) => [
          styles.addButton,
          {
            borderColor: tTheme.colors.primary,
            backgroundColor: 'transparent',
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Ionicons
          name="add-circle-outline"
          size={20}
          color={tTheme.colors.primary}
          accessible={false}
          importantForAccessibility="no"
        />
        <Text style={[styles.addButtonText, { color: tTheme.colors.primary }]}>
          {t('exercises.add', 'Lägg till övning')}
        </Text>
      </Pressable>

      <View style={{ gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(
            'exercises.regenerate',
            'Generera nya övningar'
          )}
          accessibilityHint={t(
            'exercises.a11y.regenerateHint',
            'Skapar ett nytt förslag på övningar baserat på ditt upplägg.'
          )}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              borderColor: tTheme.colors.primary,
              backgroundColor: 'transparent',
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={regenerateAll}
        >
          <Text
            style={[styles.secondaryText, { color: tTheme.colors.primary }]}
          >
            {t('exercises.regenerate', 'Generera nya övningar')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(
            'common.continue',
            'Fortsätt'
          )}
          accessibilityHint={t(
            'exercises.a11y.continueHint',
            'Går vidare till din träningsplan.'
          )}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: tTheme.colors.primary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          onPress={goPlan}
        >
          <Text
            style={[styles.primaryText, { color: tTheme.colors.primaryText }]}
          >
            {t('common.continue', { defaultValue: 'Fortsätt' })}
          </Text>
        </Pressable>
      </View>

      {/* ---------- Picker Modal ---------- */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: tTheme.colors.bg,
                borderColor: tTheme.colors.border,
              },
            ]}
            accessible
            accessibilityViewIsModal
            accessibilityRole="dialog"
            accessibilityLabel={t(
              'exercises.add',
              'Lägg till övning'
            )}
          >
            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text
                style={[styles.sheetTitle, { color: tTheme.colors.text }]}
                accessibilityRole="header"
              >
                {t('exercises.add', 'Lägg till övning')}
              </Text>
              <Pressable
                onPress={() => setPickerOpen(false)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('common.close', 'Stäng')}
                accessibilityHint={t(
                  'exercises.a11y.closeHint',
                  'Stänger dialogen för att lägga till övningar.'
                )}
                style={({ pressed }) => [
                  styles.closeBtn,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={tTheme.colors.text}
                  accessible={false}
                  importantForAccessibility="no"
                />
              </Pressable>
            </View>

            {/* Subheader / gym context */}
            {gym?.name ? (
              <Text style={{ color: tTheme.colors.subtext, marginBottom: 8 }}>
                {t('exercises.basedOnGym', {
                  defaultValue: 'Baserat på utrustning på {{gym}}',
                  gym: gym.name,
                })}
              </Text>
            ) : null}

            {/* Search field */}
            <View
              style={[
                styles.searchWrap,
                {
                  borderColor: tTheme.colors.border,
                  backgroundColor: tTheme.colors.card,
                },
              ]}
            >
              <Ionicons
                name="search"
                size={16}
                color={tTheme.colors.subtext}
                accessible={false}
                importantForAccessibility="no"
              />
              <TextInput
                value={pickerSearch}
                onChangeText={setPickerSearch}
                placeholder={t(
                  'exercises.searchPlaceholder',
                  'Sök övningar...'
                )}
                placeholderTextColor={tTheme.colors.subtext}
                style={[styles.searchInput, { color: tTheme.colors.text }]}
              />
            </View>

            {/* Category chips (horizontal) */}
            <View style={{ marginTop: 6, marginBottom: 10 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  gap: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 2,
                }}
              >
                {categories.map((c) => {
                  const active = pickerCat === c;
                  const label =
                    c === 'all'
                      ? t('common.all', 'Alla')
                      : equipNames[c] ?? humanizeKey(c);
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setPickerCat(c)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={t(
                        'exercises.a11y.filter',
                        'Filtrera på {{category}}',
                        { category: label }
                      )}
                      style={({ pressed }) => [
                        styles.filterChip,
                        {
                          backgroundColor: tTheme.colors.card,
                          borderColor: tTheme.colors.border,
                        },
                        active && {
                          backgroundColor: tTheme.colors.primary,
                          borderColor: tTheme.colors.primary,
                        },
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          {
                            color: active
                              ? tTheme.colors.primaryText
                              : tTheme.colors.text,
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Candidate list */}
            <FlatList
              data={pickerItems}
              keyExtractor={(it) => it.key}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 16, paddingTop: 2 }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => {
                const eqKeys = Array.from(
                  new Set((item.equipment_keys ?? []).map(normalizeEquipKey))
                );
                const label = pickName(item);
                return (
                  <View
                    style={[
                      styles.pickRow,
                      {
                        backgroundColor: tTheme.colors.card,
                        borderColor: tTheme.colors.border,
                      },
                    ]}
                    accessible
                    accessibilityLabel={label}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          color: tTheme.colors.text,
                          fontWeight: '600',
                        }}
                      >
                        {label}
                      </Text>
                      {eqKeys.length ? (
                        <Text
                          style={{
                            color: tTheme.colors.subtext,
                            marginTop: 2,
                          }}
                        >
                          {eqKeys
                            .map((k) => equipNames[k] ?? humanizeKey(k))
                            .join(', ')}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => addExercise(item)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={t(
                        'exercises.a11y.addSpecific',
                        'Lägg till {{name}} i passet',
                        { name: label }
                      )}
                      style={({ pressed }) => [
                        styles.addIconBtn,
                        {
                          backgroundColor: tTheme.colors.border,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color={tTheme.colors.text}
                        accessible={false}
                        importantForAccessibility="no"
                      />
                    </Pressable>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Text style={{ color: tTheme.colors.subtext }}>
                    {t(
                      'exercises.empty',
                      'Inga övningar matchar filtret'
                    )}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ---------- helpers ----------
function isBodyweightOnly(keys: string[]) {
  return !keys.length || (keys.length === 1 && keys[0] === 'open_space');
}

// 32-bit FNV-1a hash → deterministiskt heltal för valfri sträng
function hash32(s: string) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// behåller din signatur men använder hash
function makeSeed(s: string) {
  return String(hash32(s));
}

// PRNG-baserad shuffle som fungerar med vilken seed-sträng som helst
function seededShuffle<T>(arr: T[], seedStr: string): T[] {
  const numeric = /^\d+$/.test(seedStr) ? Number(seedStr) : hash32(seedStr);
  let seed = (numeric || 1) >>> 0;

  const rand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) % 1_000_000) / 1_000_000;
  };

  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqueBy<T>(arr: T[], by: (x: T) => string) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of arr) {
    const k = by(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}
function capitalize(s?: string | null) {
  if (!s) return s ?? '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function allEqual<T>(arr: T[]) {
  return arr.length > 0 && arr.every((v) => v === arr[0]);
}
function formatSetsReps(
  sets: number,
  reps: number[],
  t: (key: string, defaultValue?: string, options?: any) => string
) {
  if (allEqual(reps)) {
    return t(
      'exercises.setsReps.uniform',
      '{{sets}} set x {{reps}} reps',
      { sets, reps: reps[0] }
    );
  }
  return t(
    'exercises.setsReps.mixed',
    '{{sets}} sets x {{scheme}} reps',
    { sets, scheme: reps.join('/') }
  );
}

// ---------- base styles (utan färger) ----------
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  title: { fontSize: 24, fontWeight: '800' },
  sub: { marginBottom: 2 },
  helper: { marginBottom: 6, fontSize: 13 },

  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 8,
    position: 'relative',
  },
  rerollFab: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    zIndex: 10,
    elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardMetaStrong: { fontWeight: '500' },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 10 },

  addButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 4,
  },
  addButtonText: { fontWeight: '700', fontSize: 16 },

  secondaryButton: {
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryText: { fontWeight: '700', fontSize: 16 },

  primaryButton: {
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 16,
  },
  primaryText: { fontWeight: '700', fontSize: 16 },

  // Modal sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  closeBtn: { position: 'absolute', right: 0, padding: 6 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 16 },

  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: { fontWeight: '600', fontSize: 12 },

  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  addIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});