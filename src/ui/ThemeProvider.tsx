// src/ui/ThemeProvider.tsx
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { light, dark, type Theme } from './theme';

const ThemeContext = createContext<Theme>(dark); // defaultar till mörkt

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = 'dark';

  // 🟢 Välj tema baserat på systemets färgschema (dark som default)
  const theme = useMemo<Theme>(() => {
    if (scheme === 'light') return light;
    return dark; // DARK som fallback/default
  }, [scheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

// Hook för att hämta aktuell theme överallt i appen
export const useAppTheme = () => useContext(ThemeContext);

// (valfritt alias om du använder "useTheme" någon annanstans)
export const useTheme = useAppTheme;