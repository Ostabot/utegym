import 'dotenv/config';
import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Utegym i Sverige',
  slug: 'utegym',
  scheme: 'utegym',

  // 🔼 Ny version (user-visible)
  version: '1.1.1',

  icon: './assets/icon.png',

  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#f47820',
  },

  ios: {
    bundleIdentifier: 'org.name.utegymisverige',
    usesAppleSignIn: true,

    // 🔼 Måste ökas för varje TestFlight-build
    buildNumber: '25',

    supportsTablet: true,

    splash: {
      image: './assets/splash.png',
      tabletImage: './assets/splash-landscape.png',
      resizeMode: 'contain',
      backgroundColor: '#f47820',
    },

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
    package: 'org.name.utegymisverige',

    // 🔼 Måste ökas i takt med iOS buildNumber
    versionCode: 2,

    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#f47820',
    },
  },

  extra: {
    mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    authCallbackUrl: 'utegym://auth/callback',

    eas: {
      projectId: 'd4fcfebb-dc3b-4134-9fcc-e87b1ad57202',
    },
  },

  plugins: [
    'expo-router',
    'expo-apple-authentication',
    'expo-web-browser',
    [
      '@rnmapbox/maps',
      {
        RNMAPBOX_MAPS_DOWNLOAD_TOKEN:
          process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Appen behöver din plats för att visa utegym nära dig.',
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },
};

export default config;