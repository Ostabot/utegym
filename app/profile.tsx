
import { View, Text, Pressable } from 'react-native';
import { supabase } from '@/lib/supabase';

export default function Profile() {
  async function signIn() {
    // For demo: email OTP to your address (replace)
    await supabase.auth.signInWithOtp({ email: 'example@example.com', options: { emailRedirectTo: 'utegym://auth/callback' } });
  }
  async function signOut() { await supabase.auth.signOut(); }

  return (
    <View style={{ flex:1, padding:16, gap:12 }}>
      <Text style={{ fontSize:22, fontWeight:'700' }}>Profil</Text>
      <Pressable onPress={signIn} style={{ padding:12, backgroundColor:'#0ea5e9', borderRadius:10 }}>
        <Text style={{ color:'#fff', fontWeight:'700' }}>Logga in (demo)</Text>
      </Pressable>
      <Pressable onPress={signOut} style={{ padding:12, backgroundColor:'#ef4444', borderRadius:10 }}>
        <Text style={{ color:'#fff', fontWeight:'700' }}>Logga ut</Text>
      </Pressable>
    </View>
  );
}
