import { useEffect, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEquipment } from '@/hooks/useEquipment';
import { useWorkoutWizard } from '@/contexts/workout-wizard-context';

const schema = z.object({
  equipmentKeys: z.array(z.string()),
  bodyweightOnly: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

//tidigare TrainEquipmentScreen
export default function Equipment() {
  const router = useRouter();
  const { data } = useEquipment();
  const { equipmentKeys, bodyweightOnly, setEquipment } = useWorkoutWizard();

  const defaultValues = useMemo(() => ({
    equipmentKeys: equipmentKeys ?? [],
    bodyweightOnly: bodyweightOnly ?? false,
  }), [equipmentKeys, bodyweightOnly]);

  const { control, handleSubmit, watch, setValue } = useForm<FormValues>({
    defaultValues,
    resolver: zodResolver(schema),
  });

  const bodyweightOnlyValue = watch('bodyweightOnly');
  const selectedEquipment = watch('equipmentKeys');

  useEffect(() => {
    if (bodyweightOnlyValue && selectedEquipment.length > 0) {
      setValue('equipmentKeys', []);
    }
  }, [bodyweightOnlyValue, selectedEquipment, setValue]);

  const toggleEquipment = (key: string) => {
    const current = selectedEquipment;
    if (current.includes(key)) {
      setValue(
        'equipmentKeys',
        current.filter((item) => item !== key),
      );
    } else {
      setValue('equipmentKeys', [...current, key]);
    }
  };

  const onSubmit = handleSubmit((values) => {
    setEquipment(values.equipmentKeys, values.bodyweightOnly);
    router.push('/train/method');
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vilken utrustning vill du använda?</Text>
      <Controller
        control={control}
        name="bodyweightOnly"
        render={({ field: { value, onChange } }) => (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Endast kroppsvikt</Text>
            <Switch value={value} onValueChange={(val) => onChange(val)} />
          </View>
        )}
      />

      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ gap: 12, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => toggleEquipment(item.key)}
            style={[
              styles.card,
              selectedEquipment.includes(item.key) ? styles.cardActive : undefined,
            ]}
            disabled={bodyweightOnlyValue}
          >
            <Text style={styles.cardTitle}>{item.name_sv ?? item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.category ?? 'Okänd kategori'}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Ingen utrustning tillgänglig.</Text>}
      />

      <Pressable style={styles.primaryButton} onPress={onSubmit}>
        <Text style={styles.primaryText}>Nästa steg</Text>
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardActive: {
    borderColor: '#0ea5e9',
  },
  cardTitle: {
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#64748b',
    marginTop: 4,
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
  primaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
