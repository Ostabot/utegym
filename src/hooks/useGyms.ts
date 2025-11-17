// src/hooks/useGyms.ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/types';

export type GymFilter = {
  search?: string;
  city?: string;
  minRating?: number;
};

type GymPreview = Pick<
  Tables<'gym_preview'>,
  'id' | 'name' | 'city' | 'lat' | 'lon' | 'image_url' | 'google_rating'
>;

const PAGE = 1000;

async function fetchGymsPaged(filter: GymFilter): Promise<GymPreview[]> {
  const rows: GymPreview[] = [];
  let from = 0;

  while (true) {
    let q = supabase
      .from('gym_preview')
      .select('id,name,city,lat,lon,image_url,google_rating')
      .range(from, from + PAGE - 1);

    // Fritext över name, city, address (samma som i tidigare useGyms)
    const s = (filter.search ?? '').trim();
    if (s) {
      const like = `%${s}%`;
      q = q.or(`name.ilike.${like},city.ilike.${like},address.ilike.${like}`);
    }

    if (filter.city) {
      q = q.ilike('city', `%${filter.city}%`);
    }

    if (filter.minRating != null) {
      q = q.gte('google_rating', filter.minRating);
    }

    const { data, error } = await q;
    if (error) throw error;

    const page = (data ?? []) as GymPreview[];
    rows.push(...page);

    // sista sidan: om vi fick färre än PAGE, bryt loopen
    if (page.length < PAGE) break;
    from += PAGE;
  }

  return rows;
}

export function useGyms(filter: GymFilter) {
  const queryKey = useMemo(() => ['gyms', filter], [filter]);

  return useQuery({
    queryKey,
    queryFn: () => fetchGymsPaged(filter),
    staleTime: 30_000,
  });
}