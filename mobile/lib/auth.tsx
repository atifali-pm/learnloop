/**
 * Auth context. Holds the current user, hydrates from a stored Bearer token
 * on mount, exposes signIn / signOut / refresh.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiClientError } from "./api";
import type { MeResponse, MobileUser } from "@learnloop/types";

export type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: MobileUser; stats: MeResponse["stats"]; badges: MeResponse["badges"] };

type AuthContextValue = {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  const hydrate = useCallback(async () => {
    try {
      const me = await api.getMe();
      setState({
        status: "authenticated",
        user: me.user,
        stats: me.stats,
        badges: me.badges,
      });
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        await api.signOut();
      }
      setState({ status: "unauthenticated" });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const hasToken = await api.hasStoredToken();
      if (!hasToken) {
        if (!cancelled) setState({ status: "unauthenticated" });
        return;
      }
      if (!cancelled) await hydrate();
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  const signIn = useCallback(async (email: string, password: string) => {
    await api.signIn({ email, password });
    const me = await api.getMe();
    setState({
      status: "authenticated",
      user: me.user,
      stats: me.stats,
      badges: me.badges,
    });
  }, []);

  const signOut = useCallback(async () => {
    await api.signOut();
    setState({ status: "unauthenticated" });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ state, signIn, signOut, refresh: hydrate }),
    [state, signIn, signOut, hydrate],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
