import { useState, useEffect, useCallback } from "react";

export type UserRole = "farmer" | "agribusiness" | "extension_officer" | "researcher" | "ngo";
export type AdminRole = "owner" | "price_editor" | "ad_manager";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  adminRole: AdminRole | null;
  location: string | null;
  reputationScore: number;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

let globalUser: AuthUser | null = null;
let globalLoading = true;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

async function fetchMe() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.ok) {
      globalUser = await res.json();
    } else {
      globalUser = null;
    }
  } catch {
    globalUser = null;
  }
  globalLoading = false;
  notify();
}

void fetchMe();

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: globalUser, loading: globalLoading });

  useEffect(() => {
    const update = () => setState({ user: globalUser, loading: globalLoading });
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Login failed");
    }
    globalUser = await res.json();
    globalLoading = false;
    notify();
    return globalUser!;
  }, []);

  const register = useCallback(async (data: { email: string; password: string; name: string; location?: string; role?: string }) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || "Registration failed");
    }
    globalUser = await res.json();
    globalLoading = false;
    notify();
    return globalUser!;
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    globalUser = null;
    notify();
  }, []);

  return { user: state.user, loading: state.loading, login, register, logout };
}
