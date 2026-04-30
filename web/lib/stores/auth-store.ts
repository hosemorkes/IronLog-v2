import { create } from "zustand";

import type { CurrentUserDto } from "@/lib/types/dashboard";

interface AuthState {
  user: CurrentUserDto | null;
  setUser: (user: CurrentUserDto | null) => void;
}

/**
 * Клиентское состояние профиля; синхронизируется с GET /auth/me после входа.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
