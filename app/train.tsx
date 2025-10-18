
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function Train() {
  const router = useRouter();
  return (
    <View style={{ flex:1, padding:16, gap:16 }}>
      <Text style={{ fontSize:22, fontWeight:'700' }}>Skapa träningspass</Text>
      <Pressable onPress={() => router.push('/workout/run')} style={{ padding:12, backgroundColor:'#16a34a', borderRadius:10 }}>
        <Text style={{ color:'#fff', fontWeight:'700' }}>Starta (demo)</Text>
      </Pressable>
    </View>
  );
}
