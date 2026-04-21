# @learnloop/mobile

Expo React Native companion app for LearnLoop. Talks to the web backend via
`/api/mobile/*` with a Bearer JWT stored in `expo-secure-store`.

## Stack

- Expo SDK 54 · expo-router · React Native 0.81
- NativeWind v4 (Tailwind for RN)
- expo-secure-store for token persistence
- Shared types from `@learnloop/types` (workspace package)

## Dev

From the repo root:

```bash
pnpm install
pnpm db:up && pnpm db:seed      # if not already seeded
pnpm dev                          # Next.js web on :3001
```

Then in another terminal:

```bash
cd mobile
pnpm start                        # expo start, scan QR with Expo Go
```

`mobile/lib/api.ts` auto-rewrites `localhost` to Metro's LAN IP so physical
devices on the same Wi-Fi reach the Next.js dev server at `http://<lan>:3001`.

Demo credentials are visible on the sign-in screen; tap any quick-demo card
to auto-fill.

## Prod API

For preview or production builds, point at the live web app:

```bash
EXPO_PUBLIC_API_URL=https://learnloop-ruby.vercel.app pnpm start
```

Or set the same variable in the EAS env for a `preview`/`production` profile.

## Build an APK (preview)

```bash
cd mobile
pnpm expo install --check          # align any SDK drift
pnpm dlx eas-cli@latest build --platform android --profile preview --non-interactive
```

Artifacts land in the EAS dashboard under the `learnloop-mobile` slug.

## Routes

| Path | Screen |
| :--- | :--- |
| `/` | Redirects based on auth state |
| `/signin` | Email + password login with demo quick-fill |
| `/(tabs)/home` | Streak, XP, level bar, today's next lesson |
| `/(tabs)/courses` | Enrolled courses with progress bars |
| `/(tabs)/profile` | Role, stats, badges, sign out |
| `/lesson/[id]` | Lesson content, mark-complete, reward toast |
