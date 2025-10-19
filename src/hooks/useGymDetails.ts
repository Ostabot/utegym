import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/types';

export interface GymDetailsResponse {
  gym: Tables<'gyms'> | null;
  equipment: Tables<'outdoor_equipment'>[];
  photos: Tables<'v_photos'>[];
}

async function fetchGym(id: string): Promise<GymDetailsResponse> {
  const [{ data: gym }, { data: equipment }, { data: photos }] = await Promise.all([
    supabase.from('gyms').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('gym_with_equipment')
      .select('equipment:outdoor_equipment(*)')
      .eq('gym_id', id),
    supabase.from('v_photos').select('*').eq('gym_id', id).limit(24),
  ]);

  return {
    gym: gym ?? null,
    equipment: (equipment ?? []).map((entry) => entry.equipment).filter(Boolean) as Tables<'outdoor_equipment'>[],
    photos: (photos ?? []) as Tables<'v_photos'>[],
  };
}

export function useGymDetails(id: string | null) {
  return useQuery({
    queryKey: ['gym', id],
    queryFn: () => {
      if (!id) throw new Error('missing id');
      return fetchGym(id);
    },
    enabled: Boolean(id),
  });
}
