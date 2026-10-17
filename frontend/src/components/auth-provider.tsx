"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api, ApiError } from "@/lib/api";
import type { LoginResponse, User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  retrySession: () => Promise<void>;
  login: (data: LoginResponse) => void;
  logout: () => void;
  expireSession: (expectedToken: string | null) => boolean;
  refreshUser: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);
const storageKey = "socialtrade_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionVersion = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const logout = useCallback(() => {
    sessionVersion.current++;
    setToken(null);
    setUser(null);
    setError(null);
    setLoading(false);
    sessionStorage.removeItem(storageKey);
    localStorage.removeItem(storageKey);
    localStorage.removeItem("socialtrade_user");
  }, []);
  const expireSession = useCallback(
    (expectedToken: string | null) => {
      if (
        !expectedToken ||
        sessionStorage.getItem(storageKey) !== expectedToken
      )
        return false;
      logout();
      return true;
    },
    [logout],
  );
  const login = useCallback((data: LoginResponse) => {
    sessionVersion.current++;
    sessionStorage.setItem(storageKey, data.access_token);
    localStorage.removeItem(storageKey);
    setToken(data.access_token);
    setUser(data.user);
    setError(null);
    setLoading(false);
  }, []);
  const refreshUser = useCallback(async () => {
    if (token) {
      const version = sessionVersion.current;
      try {
        const account = await api<User>("/api/auth/me", { token });
        if (version === sessionVersion.current) setUser(account);
      } catch (cause) {
        if (version !== sessionVersion.current) return;
        if (cause instanceof ApiError && cause.status === 401) logout();
        throw cause;
      }
    }
  }, [token, logout]);
  const retrySession = useCallback(async () => {
    const version = ++sessionVersion.current;
    const stored =
      sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
    if (!stored) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setToken(stored);
    try {
      const account = await api<User>("/api/auth/me", { token: stored });
      if (version !== sessionVersion.current) return;
      sessionStorage.setItem(storageKey, stored);
      localStorage.removeItem(storageKey);
      setUser(account);
    } catch (cause) {
      if (version !== sessionVersion.current) return;
      if (cause instanceof ApiError && cause.status === 401) logout();
      else
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível recuperar sua sessão.",
        );
    } finally {
      if (version === sessionVersion.current) setLoading(false);
    }
  }, [logout]);
  useEffect(() => {
    void retrySession();
    return () => {
      sessionVersion.current++;
    };
  }, [retrySession]);
  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        retrySession,
        login,
        logout,
        expireSession,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa de AuthProvider");
  return context;
}
