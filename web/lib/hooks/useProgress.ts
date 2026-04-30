"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type {
  RecentPrListDto,
  UserAchievementFeedDto,
  UserProgressDto,
  WeeklyProgressDayDto,
  WorkoutSessionHistoryDto,
} from "@/lib/types/dashboard";

import { DASHBOARD_STALE_MS } from "@/lib/hooks/useDashboardData";

function isProgressQueryEnabled(): boolean {
  return typeof window !== "undefined" && !!getAccessToken();
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`Запрос не удался: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Сводка прогресса: GET /api/user/progress.
 * Поля в ответе: total_workouts → workouts_completed_total,
 * total_volume_kg → total_lifetime_tonnage_kg, current_streak → workout_streak_days,
 * weekly_workouts — сумма дней с нагрузкой за календарную неделю (см. useWeeklyProgress).
 */
export function useUserProgress() {
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
    enabled: isProgressQueryEnabled(),
  });
}

/**
 * Неделя Пн–Вс: GET /api/user/progress/weekly.
 */
export function useWeeklyProgress() {
  return useQuery({
    queryKey: ["user", "progress", "weekly"],
    queryFn: async (): Promise<WeeklyProgressDayDto[]> => {
      const res = await apiFetch("/user/progress/weekly");
      if (res.status === 401) {
        return [];
      }
      return parseJsonOrThrow(res);
    },
    staleTime: DASHBOARD_STALE_MS,
    enabled: isProgressQueryEnabled(),
  });
}

const RECENT_SESSIONS_SCAN = 15;

/**
 * История для виджета «последняя тренировка»: несколько строк, затем берём первую с completed_at.
 * GET /api/user/sessions?limit=...
 */
export function useRecentSessions() {
  return useQuery({
    queryKey: ["user", "sessions", "recent", RECENT_SESSIONS_SCAN],
    queryFn: async (): Promise<WorkoutSessionHistoryDto | null> => {
      const res = await apiFetch(
        `/user/sessions?limit=${String(RECENT_SESSIONS_SCAN)}&offset=0`,
      );
      if (res.status === 401) {
        return null;
      }
      return parseJsonOrThrow(res);
    },
    staleTime: DASHBOARD_STALE_MS,
    enabled: isProgressQueryEnabled(),
  });
}

/**
 * Личные рекорды: GET /api/user/progress/recent-prs (контракт из ТЗ совпадает с /api/user/pr).
 */
export function usePersonalRecords() {
  return useQuery({
    queryKey: ["user", "pr"],
    queryFn: async (): Promise<RecentPrListDto | null> => {
      const res = await apiFetch("/user/progress/recent-prs");
      if (res.status === 401) {
        return null;
      }
      return parseJsonOrThrow(res);
    },
    staleTime: DASHBOARD_STALE_MS,
    enabled: isProgressQueryEnabled(),
  });
}

/**
 * Достижения пользователя.
 */
export function useAchievements() {
  return useQuery({
    queryKey: ["user", "achievements"],
    queryFn: async (): Promise<UserAchievementFeedDto | null> => {
      const res = await apiFetch("/user/achievements");
      if (res.status === 401) {
        return null;
      }
      return parseJsonOrThrow(res);
    },
    staleTime: DASHBOARD_STALE_MS,
    enabled: isProgressQueryEnabled(),
  });
}
