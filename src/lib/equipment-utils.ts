// lib/equipment-utils.ts
import { supabase } from '@/lib/supabase';

export type EquipmentRow = { key: string; name: string; category?: string };

const FALLBACK_EQ: EquipmentRow[] = [
  { key: 'pullup_bar', name: 'Chinsräcke', category: 'Stänger' },
  { key: 'dip_bar', name: 'Dip-räcke', category: 'Stänger' },
  { key: 'situp_bench', name: 'Situp-bänk', category: 'Bänkar' },
  { key: 'box', name: 'Låda / plattform', category: 'Plattformar' },
  { key: 'open_area', name: 'Öppen yta', category: 'Övrigt' },
];

function capitalizeFirst(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function humanizeKey(key: string) {
  const map: Record<string, string> = {
    pullup_bar: 'Chinsräcke',
    dip_bar: 'Dip-räcke',
    situp_bench: 'Situp-bänk',
    open_area: 'Öppen yta',
  };
  if (map[key]) return map[key];
  return capitalizeFirst(key.replace(/_/g, ' ').replace(/\s+/g, ' '));
}

// 🔹 Hämta masterlista (för svenska namn)
export async function fetchEquipmentMaster(): Promise<EquipmentRow[]> {
  try {
    const { data, error } = await supabase
      .from('outdoor_equipment')
      .select('key,name_sv,name,category')
      .order('category', { ascending: true })
      .order('name_sv', { ascending: true });

    if (error || !data) return FALLBACK_EQ;
    const mapped = (data as any[]).map((r) => ({
      key: String(r.key),
      name: capitalizeFirst(String(r.name_sv ?? r.name ?? humanizeKey(String(r.key)))),
      category: capitalizeFirst(String(r.category ?? 'Övrigt')),
    }));
    const seen = new Set<string>();
    return [...mapped, ...FALLBACK_EQ].filter((r) => {
      if (seen.has(r.key)) return false;
      seen.add(r.key);
      return true;
    });
  } catch {
    return FALLBACK_EQ;
  }
}

// 🔹 Hjälpfunktion: slå upp svenska namn baserat på key
export async function getEquipmentNameSv(key: string): Promise<string> {
  const all = await fetchEquipmentMaster();
  const found = all.find((r) => r.key === key);
  return found?.name ?? humanizeKey(key);
}