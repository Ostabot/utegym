#!/usr/bin/env bash
set -euo pipefail

REPO_HTTPS="https://github.com/Ostabot/utegym.git"
APP_NAME="Utegym i Sverige"
BUNDLE_ID="com.utegym.app"
SCHEME="utegym"

has_cmd() { command -v "$1" >/dev/null 2>&1; }
pm() { if has_cmd pnpm; then echo "pnpm"; else echo "npm"; fi; }
PKG_MANAGER=$(pm)

echo "==> Verifierar git"
if [ ! -d .git ]; then git init; fi
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO_HTTPS"
else
  git remote add origin "$REPO_HTTPS"
fi
git remote -v

echo "==> Installerar/uppdaterar dependencies"
$PKG_MANAGER i || true
# runtime
$PKG_MANAGER add @supabase/supabase-js @tanstack/react-query @react-native-async-storage/async-storage expo-secure-store || true
$PKG_MANAGER add zod react-hook-form || true
$PKG_MANAGER add expo-location expo-haptics expo-image-picker expo-image-manipulator expo-sharing expo-linking @expo/vector-icons react-native-toast-message dayjs || true
# styling
$PKG_MANAGER add nativewind || true
# dev
$PKG_MANAGER add -D tailwindcss typescript @types/react @types/react-native dotenv || true
# (OBS: inga @types/react-dom – RN behöver inte DOM-typer)

echo "==> Tailwind config"
if [ ! -f tailwind.config.js ]; then npx tailwindcss init -p; fi
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{tsx,ts}", "./components/**/*.{tsx,ts}"],
  theme: { extend: {} },
  plugins: [],
};
EOF

echo "==> .env"
[ -f .env.sample ] || cat > .env.sample << 'EOF'
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
EOF
[ -f .env ] || cp .env.sample .env

