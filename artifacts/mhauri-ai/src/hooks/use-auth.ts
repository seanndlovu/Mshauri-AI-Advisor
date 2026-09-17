import { useState, useEffect, useCallback } from "react";
import { useAuth as useClerkAuth, useClerk } from "@clerk/react";

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

export function useAuth() {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { signOut } = useClerk();
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;
    setState((current) => ({ ...current, loading: true }));
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load your Mshauri profile.");
        return res.json() as Promise<AuthUser>;
      })
      .then((user) => {
        if (!cancelled) setState({ user, loading: false });
      })
      .catch(() => {
        if (!cancelled) setState({ user: null, loading: false });
      });
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    await signOut({ redirectUrl: import.meta.env.BASE_URL });
    setState({ user: null, loading: false });
  }, [signOut]);

  return { user: state.user, loading: !isLoaded || state.loading, logout };
}
