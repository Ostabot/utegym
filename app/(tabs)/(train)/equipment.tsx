import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  SectionList,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWorkoutWizard } from '@/contexts/workout-wizard-context';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/ui/useAppTheme';
import { useTranslation } from 'react-i18next';

type EqRow = { key: string; name: string; category: string };

const FALLBACK_EQ: EqRow[] = [
  { key: 'pullup_bar', name: 'Chinsräcke', category: 'Vanlig utrustning' },
  { key: 'dip_bar', name: 'Dip-räcke', category: 'Vanlig utrustning' },
  { key: 'situp_bench', name: 'Situp-bänk', category: 'Vanlig utrustning' },
  { key: 'box', name: 'Låda / plattform', category: 'Vanlig utrustning' },
  { key: 'open_area', name: 'Öppen yta', category: 'Vanlig utrustning' },
];

const DEFAULT_PICKED = ['pullup_bar', 'dip_bar', 'situp_bench', 'box', 'open_area'];

// Slug för kategorier (ikon-lookup + i18n-nyckel)
function slugifyCat(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Ikoner per kategorislug
const categoryIcons: Record<string, any> = {
  'bank-plattform': require('../../../assets/equipment/bank-plattform.png'),
  bas: require('../../../assets/equipment/bas.png'),
  konditionsutrustning: require('../../../assets/equipment/konditionsutrustning.png'),
  rig: require('../../../assets/equipment/rig.png'),
  'vanlig-utrustning': require('../../../assets/equipment/vanlig_utrustning.png'),
  'grepp-stang': require('../../../assets/equipment/grepp-stang.png'),
  hinderbana: require('../../../assets/equipment/hinderbana.png'),
  klatter: require('../../../assets/equipment/klatter.png'),
  'maskin-ovrigt': require('../../../assets/equipment/maskin.png'),
  maskin: require('../../../assets/equipment/maskin.png'),
  'ocr-hinder': require('../../../assets/equipment/ocr-hinder.png'),
  plattformar: require('../../../assets/equipment/plattformar.png'),
  accessory: require('../../../assets/equipment/accessory.png'),
  rorlighet: require('../../../assets/equipment/rorlighet.png'),
  'rorlighet-balans': require('../../../assets/equipment/rorlighet.png'),
  space: require('../../../assets/equipment/bas.png'),
  ovrigt: require('../../../assets/equipment/bas.png'),
  station: require('../../../assets/equipment/rig.png'),
  styrka: require('../../../assets/equipment/styrka.png'),
  stallning: require('../../../assets/equipment/rig.png'),
  stanger: require('../../../assets/equipment/rig.png'),
  'vikter-och-tillbehor': require('../../../assets/equipment/vikter.png'),
  'yta-och-ovrigt': require('../../../assets/equipment/ocr-hinder.png'),
};

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Bygg ett snyggt engelskt visningsnamn från key
function humanizeKey(key: string) {
  const map: Record<string, string> = {
    pullup_bar: 'Pull-up bar',
    dip_bar: 'Dip bar',
    situp_bench: 'Sit-up bench',
    open_area: 'Open area',
    box: 'Plyo box',
  };
  if (map[key]) return map[key];
  return cap(key.replace(/_/g, ' ').replace(/\s+/g, ' '));
}

function uniqueByKey(rows: EqRow[]): EqRow[] {
  const seen = new Set<string>();
  const out: EqRow[] = [];
  for (const r of rows) {
    if (!seen.has(r.key)) {
      seen.add(r.key);
      out.push(r);
    }
  }
  return out;
}
const uniqueStrings = (a: string[]) => Array.from(new Set(a));

export default function EquipmentScreen() {
  const theme = useAppTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { state, setEquipment, setGym } = useWorkoutWizard();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<EqRow[]>(FALLBACK_EQ);
  const [picked, setPicked] = useState<string[]>(
    state.equipment?.length ? state.equipment : DEFAULT_PICKED
  );

  // Återställ gym vid behov
  useEffect(() => {
    (async () => {
      if (state.gym) return;
      try {
        const raw = await AsyncStorage.getItem('wizard.lastGym');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.id) setGym(parsed);
        }
      } catch {
        // tyst fallback
      }
    })();
  }, [state.gym, setGym]);

  // Hämta masterlista (name är svenskt i DB; category är svenskt)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('outdoor_equipment')
          .select('key,name,category')
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (!error && data && alive) {
          const mapped = (data as any[]).map((r) => {
            const display =
              i18n.language?.startsWith('en')
                ? humanizeKey(String(r.key))
                : cap(String(r.name ?? humanizeKey(String(r.key))));
            return {
              key: String(r.key),
              name: display,
              category: cap(String(r.category ?? 'Övrigt')),
            } as EqRow;
          });

          const localizedFallback =
            i18n.language?.startsWith('en')
              ? FALLBACK_EQ.map((r) => ({ ...r, name: humanizeKey(r.key) }))
              : FALLBACK_EQ;

          setRows(uniqueByKey([...mapped, ...localizedFallback]));
        }
      } catch {
        // behåll fallback
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [i18n.language]);

  // Förvälj utrustning kopplad till gymmet
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!state.gym?.id) return;
      try {
        const { data: vw } = await supabase
          .from('gym_with_equipment')
          .select('equipment_keys')
          .eq('gym_id', state.gym.id)
          .maybeSingle();

        if (alive && vw?.equipment_keys && Array.isArray(vw.equipment_keys)) {
          setPicked((prev) => uniqueStrings([...prev, ...vw.equipment_keys]));
          return;
        }

        const { data: many } = await supabase
          .from('gym_equipment')
          .select('equipment_key')
          .eq('gym_id', state.gym.id);

        if (alive && many?.length) {
          setPicked((prev) =>
            uniqueStrings([...prev, ...many.map((r: any) => String(r.equipment_key))])
          );
        }
      } catch {
        // tyst fallback
      }
    })();
    return () => {
      alive = false;
    };
  }, [state.gym?.id]);

  // Sektioner: behåll ikon-slug från originalkategori, översätt rubrik via i18n
  const sections = useMemo(() => {
    const locale = i18n.language?.startsWith('sv') ? 'sv' : 'en';

    // Grupp efter kategori-slug
    const grouped = rows.reduce<Record<string, { orig: string; items: EqRow[] }>>(
      (acc, r) => {
        const slug = slugifyCat(r.category);
        if (!acc[slug]) acc[slug] = { orig: r.category, items: [] };
        acc[slug].items.push(r);
        return acc;
      },
      {}
    );

    const normal = Object.entries(grouped).map(([slug, { orig, items }]) => {
      const title =
        locale === 'en'
          ? t(`equipment.categories.${slug}`, { defaultValue: orig })
          : orig;
      return {
        slug,
        title,
        data: items.sort((a, b) => a.name.localeCompare(b.name, locale)),
      };
    });

    // Vanlig utrustning överst
    const commonTitle =
      locale === 'en'
        ? t('equipment.sections.common', 'Common equipment')
        : t('equipment.sections.common', 'Vanlig utrustning');

    const commonData = rows
      .filter((r) => DEFAULT_PICKED.includes(r.key))
      .sort((a, b) => a.name.localeCompare(b.name, locale));

    const normalSorted = normal
      .filter((s) => s.title !== 'Vanlig utrustning' && s.title !== commonTitle)
      .sort((a, b) => a.title.localeCompare(b.title, locale));

    return [
      { slug: 'vanlig-utrustning', title: commonTitle, data: commonData },
      ...normalSorted,
    ];
  }, [rows, i18n.language, t]);

  function toggle(key: string) {
    setPicked((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function onContinue() {
    const final = (picked.length ? picked : ['open_area']).filter(Boolean);
    setEquipment(final, final.length === 1 && final[0] === 'open_area');
    router.push('/(tabs)/(train)/method');
  }

  if (loading) {
    return (
      <View
        style={[styles.center, { backgroundColor: theme.colors.bg }]}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={t('equipment.loading', 'Loading equipment')}
      >
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 80 }}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View
            style={[styles.center, { padding: 16 }]}
            accessible
            accessibilityRole="text"
          >
            <Text style={{ color: theme.colors.subtext, textAlign: 'center' }}>
              {t(
                'equipment.empty',
                'No equipment available right now. Try again later.'
              )}
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            <Text
              style={{
                color: theme.colors.subtext,
                fontSize: 14,
                lineHeight: 20,
              }}
              accessibilityRole="text"
            >
              {t(
                'equipment.intro',
                'Välj den utrustning som du vill använda'
              )}
            </Text>
          </View>
        }
        renderSectionHeader={({ section }) => {
          const iconSrc = categoryIcons[section.slug];
          return (
            <View
              style={styles.sectionHeader}
              accessible
              accessibilityRole="header"
              accessibilityLabel={section.title}
            >
              {iconSrc ? (
                <Image
                  source={iconSrc}
                  style={[styles.sectionIcon, { tintColor: theme.colors.text }]}
                  resizeMode="contain"
                  // dekorativ ikon – läs inte upp
                  accessible={false}
                  importantForAccessibility="no"
                />
              ) : null}
              <Text style={[styles.section, { color: theme.colors.text }]}>
                {section.title}
              </Text>
            </View>
          );
        }}
        renderItem={({ item }) => {
          const active = picked.includes(item.key);

          const a11yLabel = t('equipment.item.a11yLabel', {
            defaultValue: '{{name}}, equipment item.',
            name: item.name,
          });

          const a11yHint = active
            ? t('equipment.item.a11yHintSelected', {
              defaultValue: 'Double tap to remove this equipment from your selection.',
            })
            : t('equipment.item.a11yHintNotSelected', {
              defaultValue: 'Double tap to add this equipment to your selection.',
            });

          return (
            <Pressable
              onPress={() => toggle(item.key)}
              style={[
                styles.row,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                },
                active && {
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.primary,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={a11yLabel}
              accessibilityHint={a11yHint}
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.rowText,
                  { color: theme.colors.text },
                  active && { color: theme.colors.primaryText },
                ]}
              >
                {item.name}
              </Text>
              <Text
                style={{
                  color: active ? theme.colors.primaryText : theme.colors.subtext,
                  fontSize: 18,
                }}
                accessible={false}
              >
                {active ? '✓' : '+'}
              </Text>
            </Pressable>
          );
        }}
      />

      <Pressable
        style={[styles.cta, { backgroundColor: theme.colors.primary }]}
        onPress={onContinue}
        accessibilityRole="button"
        accessibilityLabel={t(
          'equipment.cta.continue',
          'Continue with selected equipment'
        )}
        accessibilityHint={t(
          'equipment.cta.continueHint',
          'Goes to the next step where you choose your training method.'
        )}
      >
        <Text style={[styles.ctaText, { color: theme.colors.primaryText }]}>
          {t('equipment.cta.continue', 'Continue')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 6,
  },
  sectionIcon: { width: 22, height: 22 },
  section: { fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowText: { fontWeight: '600' },
  cta: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: { fontWeight: '800' },
});