"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { AuthUser } from "@/types/feed";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    const endpoint = isDemo ? "/auth/demo-login" : "/auth/me";

    apiFetch<{ user: AuthUser }>(endpoint)
      .then(({ user }) => setUser(user))
      .catch((err) => {
        // If the server is still starting up (network error or 5xx) and we
        // haven't already retried this session, reload once automatically.
        const status = (typeof err === "object" && err !== null) ? (err as { status?: number }).status : undefined;
        const isServerError = err instanceof TypeError || (status !== undefined && status >= 500);

        const RELOAD_KEY = "tb_init_reloaded";
        if (isServerError && !sessionStorage.getItem(RELOAD_KEY)) {
          sessionStorage.setItem(RELOAD_KEY, "1");
          window.location.reload();
          return;
        }

        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
