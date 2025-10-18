
# Utegym – Expo skeleton

This is a **minimal working skeleton** for your Utegym app using **Expo Router** with bottom tabs
(Hem → Träna → Flöde → Profil) and Supabase auth + data wired in.

## Quick start

1. Install deps
   ```bash
   npm i
   ```

2. Open `app.json` and set:
   - `extra.supabaseUrl` to your project URL (https://<ref>.supabase.co)
   - `extra.supabaseAnon` to your anon key
   - Optional: `scheme` to match your deep link (we set `utegym`).

3. Start
   ```bash
   npx expo start
   ```

### Auth
- Magic link deep links are handled by `src/lib/auth-bootstrapper.tsx`.
- For iOS/Android, make sure your redirect URL in Supabase Auth is `utegym://auth/callback`.

### Data
- Demo screens query `gyms`, `photos`, and `workouts` tables.
- Replace `src/lib/types.ts` with your generated `supabase.types.ts` when ready.

### Next
- Flesh out the Train wizard in `app/train.tsx` and `app/workout/run.tsx`.
- Add photo upload, rating, and feed sharing.
- Add offline storage (MMKV/SQLite) if needed.
