// src/contexts/theme-context.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Preference = 'system' | 'light' | 'dark';
type Resolved = 'light' | 'dark';

type ThemeCtx = {
  preference: Preference;                 // användarens val (eller 'system')
  resolved: Resolved;                     // faktiskt tema som används
  setPreference: (p: Preference) => void; // välj explicit
  toggleTheme: () => void;                // växla snabbt mellan ljus/mörk
};

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme(); // 'light' | 'dark' | null
  const [preference, setPreference] = useState<Preference>('system');

  // Ladda sparat användarval (t.ex. från profil)
  useEffect(() => {
    AsyncStorage.getItem('theme.pref').then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setPreference(saved);
      }
    });
  }, []);

  // Spara när användaren ändrar manuellt
  useEffect(() => {
    AsyncStorage.setItem('theme.pref', preference).catch(() => { });
  }, [preference]);

  const resolved: Resolved =
    preference === 'system'
      ? scheme === 'dark'
        ? 'dark'
        : 'light'
      : preference;

  const toggleTheme = () => {
    // Hoppa mellan light ↔ dark (system lämnas orörd)
    setPreference((prev) =>
      prev === 'dark' ? 'light' : prev === 'light' ? 'dark' : 'light'
    );
  };

  const value = useMemo(
    () => ({ preference, resolved, setPreference, toggleTheme }),
    [preference, resolved]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children ?? null}
    </ThemeContext.Provider>
  );
}

export function useThemePreference() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemePreference must be used within ThemeProvider');
  return ctx;
}