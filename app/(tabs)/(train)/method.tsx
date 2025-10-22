import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkoutMethods } from '@/hooks/useWorkoutMethods';
import { useWorkoutWizard } from '@/contexts/workout-wizard-context';
import { parseMethodScheme } from '@/utils/methods';

//tidigare TrainMethodScreen
export default function Method() {
  const router = useRouter();
  const { data } = useWorkoutMethods();
  const { method, setMethod } = useWorkoutWizard();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Välj träningsmetod</Text>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ gap: 12, paddingBottom: 120 }}
        renderItem={({ item }) => {
          const scheme = parseMethodScheme(item);
          return (
            <Pressable
              onPress={() => setMethod(item)}
              style={[styles.card, method?.key === item.key && styles.cardActive]}
            >
              <Text style={styles.cardTitle}>{item.name_sv ?? item.name}</Text>
              <Text style={styles.cardSubtitle}>{item.intensity ?? 'Okänd intensitet'}</Text>
              <Text style={styles.cardMeta}>Set: {scheme.sets}</Text>
              {scheme.reps ? <Text style={styles.cardMeta}>Reps: {scheme.reps.join(', ')}</Text> : null}
              {scheme.durationSeconds ? (
                <Text style={styles.cardMeta}>Tid: {Math.round(scheme.durationSeconds / 60)} min</Text>
              ) : null}
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Inga metoder tillgängliga just nu.</Text>}
      />

      <Pressable
        disabled={!method}
        onPress={() => router.push('/train/exercises')}
        style={[styles.primaryButton, !method && styles.primaryButtonDisabled]}
      >
        <Text style={styles.primaryButtonText}>Välj övningar</Text>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
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
  cardMeta: {
    color: '#0f172a',
  },
  empty: {
    textAlign: 'center',
    color: '#94a3b8',
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
  },
});
