"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { ExerciseDetailDto } from "@/lib/types/session";

async function fetchSessionDetail(sessionId: string) {
  const res = await apiFetch(`/user/sessions/${sessionId}`, { method: "GET" });
  if (res.status === 404) {
    throw new Error("Тренировка не найдена");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Ошибка ${String(res.status)}`);
  }
  return res.json() as Promise<{
    session_id: string;
    plan_id: string | null;
    started_at: string;
    completed_at: string | null;
    total_volume_kg: string | null;
    notes: string | null;
    sets: Array<{
      id: string;
      exercise_id: string;
      exercise: ExerciseDetailDto;
      set_num: number;
      reps_done: number;
      weight_kg: string | null;
      duration_seconds: number | null;
      is_pr: boolean;
    }>;
  }>;
}

export interface WorkoutSetLogPayload {
  exercise_id: string;
  set_num: number;
  reps_done: number;
  weight_kg?: string | null;
  duration_seconds?: number | null;
}

async function fetchLogSet(sessionId: string, payload: WorkoutSetLogPayload) {
  const res = await apiFetch(`/user/sessions/${sessionId}/sets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      exercise_id: payload.exercise_id,
      set_num: payload.set_num,
      reps_done: payload.reps_done,
      weight_kg: payload.weight_kg ?? undefined,
      duration_seconds: payload.duration_seconds ?? undefined,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      const j = JSON.parse(text) as { detail?: string };
      detail = typeof j.detail === "string" ? j.detail : text;
    } catch {
      //
    }
    throw new Error(detail || `Ошибка ${String(res.status)}`);
  }
  return JSON.parse(text) as {
    id: string;
    exercise_id: string;
    exercise: ExerciseDetailDto;
    session_id: string;
    set_num: number;
    reps_done: number;
    weight_kg: string | null;
    duration_seconds: number | null;
    is_pr: boolean;
  };
}

async function fetchComplete(sessionId: string) {
  const res = await apiFetch(`/user/sessions/${sessionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed_at: null }),
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try {
      const j = JSON.parse(text) as { detail?: string };
      detail = typeof j.detail === "string" ? j.detail : text;
    } catch {
      //
    }
    throw new Error(detail || `Ошибка ${String(res.status)}`);
  }
  return JSON.parse(text) as {
    session_id: string;
    completed_at: string;
    total_volume_kg: string;
  };
}

/**
 * Карточка сессии (GET …/sessions/{id}).
 */
export function useSessionDetail(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["workout-session", sessionId],
    queryFn: () => fetchSessionDetail(sessionId as string),
    enabled: Boolean(sessionId),
    staleTime: 10_000,
  });
}

/**
 * Залогировать подход.
 */
export function useLogSessionSet(sessionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorkoutSetLogPayload) =>
      fetchLogSet(sessionId as string, payload),
    onSuccess: () => {
      if (sessionId) {
        void qc.invalidateQueries({ queryKey: ["workout-session", sessionId] });
      }
    },
  });
}

/**
 * Завершить тренировку.
 */
export function useCompleteWorkout(sessionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fetchComplete(sessionId as string),
    onSuccess: () => {
      if (sessionId) {
        void qc.invalidateQueries({ queryKey: ["workout-session", sessionId] });
      }
      void qc.invalidateQueries({ queryKey: ["workout-sessions-history"] });
    },
  });
}
