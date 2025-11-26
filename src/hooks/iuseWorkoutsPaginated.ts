import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from 'src/contexts/session-context';

type Row = {
  id: string;
  plan: any;
  started_at: string | null;
  finished_at: string | null;
  meta: any;
  user_id: string | null;
};

const PAGE = 5;

export function useWorkoutsPaginated(tab: 'mine' | 'all') {
  const { user } = useSession();
  const [items, setItems] = useState<Row[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setOffset(0);
    try {
      let q = supabase
        .from('workout_sessions')
        .select('id, plan, started_at, finished_at, meta, user_id')
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false })
        .range(0, PAGE - 1);

      if (tab === 'mine' && user?.id) q = q.eq('user_id', user.id);

      const { data, error } = await q;
      if (!error && data) {
        setItems(data as Row[]);
        setHasMore((data as Row[]).length === PAGE);
        setOffset((data as Row[]).length);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, user?.id]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    try {
      let q = supabase
        .from('workout_sessions')
        .select('id, plan, started_at, finished_at, meta, user_id')
        .not('finished_at', 'is', null)
        .order('finished_at', { ascending: false })
        .range(offset, offset + PAGE - 1);

      if (tab === 'mine' && user?.id) q = q.eq('user_id', user.id);

      const { data, error } = await q;
      if (!error && data) {
        const rows = data as Row[];
        setItems((prev) => prev.concat(rows));
        setHasMore(rows.length === PAGE);
        setOffset((o) => o + rows.length);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, user?.id, offset, hasMore, loading]);

  useEffect(() => { reload(); }, [reload]);

  return { items, loading, hasMore, reload, loadMore };
}