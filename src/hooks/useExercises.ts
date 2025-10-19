import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/types';

async function fetchExercises() {
  const { data, error } = await supabase
    .from('outdoor_exercises_v2')
    .select('key,name,name_sv,difficulty,equipment_keys,bodyweight_ok,tags,description')
    .limit(200);
  if (error) throw error;
  return (data ?? []) as Tables<'outdoor_exercises_v2'>[];
}

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: fetchExercises,
  });
}
