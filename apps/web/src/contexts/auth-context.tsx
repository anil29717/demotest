"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch } from "@/lib/api";

export type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  trustScore: number;
  verified: boolean;
};

type AuthContextValue = {
  token: string | null;
  ready: boolean;
  user: UserProfile | null;
  setToken: (t: string | null) => void;
  refreshProfile: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "accessToken";
const COOKIE_KEY = "accessToken";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  const setToken = useCallback((t: string | null) => {
    setTokenState(t);
    if (typeof window === "undefined") return;
    if (t) {
      localStorage.setItem(STORAGE_KEY, t);
      document.cookie = `${COOKIE_KEY}=${encodeURIComponent(t)}; path=/; samesite=lax`;
    } else {
      localStorage.removeItem(STORAGE_KEY);
      document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; samesite=lax`;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const p = await apiFetch<UserProfile>("/user/profile", { token });
      setUser(p);
    } catch {
      setUser(null);
    }
  }, [token]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = localStorage.getItem(STORAGE_KEY);
    setTokenState(t);
    if (t) {
      document.cookie = `${COOKIE_KEY}=${encodeURIComponent(t)}; path=/; samesite=lax`;
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile, token]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, [setToken]);

  const value = useMemo(
    () => ({ token, ready, user, setToken, refreshProfile, logout }),
    [token, ready, user, setToken, refreshProfile, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
