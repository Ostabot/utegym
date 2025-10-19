import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/types';

async function fetchEquipment() {
  const { data, error } = await supabase
    .from('outdoor_equipment')
    .select('key,name,name_sv,category')
    .eq('is_active', true)
    .order('name_sv');
  if (error) throw error;
  return (data ?? []) as Tables<'outdoor_equipment'>[];
}

export function useEquipment() {
  return useQuery({
    queryKey: ['equipment'],
    queryFn: fetchEquipment,
  });
}
