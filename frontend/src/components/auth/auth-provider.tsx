"use client";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext<{ authenticated: boolean; setAuthenticated: (value: boolean) => void } | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => { fetch("/api/auth/session", { cache: "no-store", signal: controller.signal }).then(async r => { if (r.ok) { const data = await r.json(); setAuthenticated(data.authenticated === true); } }).catch(() => {}); };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); };
  }, []);
  return <AuthContext.Provider value={{ authenticated, setAuthenticated }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is required.");
  return context;
}
