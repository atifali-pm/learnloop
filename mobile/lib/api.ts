/**
 * Typed fetch client for the LearnLoop mobile app.
 *
 * Reads the API base from `extra.apiUrl` in app.config.ts. For local dev
 * where `apiUrl` is `localhost`, we rewrite the host to the Metro LAN IP so
 * physical devices on the same Wi-Fi can reach the Next.js dev server.
 *
 * Bearer token is persisted via `expo-secure-store` (falls back to
 * localStorage on web for expo start --web).
 */
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as SecureStoreNative from "expo-secure-store";
import type {
  ApiError,
  CatalogResponse,
  CompleteLessonResponse,
  CoursesResponse,
  EnrollResponse,
  LeaderboardResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
} from "@learnloop/types";

const SecureStore =
  Platform.OS === "web"
    ? {
        getItemAsync: async (key: string) =>
          typeof localStorage !== "undefined" ? localStorage.getItem(key) : null,
        setItemAsync: async (key: string, value: string) => {
          if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
        },
        deleteItemAsync: async (key: string) => {
          if (typeof localStorage !== "undefined") localStorage.removeItem(key);
        },
      }
    : SecureStoreNative;

const TOKEN_KEY = "learnloop.auth.token";

function resolveApiUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  const raw = extra?.apiUrl ?? "http://localhost:3001";

  // Non-localhost URL → use as-is (staging / production).
  if (!raw.includes("localhost") && !raw.includes("127.0.0.1")) {
    return raw;
  }

  // Localhost → rewrite host to Metro's LAN IP so phones on the same Wi-Fi
  // can reach the dev server.
  const hostUri =
    (Constants.expoConfig?.hostUri as string | undefined) ??
    (Constants.expoGoConfig?.debuggerHost as string | undefined);
  if (hostUri) {
    const host = hostUri.split(":")[0];
    const port = raw.match(/:(\d+)/)?.[1] ?? "3001";
    return `http://${host}:${port}`;
  }
  return raw;
}

const API_URL = resolveApiUrl();

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log(`[learnloop-mobile] API base URL = ${API_URL}`);
}

export class ApiClientError extends Error {
  status: number;
  body?: ApiError;
  constructor(status: number, body: ApiError) {
    super(body.error);
    this.name = "ApiClientError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (init.auth !== false) {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;
  if (!res.ok) {
    throw new ApiClientError(
      res.status,
      (data as ApiError) ?? { error: res.statusText || "request_failed" },
    );
  }
  return data as T;
}

export const api = {
  async signIn(input: LoginRequest): Promise<LoginResponse> {
    const res = await request<LoginResponse>("/api/mobile/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
      auth: false,
    });
    await SecureStore.setItemAsync(TOKEN_KEY, res.token);
    return res;
  },

  async signOut(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },

  async hasStoredToken(): Promise<boolean> {
    const t = await SecureStore.getItemAsync(TOKEN_KEY);
    return Boolean(t);
  },

  async getMe(): Promise<MeResponse> {
    return request<MeResponse>("/api/mobile/me");
  },

  async getCourses(): Promise<CoursesResponse> {
    return request<CoursesResponse>("/api/mobile/courses");
  },

  async completeLesson(
    lessonId: string,
    answers?: Record<string, string>,
  ): Promise<CompleteLessonResponse> {
    return request<CompleteLessonResponse>(
      `/api/mobile/lessons/${encodeURIComponent(lessonId)}/complete`,
      {
        method: "POST",
        body: answers ? JSON.stringify({ answers }) : undefined,
      },
    );
  },

  async getLeaderboard(): Promise<LeaderboardResponse> {
    return request<LeaderboardResponse>("/api/mobile/leaderboard");
  },

  async getCatalog(): Promise<CatalogResponse> {
    return request<CatalogResponse>("/api/mobile/catalog");
  },

  async enroll(courseId: string): Promise<EnrollResponse> {
    return request<EnrollResponse>("/api/mobile/enrollments", {
      method: "POST",
      body: JSON.stringify({ courseId }),
    });
  },
};

export { API_URL };
