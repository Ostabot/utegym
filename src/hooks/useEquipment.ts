import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/types';

type EqRow = Tables<'outdoor_equipment'>;
type EqPick = Pick<EqRow, 'key' | 'name' | 'name_sv' | 'category'>;

async function fetchEquipment(search?: string): Promise<EqPick[]> {
  let q = supabase
    .from('outdoor_equipment')
    .select('key,name,name_sv,category')
    .eq('is_active', true)
    .order('name_sv', { ascending: true });

  if (search && search.trim()) {
    // sök i både name och name_sv
    q = q.or(`name.ilike.%${search}%,name_sv.ilike.%${search}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as EqPick[];
}

/**
 * useEquipment – hämtar utrustning (valfri söksträng).
 *
 * @param opts.search  Filtrera på name/name_sv (ilike)
 * @param opts.enabled Toggle för att stänga av queryn
 */
export function useEquipment(opts?: { search?: string; enabled?: boolean }) {
  const search = opts?.search?.trim() || '';
  return useQuery({
    queryKey: ['equipment', search],
    queryFn: () => fetchEquipment(search || undefined),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: opts?.enabled ?? true,
  });
}