import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { getAccessToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";
import type { CurrentUserDto } from "@/lib/types/dashboard";

/** Единый staleTime для запросов дашборда (5 минут). */
export const DASHBOARD_STALE_MS = 5 * 60 * 1000;

function isDashboardQueryEnabled(): boolean {
  return typeof window !== "undefined" && !!getAccessToken();
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`Запрос не удался: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Профиль текущего пользователя; при успехе обновляет auth store.
 */
export function useCurrentUserQuery() {
  const setUser = useAuthStore((s) => s.setUser);
  const q = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async (): Promise<CurrentUserDto | null> => {
      const res = await apiFetch("/auth/me");
      if (res.status === 401) {
        return null;
      }
      return parseJsonOrThrow(res);
    },
    staleTime: DASHBOARD_STALE_MS,
    enabled: isDashboardQueryEnabled(),
  });

  useEffect(() => {
    if (q.isPending) {
      return;
    }
    setUser(q.data ?? null);
  }, [q.isPending, q.data, setUser]);

  return q;
}
