import { create } from "zustand";

import { apiFetch } from "@/lib/api";
import { getAccessToken, setAccessToken } from "@/lib/auth";
import type { CurrentUserDto } from "@/lib/types/dashboard";

interface AuthState {
  user: CurrentUserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Синхронизация с React Query (дашборд). */
  setUser: (user: CurrentUserDto | null) => void;
  login: (token: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

/**
 * Клиентское состояние авторизации: профиль, флаги, загрузка /me с Bearer из localStorage.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: user !== null,
    }),

  login: async (token) => {
    setAccessToken(token);
    await get().fetchMe();
  },

  logout: () => {
    setAccessToken(null);
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  fetchMe: async () => {
    set({ isLoading: true });
    const token = getAccessToken();
    if (!token) {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return;
    }
    try {
      const res = await apiFetch("/auth/me");
      if (!res.ok) {
        if (res.status === 401) {
          setAccessToken(null);
        }
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }
      const user = (await res.json()) as CurrentUserDto;
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
