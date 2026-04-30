"use client";

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { PlanDetailDto } from "@/lib/types/session";

async function fetchPlan(planId: string): Promise<PlanDetailDto> {
  const res = await apiFetch(`/user/plans/${planId}`, { method: "GET" });
  if (res.status === 404) {
    throw new Error("План не найден");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Ошибка ${String(res.status)}`);
  }
  return res.json() as Promise<PlanDetailDto>;
}

/**
 * Эталон шаблонных подходов по плану (для шагов тренировки).
 */
export function usePlanForSession(planId: string | undefined) {
  return useQuery({
    queryKey: ["user-plan-detail", planId],
    queryFn: () => fetchPlan(planId as string),
    enabled: Boolean(planId),
    staleTime: 60_000,
  });
}
