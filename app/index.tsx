
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/types';

export default function Home() {
  const [gyms, setGyms] = useState<Tables<'gyms'>[]>([]);
  const router = useRouter();

  useEffect(() => {
    supabase.from('gyms').select('id,name,city,lat,lon,image_url').limit(50)
      .then(({ data, error }) => { if (!error && data) setGyms(data); });
  }, []);

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Utegym nära dig</Text>
      <FlatList
        data={gyms}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: '/gym/[id]', params: { id: item.id } })}
            style={{ padding: 12, borderRadius: 12, backgroundColor: '#fff', marginBottom: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
            <Text style={{ color: '#666' }}>{item.city ?? '—'}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
