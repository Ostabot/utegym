
import { View, Text, Pressable } from 'react-native';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function RunWorkout() {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  async function finish() {
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    const user_id = user.user?.id;
    if (!user_id) { setSaving(false); return; }
    await supabase.from('workouts').insert({ user_id, started_at: new Date().toISOString() });
    setSaving(false);
  }

  return (
    <View style={{ flex:1, padding:16, gap:16 }}>
      <Text style={{ fontSize:22, fontWeight:'700' }}>Pass steg {step}/3</Text>
      <Pressable onPress={() => setStep(s => Math.min(3, s+1))} style={{ padding:12, backgroundColor:'#0ea5e9', borderRadius:10 }}>
        <Text style={{ color:'#fff', fontWeight:'700' }}>Nästa</Text>
      </Pressable>
      <Pressable onPress={finish} disabled={saving} style={{ padding:12, backgroundColor:'#16a34a', borderRadius:10 }}>
        <Text style={{ color:'#fff', fontWeight:'700' }}>{saving ? 'Sparar…' : 'Avsluta & spara'}</Text>
      </Pressable>
    </View>
  );
}
