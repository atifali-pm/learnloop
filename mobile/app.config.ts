import type { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Dynamic Expo config so the API URL can be swapped per environment without
 * editing a JSON file.
 *
 *   Local dev           : reads extra.apiUrl from here (resolved via the Metro
 *                         LAN IP by `mobile/lib/api.ts` when value is localhost).
 *   Preview APK build   : set EXPO_PUBLIC_API_URL=https://learnloop-ruby.vercel.app
 *                         before `eas build` or in the EAS env for the preview profile.
 *   Production AAB build: same pattern, with the production URL.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

  return {
    ...(config as ExpoConfig),
    name: "LearnLoop",
    slug: "learnloop-mobile",
    owner: "aatifali",
    version: "0.1.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "learnloop",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#10b981",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "dev.learnloop.app",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#10b981",
      },
      package: "dev.learnloop.app",
    },
    web: {
      bundler: "metro",
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      ["expo-splash-screen", { image: "./assets/splash.png", resizeMode: "contain", backgroundColor: "#10b981" }],
    ],
    experiments: { typedRoutes: true },
    extra: { apiUrl },
  };
};
