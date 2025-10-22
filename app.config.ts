import 'dotenv/config';
import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: "Utegym i Sverige",
  slug: "utegym",
  scheme: "utegym",
  ios: {
    bundleIdentifier: "com.utegym.app",
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "Vi använder din plats för att visa utegym nära dig."
    }
  },
  android: {
    package: "com.utegym.app",
    adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#ffffff" }
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  },
  experiments: { typedRoutes: true }
};
export default config;
