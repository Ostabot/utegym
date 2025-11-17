// src/app/(tabs)/index.tsx
import { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useGyms } from '@/hooks/useGyms';
import { useSession } from '@/contexts/session-context';
import WorkoutSummaryCard from '@/components/WorkoutSummaryCard';
import { useAppTheme } from '@/ui/useAppTheme';
import { useTranslation } from 'react-i18next';
import AccessiblePressable from '@/ui/AccessiblePressable';

type TabKey = 'mine' | 'all' | 'top';
const PAGE_SIZE = 5;

export default function Feed() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation();

  const [filters, setFilters] = useState<{ gymId?: string; startDate?: string; endDate?: string }>({});
  const [tab, setTab] = useState<TabKey>('all');
  const [page, setPage] = useState(1);

  const {
    data: workouts,
    isLoading,
    error,
    refetch,
  } = useWorkouts(filters);
  const { data: gyms } = useGyms({});
  const { user } = useSession();

  useEffect(() => {
    (async () => {
      const pref = await AsyncStorage.getItem('feed.defaultTab');
      if (pref === 'mine' || pref === 'all' || pref === 'top') {
        setTab(pref);
        await AsyncStorage.removeItem('feed.defaultTab');
      }
    })();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [tab, filters]);

  const allWorkouts = workouts ?? [];
  const completed = useMemo(
    () => allWorkouts.filter((w: any) => !!w?.finished_at),
    [allWorkouts]
  );

  function extractCardProps(w: any) {
    const plan = w?.plan ?? {};
    const dateISO: string =
      w?.finished_at ?? w?.started_at ?? w?.created_at ?? new Date().toISOString();

    const gymName = plan?.gym?.name ?? w?.gyms?.name ?? w?.gym?.name ?? null;
    const gymImageUrl =
      w?.meta?.photo_url ??
      plan?.gym?.image_url ??
      w?.gyms?.image_url ??
      w?.gym?.image_url ??
      null;

    const exercises = Array.isArray(plan?.exercises) ? plan.exercises : [];
    const method = plan?.method ?? {
      focus: w?.focus ?? null,
      intensity: w?.intensity ?? null,
      duration: w?.duration ?? null,
    };

    const toNum = (v: unknown): number | null => {
      if (v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const rating = toNum(w?.rating ?? w?.meta?.rating);
    const userAlias = w?.meta?.alias ?? w?.user_alias ?? w?.users?.alias ?? null;

    return { gymName, gymImageUrl, dateISO, exercises, method, rating, userAlias };
  }

  const myCompleted = useMemo(
    () => completed.filter((w: any) => w.user_id && w.user_id === user?.id),
    [completed, user?.id]
  );

  const baseItems = tab === 'mine' ? myCompleted : completed;
  const pagedItems = useMemo(
    () => baseItems.slice(0, page * PAGE_SIZE),
    [baseItems, page]
  );
  const hasMore = pagedItems.length < baseItems.length;

  const top10 = useMemo(() => {
    const map = new Map<string, number>();
    const alias = new Map<string, string | undefined>();
    for (const w of completed as any[]) {
      const uid = w.user_id ?? 'unknown';
      map.set(uid, (map.get(uid) ?? 0) + 1);
      const a = w?.user_alias ?? w?.meta?.alias ?? w?.users?.alias;
      if (a) alias.set(uid, a);
    }
    return Array.from(map.entries())
      .map(([uid, count]) => ({ uid, count, alias: alias.get(uid) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [completed]);

  const isNetworkError =
    !!error && /network|offline|fetch/i.test(String((error as any)?.message ?? ''));

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <Text
        style={[styles.title, { color: theme.colors.text }]}
        accessibilityRole="header"
      >
        {t('feed.title', 'Flöde')}
      </Text>

      {/* Error / offline-banner */}
      {error ? (
        <View
          style={[
            styles.errorCard,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.card },
          ]}
          accessible
          accessibilityRole="alert"
          accessibilityLabel={t('feed.error.title', 'Något gick fel')}
        >
          <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
            {t('feed.error.title', 'Något gick fel')}
          </Text>
          <Text style={[styles.errorMessage, { color: theme.colors.subtext }]}>
            {isNetworkError
              ? t(
                'feed.error.network',
                'Vi kunde inte ladda flödet. Kontrollera din internetuppkoppling och försök igen.'
              )
              : t(
                'feed.error.generic',
                'Vi kunde inte ladda flödet just nu. Prova igen om en stund.'
              )}
          </Text>
          {refetch ? (
            <AccessiblePressable
              onPress={() => refetch()}
              style={[styles.errorButton, { borderColor: theme.colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={t('feed.error.retry', 'Försök igen')}
              accessibilityHint={t(
                'feed.error.retryHint',
                'Försök att ladda om flödet.'
              )}
            >
              <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
                {t('feed.error.retry', 'Försök igen')}
              </Text>
            </AccessiblePressable>
          ) : null}
        </View>
      ) : null}

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['mine', 'all', 'top'] as TabKey[]).map((key) => {
          const active = tab === key;
          const label =
            key === 'mine'
              ? t('feed.tabs.mine', 'Mina pass')
              : key === 'all'
                ? t('feed.tabs.all', 'Alla pass')
                : t('feed.tabs.top', 'Topp 10');

          const a11yLabel = t('feed.tabs.accessibility.label', '{{tab}} flik', {
            tab: label,
          });
          const a11yHint = t(
            'feed.tabs.accessibility.hint',
            'Byt till fliken {{tab}}.',
            { tab: label }
          );

          return (
            <AccessiblePressable
              key={key}
              onPress={() => setTab(key)}
              style={[
                styles.tab,
                { borderColor: theme.colors.border },
                active && {
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.primary,
                },
              ]}
              accessibilityRole="tab"
              accessibilityLabel={a11yLabel}
              accessibilityHint={a11yHint}
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: theme.colors.text },
                  active && { color: theme.colors.primaryText },
                ]}
              >
                {label}
              </Text>
            </AccessiblePressable>
          );
        })}
      </View>

      {/* Listor */}
      {tab === 'top' ? (
        <FlatList
          data={top10}
          keyExtractor={(x) => x.uid}
          contentContainerStyle={{ gap: 12, paddingBottom: 120, paddingTop: 8 }}
          refreshing={isLoading}
          onRefresh={refetch}
          renderItem={({ item, index }) => (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: theme.colors.card,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '800',
                  width: 28,
                  textAlign: 'center',
                  color: theme.colors.text,
                }}
              >
                {index + 1}
              </Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: theme.colors.text,
                  }}
                >
                  {item.alias ?? `Användare ${item.uid.slice(0, 6)}`}
                </Text>
                <Text style={{ color: theme.colors.subtext, fontWeight: '600' }}>
                  {item.count} {t('feed.top.passCountSuffix', 'pass')}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                  {t('feed.empty.top.title', 'Inga pass ännu')}
                </Text>
                <Text style={[styles.emptyText, { color: theme.colors.subtext }]}>
                  {t(
                    'feed.empty.top.body',
                    'När fler användare loggar pass kommer de mest aktiva att visas här.'
                  )}
                </Text>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={pagedItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingBottom: 120, paddingTop: 8 }}
          refreshing={isLoading}
          onRefresh={refetch}
          onEndReachedThreshold={0.4}
          onEndReached={() => hasMore && setPage((p) => p + 1)}
          renderItem={({ item }) => {
            const p = extractCardProps(item);
            const dateLabel = new Date(p.dateISO).toLocaleDateString();
            const a11yLabel = p.gymName
              ? t(
                'feed.card.a11y.workoutAt',
                'Öppna detaljer för träningspass på {{gym}} den {{date}}',
                { gym: p.gymName, date: dateLabel }
              )
              : t(
                'feed.card.a11y.workout',
                'Öppna detaljer för träningspass den {{date}}',
                { date: dateLabel }
              );
            const a11yHint = t(
              'feed.card.a11y.hint',
              'Visar sammanfattning och detaljer för passet.'
            );

            return (
              <AccessiblePressable
                onPress={() => router.push(`/feed/${encodeURIComponent(item.id)}`)}
                accessibilityRole="button"
                accessibilityLabel={a11yLabel}
                accessibilityHint={a11yHint}
              >
                <WorkoutSummaryCard
                  gymName={p.gymName}
                  gymImageUrl={p.gymImageUrl}
                  dateISO={p.dateISO}
                  exercises={p.exercises}
                  method={p.method}
                  rating={p.rating}
                  userAlias={p.userAlias ?? '@användare'}
                />
              </AccessiblePressable>
            );
          }}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                  {tab === 'mine'
                    ? t('feed.empty.mine.title', 'Inga pass ännu')
                    : t('feed.empty.all.title', 'Inga pass i flödet')}
                </Text>
                <Text style={[styles.emptyText, { color: theme.colors.subtext }]}>
                  {tab === 'mine'
                    ? t(
                      'feed.empty.mine.body',
                      'Du har inte loggat några pass ännu. Starta ett pass från kartan eller skapa ett eget upplägg.'
                    )
                    : t(
                      'feed.empty.all.body',
                      'När användare börjar logga pass kommer de att visas här.'
                    )}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  title: { fontSize: 24, fontWeight: '700' },

  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabText: { fontWeight: '700' },

  // Error card
  errorCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
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
  emptyWrap: {
    marginTop: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center' },
});