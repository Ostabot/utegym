// lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import sv from 'src/locales/sv.json';
import en from 'src/locales/en.json';

const STORAGE_KEY = 'utegym.lang';

async function detectLanguage(): Promise<'sv' | 'en'> {
  // 1) explicit användarval
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored === 'sv' || stored === 'en') return stored;

  // 2) device-språk → mappa till sv/en
  const tag = Localization.getLocales()?.[0]?.languageCode?.toLowerCase() ?? 'sv';
  return tag.startsWith('sv') ? 'sv' : 'en';
}

const resources = {
  sv: { translation: sv },
  en: { translation: en },
} as const;

// 🔑 Viktigt: initiera i18n + initReactI18next SYNKRONT
// så att react-i18next alltid har en instans innan useTranslation() körs.
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    compatibilityJSON: 'v3',
    resources,
    lng: 'sv',          // temporärt default – byts sen i initI18n()
    fallbackLng: 'sv',
    interpolation: { escapeValue: false },
    returnEmptyString: false,
  });
}

// Körs från appen för att använda rätt språk från start (AsyncStorage / device)
export async function initI18n() {
  const lng = await detectLanguage();
  await i18n.changeLanguage(lng);
}

export async function setAppLanguage(next: 'sv' | 'en') {
  await i18n.changeLanguage(next);
  await AsyncStorage.setItem(STORAGE_KEY, next);
}

export { i18n };