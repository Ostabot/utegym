import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'utegym.theme-preference';

type ThemePreference = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: Exclude<ColorSchemeName, undefined>;
  setPreference: (value: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [resolved, setResolved] = useState<Exclude<ColorSchemeName, undefined>>(Appearance.getColorScheme() ?? 'light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (preference === 'system') {
      const listener = ({ colorScheme }: { colorScheme: ColorSchemeName }) => {
        setResolved(colorScheme ?? 'light');
      };
      const subscription = Appearance.addChangeListener(listener);
      setResolved(Appearance.getColorScheme() ?? 'light');
      return () => subscription.remove();
    }

    setResolved(preference);
    return undefined;
  }, [preference]);

  const setPreference = useCallback(async (value: ThemePreference) => {
    setPreferenceState(value);
    await AsyncStorage.setItem(STORAGE_KEY, value);
  }, []);

  const value = useMemo(() => ({ preference, resolved, setPreference }), [preference, resolved, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemePreference must be used within ThemeProvider');
  return ctx;
}
