import { useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useGyms, type GymFilter } from '@/hooks/useGyms';
import { useWorkoutWizard } from '@/contexts/workout-wizard-context';

export default function TrainSelectGymScreen() {
  const [filter, setFilter] = useState<GymFilter>({});
  const router = useRouter();
  const { data } = useGyms(filter);
  const { setGym, gym } = useWorkoutWizard();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Var vill du träna?</Text>
      <TextInput
        placeholder="Sök gym"
        value={filter.search ?? ''}
        onChangeText={(value) => setFilter((current) => ({ ...current, search: value }))}
        style={styles.input}
      />

      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setGym(item)}
            style={[styles.card, gym?.id === item.id && styles.cardActive]}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.city ?? 'Okänd stad'}</Text>
            {gym?.id === item.id ? (
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" style={{ marginTop: 8 }} />
            ) : null}
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Inga gym matchar din sökning.</Text>}
      />

      <Pressable
        disabled={!gym}
        onPress={() => router.push('/train/equipment')}
        style={[styles.primaryButton, !gym && styles.primaryButtonDisabled]}
      >
        <Text style={styles.primaryButtonText}>Fortsätt</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardActive: {
    borderColor: '#0ea5e9',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#64748b',
  },
  empty: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 32,
  },
  primaryButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
