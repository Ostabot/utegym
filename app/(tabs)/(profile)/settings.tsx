import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const INTENSITY_KEY = 'utegym.default-intensity';

export default function ProfileSettingsScreen() {
  const [intensity, setIntensity] = useState('medium');

  useEffect(() => {
    AsyncStorage.getItem(INTENSITY_KEY).then((stored) => {
      if (stored) setIntensity(stored);
    });
  }, []);

  async function save() {
    await AsyncStorage.setItem(INTENSITY_KEY, intensity);
    Toast.show({ type: 'success', text1: 'Inställningar sparade' });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Standardintensitet</Text>
      <TextInput
        placeholder="t.ex. medium"
        value={intensity}
        onChangeText={setIntensity}
        style={styles.input}
      />
      <Pressable style={styles.primaryButton} onPress={save}>
        <Text style={styles.primaryText}>Spara</Text>
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
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  primaryButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
});
