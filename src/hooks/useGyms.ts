import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/types';

export type GymFilter = {
  search?: string;
  city?: string;
  minRating?: number;
};

async function fetchGyms(filter: GymFilter) {
  const builder = supabase.from('gym_preview').select('id,name,city,lat,lon,image_url,google_rating').limit(200);

  if (filter.search) {
    builder.ilike('name', `%${filter.search}%`);
  }
  if (filter.city) {
    builder.ilike('city', `%${filter.city}%`);
  }
  if (filter.minRating) {
    builder.gte('google_rating', filter.minRating);
  }

  const { data, error } = await builder;
  if (error) throw error;
  return (data ?? []) as Tables<'gym_preview'>[];
}

export function useGyms(filter: GymFilter) {
  return useQuery({
    queryKey: ['gyms', filter],
    queryFn: () => fetchGyms(filter),
  });
}
