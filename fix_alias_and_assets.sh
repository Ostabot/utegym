#!/usr/bin/env bash
set -euo pipefail

echo "==> 1) Installera babel-plugin-module-resolver (för @-alias i Metro)"
npm i -D babel-plugin-module-resolver

echo "==> 2) Patcher babel.config.js med module-resolver och nativewind"
if [ -f babel.config.js ]; then
  node - <<'EOF'
const fs=require('fs');const p='babel.config.js';
let s=fs.readFileSync(p,'utf8');

// Se till att det finns en plugins-array
if(!/plugins\s*:\s*\[/.test(s)){
  s=s.replace(/return\s*{/, m=>m+"\n  plugins: [],");
}

// Lägg in nativewind om saknas
if(!s.includes("nativewind/babel")){
  s=s.replace(/plugins\s*:\s*\[/, m=>m.replace('[',"['nativewind/babel', "));
}

// Lägg in module-resolver om saknas
if(!s.includes("module-resolver")){
  s=s.replace(/plugins\s*:\s*\[/, m=>m.replace('[',"[['module-resolver',{ 'root':['.'], 'alias':{ '@':'./' } }], "));
}

fs.writeFileSync(p,s);
EOF
else
  cat > babel.config.js <<'EOF'
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', { root: ['.'], alias: { '@': './' } }],
      'nativewind/babel',
      'expo-router/babel',
    ],
  };
};
EOF
fi

echo "==> 3) Säkerställ tsconfig-paths (@ -> ./)"
if [ -f tsconfig.json ]; then
  node - <<'EOF'
const fs=require('fs');const p='tsconfig.json';
let ts=JSON.parse(fs.readFileSync(p,'utf8'));
ts.compilerOptions=ts.compilerOptions||{};
ts.compilerOptions.baseUrl=ts.compilerOptions.baseUrl||".";
ts.compilerOptions.paths={...(ts.compilerOptions.paths||{}), "@/*":["./*"]};
fs.writeFileSync(p, JSON.stringify(ts,null,2));
EOF
fi

echo "==> 4) Skapa proxy-filer så både '@/lib/...' och '@/src/lib/...' fungerar"
mkdir -p lib src/lib
# supabase proxy -> vidarebefordra till src/lib/supabase
if [ ! -f lib/supabase.ts ]; then
  cat > lib/supabase.ts <<'EOF'
export * from '../src/lib/supabase';
export { default } from '../src/lib/supabase';
EOF
fi
# types proxy (om koden använder '@/lib/types')
if [ ! -f lib/types.ts ]; then
  # Försök re-exportera genererade typer om de finns, annars minimal stub
  if [ -f src/lib/supabase.types.ts ]; then
    cat > lib/types.ts <<'EOF'
export * from '../src/lib/supabase.types';
EOF
  else
    cat > lib/types.ts <<'EOF'
// Minimal typ-stub tills supabase.types.ts finns
export type Tables<T extends string = any> = any;
EOF
  fi
fi

echo "==> 5) Lägg till assets/adaptive-icon.png (placeholder 1024x1024)"
mkdir -p assets
if [ ! -f assets/adaptive-icon.png ]; then
  # 1x1 vit PNG (base64) som funkar som placeholder i väntan på riktig ikon
  base64 <<'B64' | base64 --decode > assets/adaptive-icon.png
iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6mR/QAAAAASUVORK5CYII=
B64
fi

# (valfritt) skapa även en vanlig icon.png så expo klagar mindre
if [ ! -f assets/icon.png ]; then
  cp assets/adaptive-icon.png assets/icon.png
fi

echo "==> 6) Rensa cache och starta om Metro (när du kör manuellt)"
echo "   Kör:  npx expo start -c"