import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/types';

async function fetchMethods() {
  const { data, error } = await supabase
    .from('workout_methods')
    .select('*')
    .order('name_sv');
  if (error) throw error;
  return (data ?? []) as Tables<'workout_methods'>[];
}

export function useWorkoutMethods() {
  return useQuery({
    queryKey: ['workout-methods'],
    queryFn: fetchMethods,
  });
}
