import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { getAccessToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth-store";
import type {
  CurrentUserDto,
  RecentPrListDto,
  UserAchievementFeedDto,
  UserProgressDto,
} from "@/lib/types/dashboard";

/** Единый staleTime для дашборда (5 минут). */
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

/** Сводка прогресса для дашборда. */
export function useUserProgressQuery() {
  return useQuery({
    queryKey: ["user", "progress"],
    queryFn: async (): Promise<UserProgressDto | null> => {
      const res = await apiFetch("/user/progress");
      if (res.status === 401) {
        return null;
      }
      return parseJsonOrThrow(res);
    },
    staleTime: DASHBOARD_STALE_MS,
    enabled: isDashboardQueryEnabled(),
  });
}

/** Недавние PR. */
export function useRecentPrsQuery() {
  return useQuery({
    queryKey: ["user", "progress", "recent-prs"],
    queryFn: async (): Promise<RecentPrListDto | null> => {
      const res = await apiFetch("/user/progress/recent-prs");
      if (res.status === 401) {
        return null;
      }
      return parseJsonOrThrow(res);
    },
    staleTime: DASHBOARD_STALE_MS,
    enabled: isDashboardQueryEnabled(),
  });
}

/** Лента достижений. */
export function useAchievementsFeedQuery() {
  return useQuery({
    queryKey: ["user", "achievements"],
    queryFn: async (): Promise<UserAchievementFeedDto | null> => {
      const res = await apiFetch("/user/achievements?limit=8");
      if (res.status === 401) {
        return null;
      }
      return parseJsonOrThrow(res);
    },
    staleTime: DASHBOARD_STALE_MS,
    enabled: isDashboardQueryEnabled(),
  });
}