echo "==> app.config.ts"
if [ ! -f app.config.ts ]; then
cat > app.config.ts << EOF
import 'dotenv/config';
import { ExpoConfig } from 'expo/config';
const config: ExpoConfig = {
  name: "${APP_NAME}",
  slug: "utegym",
  scheme: "${SCHEME}",
  ios: { bundleIdentifier: "${BUNDLE_ID}", supportsTablet: false },
  android: { package: "${BUNDLE_ID}", adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#ffffff" } },
  extra: { supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL, supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY },
  experiments: { typedRoutes: true }
};
export default config;
EOF
fi

echo "==> Babel: lägg till nativewind/babel om saknas"
if [ -f babel.config.js ]; then
node - <<'EOF'
const fs=require('fs'); const p='babel.config.js';
let b=fs.readFileSync(p,'utf8');
if(!/plugins\s*:\s*\[/.test(b)){ b=b.replace(/module\.exports\s*=\s*function\s*\(\)\s*{\s*return\s*{/, m=>m+"\n  plugins: [],"); }
if(!b.includes("nativewind/babel")){
  b=b.replace(/plugins\s*:\s*\[/, m=>m.replace('[','[\'nativewind/babel\', '));
}
fs.writeFileSync(p,b);
EOF
fi

echo "==> Skapar mappar"
mkdir -p src/lib src/hooks src/features/home src/features/gym src/features/train src/features/feed src/features/profile src/components src/storage
mkdir -p 'app/(tabs)' 'app/(home)' 'app/(train)' 'app/(feed)' 'app/(profile)' app/gym app/feed app/train app/profile

echo "==> Supabase-typer placeholder"
[ -f src/lib/supabase.types.ts ] || cat > src/lib/supabase.types.ts << 'EOF'
// Lägg in genererade Supabase-typer här (supabase gen types ...).
export type Json = any;
EOF

echo "==> Supabase-klient"
[ -f src/lib/supabase.ts ] || cat > src/lib/supabase.ts << 'EOF'
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
const supabaseAnon = Constants.expoConfig?.extra?.supabaseAnonKey as string;

const storage = {
  getItem: async (k:string)=> (await SecureStore.getItemAsync(k)) ?? AsyncStorage.getItem(k),
  setItem: async (k:string,v:string)=>{ try{await SecureStore.setItemAsync(k,v);}catch{await AsyncStorage.setItem(k,v);} },
  removeItem: async (k:string)=>{ try{await SecureStore.deleteItemAsync(k);}catch{await AsyncStorage.removeItem(k);} },
};

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: { persistSession: true, storage, autoRefreshToken: true, detectSessionInUrl: false },
});

Linking.addEventListener('url', async (event) => {
  try {
    const { queryParams } = Linking.parse(event.url);
    if (queryParams?.code) await supabase.auth.exchangeCodeForSession({ code: String(queryParams.code) });
  } catch (e) { console.warn('Auth exchange error', e); }
});

export async function maybeExchangeCodeFromWeb(){
  if (typeof window !== 'undefined') {
    const url=new URL(window.location.href);
    const code=url.searchParams.get('code');
    if (code) await supabase.auth.exchangeCodeForSession({ code });
  }
}
EOF

echo "==> Root layout"
[ -f app/_layout.tsx ] || cat > app/_layout.tsx << 'EOF'
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import Toast from "react-native-toast-message";
import { maybeExchangeCodeFromWeb } from "@/src/lib/supabase";
const qc = new QueryClient();
export default function RootLayout(){
  useEffect(()=>{ maybeExchangeCodeFromWeb(); },[]);
  return (
    <QueryClientProvider client={qc}>
      <Stack screenOptions={{ headerShown:false }} />
      <Toast />
    </QueryClientProvider>
  );
}
EOF

echo "==> Tabs layout + index-länkar"
[ -f 'app/(tabs)/_layout.tsx' ] || cat > 'app/(tabs)/_layout.tsx' << 'EOF'
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
export default function TabsLayout(){
  return (
    <Tabs screenOptions={{ headerShown:false }}>
      <Tabs.Screen name="index" options={{ title:"Hem", tabBarIcon:({color,size})=><Ionicons name="home" size={size} color={color}/> }} />
      <Tabs.Screen name="train" options={{ title:"Träna", tabBarIcon:({color,size})=><Ionicons name="barbell" size={size} color={color}/> }} />
      <Tabs.Screen name="feed" options={{ title:"Flöde", tabBarIcon:({color,size})=><Ionicons name="list" size={size} color={color}/> }} />
      <Tabs.Screen name="profile" options={{ title:"Profil", tabBarIcon:({color,size})=><Ionicons name="person" size={size} color={color}/> }} />
    </Tabs>
  );
}
EOF
[ -f 'app/(tabs)/index.tsx' ] || cat > 'app/(tabs)/index.tsx' << 'EOF'
export { default } from "../(home)/index";
EOF
[ -f 'app/(tabs)/train.tsx' ] || cat > 'app/(tabs)/train.tsx' << 'EOF'
export { default } from "../(train)/index";
EOF
[ -f 'app/(tabs)/feed.tsx' ] || cat > 'app/(tabs)/feed.tsx' << 'EOF'
export { default } from "../(feed)/index";
EOF
[ -f 'app/(tabs)/profile.tsx' ] || cat > 'app/(tabs)/profile.tsx' << 'EOF'
export { default } from "../(profile)/index";
EOF

echo "==> Placeholder-sidor (skapas bara om de saknas)"
[ -f 'app/(home)/index.tsx' ] || cat > 'app/(home)/index.tsx' << 'EOF'
import { Link } from "expo-router";
import { View, Text } from "react-native";
export default function Home(){
  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold mb-2">Utegym nära dig</Text>
      <Link href="/gym/1" className="text-blue-600">Exempel: Gå till gym-detalj</Link>
    </View>
  );
}
EOF

[ -f 'app/gym/[id].tsx' ] || cat > 'app/gym/[id].tsx' << 'EOF'
import { useLocalSearchParams } from "expo-router";
import { View, Text, Button } from "react-native";
export default function GymDetail(){
  const { id } = useLocalSearchParams<{id:string}>();
  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold">Gym #{id}</Text>
      <Button title="Starta pass här" onPress={()=>{}} />
      <Button title="Lägg till foto" onPress={()=>{}} />
    </View>
  );
}
EOF

[ -f 'app/(train)/index.tsx' ] || cat > 'app/(train)/index.tsx' << 'EOF'
import { Link } from "expo-router";
import { View, Text, Button } from "react-native";
export default function TrainEntry(){
  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold">Träna — Steg 1 (Välj gym)</Text>
      <Link href="/train/plan" asChild><Button title="Vidare till plan" /></Link>
    </View>
  );
}
EOF

[ -f 'app/train/plan.tsx' ] || cat > 'app/train/plan.tsx' << 'EOF'
import { Link } from "expo-router";
import { View, Text, Button } from "react-native";
export default function TrainPlan(){
  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold">Steg 2–5 Översikt</Text>
      <Link href="/train/run" asChild><Button title="Starta" /></Link>
    </View>
  );
}
EOF

[ -f 'app/train/run.tsx' ] || cat > 'app/train/run.tsx' << 'EOF'
import { useState } from "react";
import { View, Text, Button } from "react-native";
export default function RunWorkout(){
  const [setsDone, setSetsDone] = useState(0);
  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold">Kör pass</Text>
      <Button title="Set klart" onPress={()=>setSetsDone(s=>s+1)} />
      <Text className="mt-2">Gjorda set: {setsDone}</Text>
      <Button title="Avsluta pass" onPress={()=>{}} />
    </View>
  );
}
EOF

