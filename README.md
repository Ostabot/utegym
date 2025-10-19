# Utegym i Sverige

Expo/React Native-app för att upptäcka utegym, planera träningspass och dela pass genom Supabase.

## Kom igång

1. Installera beroenden:
   ```bash
   npm install
   ```
2. Lägg in Supabase-konfiguration i `app.json` (`supabaseUrl`, `supabaseAnon`).
3. Starta utvecklingsservern:
   ```bash
   npm start
   ```
4. Kör tester:
   ```bash
   npm test
   ```

## Miljövariabler

Expo läser Supabase-variabler via `app.json` → `expo.extra`. För lokal utveckling kan du använda `.env` och `app.config.js` om du vill byta projekt.

## Funktioner

- Expo Router (tabs/stacks) för Hem, Träna, Flöde och Profil.
- Supabase-klient med SecureStore + AsyncStorage för sessioner och deep-link bootstrap (`utegym://auth/callback`).
- Hemskärm med sök, stadsfilter, betygsfilter och distanssortering när plats finns.
- Gymdetaljer med utrustning, foton och foto-uppladdning till Supabase Storage.
- Träningsguide (5 steg) med React Hook Form + Zod, offline-draft i AsyncStorage.
- Passkörning med loggning av set/reps/vikt/RPE, autosparning lokalt och offline-sync till Supabase.
- Flöde med filtrering på gym och datum, träningsdetaljer.
- Profil med magisk länk/OAuth, alias-hantering, dark mode och pending-sync översikt.
- Grundläggande tests för helper-funktioner (`npm test`).

## Offline & synk

- Aktiva pass sparas lokalt (`AsyncStorage`).
- När sparande misslyckas (offline) läggs passet i en pending-lista.
- `usePendingWorkoutSync` försöker synka så fort nätverk finns (NetInfo).

## Design & UI

- Stilad med StyleSheet och konsistenta komponenter.
- Toasts via `react-native-toast-message` för fel/success.
- Haptics på viktiga actions (starta pass från gymdetalj).

## Deep links

- Magic links och OAuth använder `utegym://auth/callback`.
- `AuthBootstrapper` lyssnar på Expo Linking + web URL för att byta kod mot session.

