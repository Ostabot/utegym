import 'dotenv/config';
import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Utegym i Sverige',
  slug: 'utegym',
  scheme: 'utegym',

  ios: {
    bundleIdentifier: 'org.name.utegymisverige', // 🔹 små bokstäver och utan punkt i slutet
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Vi använder din plats för att hitta utegym i närheten.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Vi använder din plats för att visa utegym nära dig.',
      NSLocationAlwaysUsageDescription:
        'Vi använder din plats för att hitta utegym i närheten.',
    },
  },

  android: {
    package: 'org.name.utegymisverige', // 🔹 läggs till – krävs för prebuild
  },

  extra: {
    mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    ...process.env,
    sentryDsn: process.env.SENTRY_DSN,
    appEnv: process.env.APP_ENV ?? 'development',
  },

  plugins: [
    [
      '@rnmapbox/maps',
      {
        // 🔹 Uppdaterad till nya variabeln:
        RNMAPBOX_MAPS_DOWNLOAD_TOKEN: process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN,
      },
    ],
    'sentry-expo',
  ],
  
  experiments: {
    typedRoutes: true,
  },
};

export default config;