[ -f 'app/(feed)/index.tsx' ] || cat > 'app/(feed)/index.tsx' << 'EOF'
import { View, Text } from "react-native";
export default function Feed(){
  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold">Flöde</Text>
    </View>
  );
}
EOF

[ -f 'app/feed/[workoutId].tsx' ] || cat > 'app/feed/[workoutId].tsx' << 'EOF'
import { useLocalSearchParams } from "expo-router";
import { View, Text } from "react-native";
export default function WorkoutDetail(){
  const { workoutId } = useLocalSearchParams<{workoutId:string}>();
  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold">Workout {workoutId}</Text>
    </View>
  );
}
EOF

[ -f 'app/(profile)/index.tsx' ] || cat > 'app/(profile)/index.tsx' << 'EOF'
import { View, Text, Button } from "react-native";
import { supabase } from "@/src/lib/supabase";
export default function Profile(){
  return (
    <View className="flex-1 p-4">
      <Text className="text-xl font-bold">Profil</Text>
      <Button title="Logga ut" onPress={async ()=>{ await supabase.auth.signOut(); }} />
    </View>
  );
}
EOF

echo "==> UI/Offline helpers"
[ -f src/components/ui.tsx ] || cat > src/components/ui.tsx << 'EOF'
import { Pressable, Text } from "react-native";
export function PrimaryButton({ title, onPress }: {title:string; onPress:() => void}) {
  return (
    <Pressable onPress={onPress} className="bg-black px-4 py-3 rounded-lg items-center">
      <Text className="text-white font-semibold">{title}</Text>
    </Pressable>
  );
}
EOF

[ -f src/storage/offline.ts ] || cat > src/storage/offline.ts << 'EOF'
import AsyncStorage from '@react-native-async-storage/async-storage';
const PENDING_KEY = "pending_workouts_v1";
export async function savePendingWorkout(w:any){ const cur=await AsyncStorage.getItem(PENDING_KEY); const arr=cur?JSON.parse(cur):[]; arr.push(w); await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(arr)); }
export async function readPendingWorkouts(){ const cur=await AsyncStorage.getItem(PENDING_KEY); return cur?JSON.parse(cur):[]; }
export async function clearPendingWorkouts(){ await AsyncStorage.removeItem(PENDING_KEY); }
EOF

echo "==> README"
[ -f README.md ] || cat > README.md << 'EOF'
# Utegym i Sverige (Expo/React Native)
- Expo SDK 54 + expo-router
- Supabase (auth + data) med SecureStore/AsyncStorage persist
- React Query, NativeWind (Tailwind-stil)
- Offline-stöd + enkel sync
- Deep link: utegym://auth/callback
## Kom igång
1. Kopiera `.env.sample` till `.env` och fyll `EXPO_PUBLIC_SUPABASE_URL` och `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
2. Starta: `npm run start` (eller `pnpm expo start` om du kör pnpm)
EOF

echo "==> global.css"
mkdir -p app
[ -f app/global.css ] || cat > app/global.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

echo "==> tsconfig paths"
if [ -f tsconfig.json ]; then
node - <<'EOF'
const fs=require('fs'); const p='tsconfig.json';
let ts=JSON.parse(fs.readFileSync(p,'utf8')); ts.compilerOptions=ts.compilerOptions||{};
ts.compilerOptions.baseUrl=ts.compilerOptions.baseUrl||"."; ts.compilerOptions.paths={...(ts.compilerOptions.paths||{}),"@/*":["./*"]};
fs.writeFileSync(p, JSON.stringify(ts,null,2));
EOF
fi

echo "==> package.json scripts"
if [ -f package.json ]; then
node - <<'EOF'
const fs=require('fs'); const p='package.json';
const pkg=JSON.parse(fs.readFileSync(p,'utf8'));
pkg.scripts={...(pkg.scripts||{}),
  "start":"expo start",
  "ios":"expo run:ios",
  "android":"expo run:android",
  "typecheck":"tsc --noEmit",
  "tailwind":"tailwindcss -i ./app/global.css -o ./app/tailwind.css"
};
fs.writeFileSync(p, JSON.stringify(pkg,null,2));
EOF
fi

echo "==> Git commit & push"
if ! git rev-parse --verify main >/dev/null 2>&1; then git checkout -b main; fi
git add .
if ! git diff --cached --quiet; then git commit -m "chore: bootstrap utegym (Expo + Supabase scaffold)"; fi
git push -u origin main || true

echo "✅ Klart! Kör nu:  npm run start"
