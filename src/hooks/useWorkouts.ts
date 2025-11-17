// src/hooks/useWorkouts.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type WorkoutSessionRow = {
  id: string;
  user_id: string | null;
  started_at: string | null;
  finished_at: string | null;
  plan: any;
  meta: any;
  rating?: number | null;
  user_alias?: string | null;
  gym_name?: string | null;
  gym_image_url?: string | null;
};

type Filters = { gymId?: string; startDate?: string; endDate?: string };

async function fetchWorkouts(params: Filters): Promise<WorkoutSessionRow[]> {
  let q = supabase
    .from('workout_sessions')
    .select('id,user_id,started_at,finished_at,plan,meta')
    .order('finished_at', { ascending: false, nullsFirst: true })
    .order('started_at', { ascending: false })
    .limit(100);

  if (params.gymId) {
    q = q.filter('plan->gym->>id', 'eq', params.gymId);
  }
  if (params.startDate) q = q.gte('started_at', params.startDate);
  if (params.endDate) q = q.lte('started_at', params.endDate);

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((w: any) => {
    const toNum = (v: unknown): number | null => {
      if (v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const ratingNum = toNum(w?.meta?.rating ?? w?.rating);

    return {
      ...w,
      rating: toNum(w?.meta?.rating ?? w?.rating),          // ← garanterat number|null
      user_alias: w?.meta?.alias ?? null,
      gym_name: w?.plan?.gym?.name ?? null,
      gym_image_url: w?.plan?.gym?.image_url ?? null,
    } as WorkoutSessionRow;
  });
}

export function useWorkouts(filters: Filters) {
  return useQuery({
    queryKey: ['workout_sessions_base', filters],
    queryFn: () => fetchWorkouts(filters),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}