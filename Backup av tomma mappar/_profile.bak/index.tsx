// app/(profile)/index.tsx
import { View, Text, Button } from "react-native";
import { supabase } from "@/lib/supabase";

export default function Profile() {
  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold">Profil</Text>
      {/* TODO: visa användarinfo (e-post, avatar, mm) */}
      <Button
        title="Logga ut"
        onPress={async () => {
          await supabase.auth.signOut();
        }}
      />
    </View>
  );
}