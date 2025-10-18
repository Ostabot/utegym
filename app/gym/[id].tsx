
import { useLocalSearchParams } from 'expo-router';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/types';

export default function GymDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [gym, setGym] = useState<Tables<'gyms'> | null>(null);
  const [photos, setPhotos] = useState<Tables<'photos'>[]>([]);

  useEffect(() => {
    if (!id) return;
    supabase.from('gyms').select('*').eq('id', id).maybeSingle().then(({ data }) => setGym(data));
    supabase.from('photos').select('*').eq('gym_id', id).limit(12).then(({ data }) => setPhotos(data ?? []));
  }, [id]);

  const hero = useMemo(() => gym?.image_url ?? photos[0]?.name ?? null, [gym, photos]);

  if (!gym) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><Text>Laddar…</Text></View>;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>{gym.name}</Text>
      <Text style={{ color: '#666' }}>{[gym.address, gym.city].filter(Boolean).join(', ')}</Text>

      <Pressable style={{ padding: 12, backgroundColor: '#0ea5e9', borderRadius: 10, alignSelf: 'flex-start' }}
        onPress={() => { /* navigate to train with prefilled gym */ }}>
        <Text style={{ color: 'white', fontWeight: '600' }}>Skapa träningspass</Text>
      </Pressable>

      <Text style={{ marginTop: 12, fontWeight: '600' }}>Bilder</Text>
      <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
        {photos.map(p => <View key={p.id} style={{ width:'48%', height:100, backgroundColor:'#eee', borderRadius:8 }} />)}
      </View>
    </ScrollView>
  );
}
