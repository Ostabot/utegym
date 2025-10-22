import { View, Text, Button } from "react-native";
import { supabase } from "@/src/lib/supabase";
export default function Profile(){
  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold">Profil</Text>
      <Button title="Logga ut" onPress={async ()=>{ await supabase.auth.signOut(); }} />
    </View>
  );
}
