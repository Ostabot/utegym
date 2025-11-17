// app/run/test.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function RunTest() {
    const router = useRouter();
    return (
        <View style={s.c}>
            <Text style={s.h}>RUN / TEST</Text>
            <Text style={s.t}>Den här skärmen finns alltid.</Text>
            <Pressable style={s.b} onPress={() => router.replace('/(tabs)/(train)')}>
                <Text style={s.bt}>Tillbaka till guiden</Text>
            </Pressable>
        </View>
    );
}

const s = StyleSheet.create({
    c: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
    h: { fontSize: 22, fontWeight: '800' },
    t: { fontSize: 16, color: '#475569' },
    b: { borderWidth: 1, borderColor: '#0ea5e9', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16 },
    bt: { color: '#0ea5e9', fontWeight: '600' },
});