import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/types';

export interface WorkoutWithRelations extends Tables<'workouts'> {
  gyms: Tables<'gyms'> | null;
  workout_logs: Tables<'workout_logs'>[];
}

async function fetchWorkouts(params: { gymId?: string; startDate?: string; endDate?: string }) {
  let query = supabase
    .from('workouts')
    .select('*, gyms(*), workout_logs(*)')
    .order('started_at', { ascending: false })
    .limit(100);

  if (params.gymId) {
    query = query.eq('gym_id', params.gymId);
  }
  if (params.startDate) {
    query = query.gte('started_at', params.startDate);
  }
  if (params.endDate) {
    query = query.lte('started_at', params.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as WorkoutWithRelations[];
}

export function useWorkouts(filters: { gymId?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['workouts', filters],
    queryFn: () => fetchWorkouts(filters),
  });
}
