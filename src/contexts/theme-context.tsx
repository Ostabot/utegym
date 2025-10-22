// src/contexts/theme-context.tsx
import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

type Preference = 'system' | 'light' | 'dark';
type Resolved = 'light' | 'dark';

type ThemeCtx = {
  preference: Preference;
  resolved: Resolved;
  setPreference: (p: Preference) => void;
};

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme(); // 'light' | 'dark' | null
  const [preference, setPreference] = useState<Preference>('system');

  const resolved: Resolved =
    preference === 'system'
      ? scheme === 'dark'
        ? 'dark'
        : 'light'
      : preference;

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved]
  );

  // Viktigt: returnera bara Provider -> children (ingen textnod etc.)
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