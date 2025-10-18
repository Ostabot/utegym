
import { View, Text, FlatList } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/types';

export default function Feed() {
  const [items, setItems] = useState<Tables<'workouts'>[]>([]);
  useEffect(() => {
    supabase.from('workouts').select('*').order('started_at', { ascending: false }).limit(50)
      .then(({ data, error }) => { if (!error && data) setItems(data); });
  }, []);

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:22, fontWeight:'700', marginBottom:12 }}>Flöde</Text>
      <FlatList
        data={items}
        keyExtractor={(w) => w.id}
        renderItem={({ item }) => (
          <View style={{ padding:12, borderRadius:12, backgroundColor:'#fff', marginBottom:8 }}>
            <Text style={{ fontWeight:'600' }}>{item.gym_id ?? 'Utegym'}</Text>
            <Text style={{ color:'#666' }}>{new Date(item.started_at).toLocaleString()}</Text>
          </View>
        )}
      />
    </View>
  );
}
