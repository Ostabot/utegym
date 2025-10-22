import { View, Text, Button } from "react-native";
import { supabase } from "@/lib/supabase";
export default function Profile(){
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>Profil</Text>
      <Button title="Logga ut" onPress={() => supabase.auth.signOut()} />
    </View>
  );
}
