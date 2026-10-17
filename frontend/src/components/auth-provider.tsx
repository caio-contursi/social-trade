"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { LoginResponse, User } from "@/lib/types";

interface AuthContextValue { user: User | null; token: string | null; loading: boolean; login: (data: LoginResponse) => void; logout: () => void; refreshUser: () => Promise<void>; }
const AuthContext = createContext<AuthContextValue | null>(null);
const storageKey = "socialtrade_token";

export function AuthProvider({children}: {children:React.ReactNode}) {
  const [user,setUser] = useState<User|null>(null);
  const [token,setToken] = useState<string|null>(null);
  const [loading,setLoading] = useState(true);
  const logout = useCallback(() => { setToken(null);setUser(null);sessionStorage.removeItem(storageKey);localStorage.removeItem(storageKey);localStorage.removeItem("socialtrade_user"); },[]);
  const login = useCallback((data:LoginResponse) => { sessionStorage.setItem(storageKey,data.access_token);setToken(data.access_token);setUser(data.user); },[]);
  const refreshUser = useCallback(async () => { if(token) setUser(await api<User>("/api/auth/me",{token})); },[token]);
  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
    if(!stored) {setLoading(false);return;}
    let active = true;
    api<User>("/api/auth/me",{token:stored}).then(account => {if(active){sessionStorage.setItem(storageKey,stored);localStorage.removeItem(storageKey);setUser(account);setToken(stored);}}).catch(error => {if(active && error instanceof ApiError && error.status===401) logout();}).finally(()=>{if(active)setLoading(false);});
    return () => {active=false;};
  },[logout]);
  return <AuthContext.Provider value={{user,token,loading,login,logout,refreshUser}}>{children}</AuthContext.Provider>;
}

export function useAuth() { const context=useContext(AuthContext);if(!context)throw new Error("useAuth precisa de AuthProvider");return context; }
