import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { useState } from 'react';
import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useGymDetails } from '@/hooks/useGymDetails';
import { useWorkoutWizard } from '@/contexts/workout-wizard-context';
import { pickAndUploadGymPhoto } from '@/lib/photos';
import { useSession } from '@/contexts/session-context';
import { supabase } from '@/lib/supabase';

export default function GymDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useGymDetails(id ?? null);
  const { setGym } = useWorkoutWizard();
  const { user } = useSession();
  const [uploading, setUploading] = useState(false);

  if (isLoading || !data) {
    return (
      <View style={styles.center}> 
        <ActivityIndicator />
      </View>
    );
  }

  if (!data.gym) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Gymmet kunde inte hittas.</Text>
      </View>
    );
  }

  const { gym, photos, equipment } = data;

  async function onStartWorkout() {
    setGym(gym);
    await Haptics.selectionAsync();
    router.push('/train/equipment');
  }

  async function onUploadPhoto() {
    if (!gym.id) return;
    setUploading(true);
    try {
      await pickAndUploadGymPhoto(gym.id, user?.id ?? null);
      Toast.show({ type: 'success', text1: 'Foto uppladdat!' });
      refetch();
    } catch (error) {
      console.error(error);
      Toast.show({ type: 'error', text1: 'Kunde inte ladda upp foto' });
    } finally {
      setUploading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{gym.name}</Text>
      <Text style={styles.subtitle}>{[gym.address, gym.city].filter(Boolean).join(', ')}</Text>
      <View style={styles.metaRow}>
        <Ionicons name="star" color="#facc15" size={16} />
        <Text style={styles.metaText}>{gym.google_rating ? `${gym.google_rating.toFixed(1)} / 5` : 'Ingen rating ännu'}</Text>
      </View>

      <View style={styles.buttonRow}>
        <Pressable style={styles.primaryButton} onPress={onStartWorkout}>
          <Text style={styles.primaryButtonText}>Starta pass här</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={onUploadPhoto} disabled={uploading}>
          <Text style={styles.secondaryButtonText}>{uploading ? 'Laddar...' : 'Lägg till foto'}</Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Utrustning</Text>
        {equipment.length === 0 ? (
          <Text style={styles.sectionSubtitle}>Inga registrerade utrustningsdetaljer ännu.</Text>
        ) : (
          <View style={styles.chipContainer}>
            {equipment.map((item) => (
              <View key={item.key} style={styles.chip}>
                <Text style={styles.chipText}>{item.name_sv ?? item.name}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bilder</Text>
        {isRefetching ? <ActivityIndicator /> : null}
        <View style={styles.photoGrid}>
          {photos.map((photo) => {
            const publicUrl = photo.name.startsWith('http')
              ? photo.name
              : supabase.storage.from('gym-photos').getPublicUrl(photo.name).data.publicUrl;
            return <Image key={photo.id} source={{ uri: publicUrl }} style={styles.photo} />;
          })}
          {photos.length === 0 ? <Text style={styles.sectionSubtitle}>Här blir det fint när communityt delar sina bilder.</Text> : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: '#64748b',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontWeight: '600',
    color: '#0f172a',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0ea5e9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0ea5e9',
    fontWeight: '700',
  },
  section: {
    marginTop: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#94a3b8',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0f2fe',
  },
  chipText: {
    color: '#0369a1',
    fontWeight: '600',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photo: {
    width: '48%',
    aspectRatio: 1.2,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  errorText: {
    color: '#ef4444',
    fontWeight: '600',
  },
});
