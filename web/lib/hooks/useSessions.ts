"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

import type { ExerciseDetailDto, SessionDetailDto } from "@/lib/types/session";

async function parseErrorMessage(res: Response): Promise<string> {
  const raw = await res.text();
  if (!raw) {
    return `Ошибка ${String(res.status)}`;
  }
  try {
    const data = JSON.parse(raw) as unknown;
    if (
      typeof data === "object" &&
      data !== null &&
      "detail" in data &&
      data.detail !== undefined
    ) {
      const d = (data as { detail: unknown }).detail;
      if (typeof d === "string") {
        return d;
      }
      if (Array.isArray(d)) {
        return d
          .map((item) =>
            typeof item === "object" &&
            item !== null &&
            "msg" in item &&
            typeof (item as { msg: unknown }).msg === "string"
              ? (item as { msg: string }).msg
              : JSON.stringify(item),
          )
          .join("; ");
      }
    }
  } catch {
    /* не JSON */
  }
  return raw;
}

/** Превью упражнения из ответа POST /user/sessions. */
export interface SessionExercisePreview {
  plan_exercise_id: string;
  order: number;
  exercise: ExerciseDetailDto;
  target_sets: number;
  target_reps: number;
  target_weight_kg: string | number | null;
  rest_seconds: number | null;
}

export interface WorkoutSessionStartResponse {
  session_id: string;
  plan_id: string | null;
  started_at: string;
  exercises: SessionExercisePreview[];
}

export interface WorkoutSetLogPayload {
  exercise_id: string;
  set_num: number;
  reps_done: number;
  weight_kg: number | null;
}

export interface WorkoutSessionCompleteResponse {
  session_id: string;
  completed_at: string;
  total_volume_kg: string | number;
}

/**
 * Детали сессии GET /user/sessions/:id (после завершения — для экрана итогов).
 */
export function useSessionDetail(sessionId: string | null) {
  return useQuery({
    queryKey: ["workout-session", sessionId],
    enabled: Boolean(sessionId),
    queryFn: async (): Promise<SessionDetailDto> => {
      const res = await apiFetch(`/user/sessions/${sessionId}`);
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }
      return res.json() as Promise<SessionDetailDto>;
    },
    staleTime: 60 * 1000,
  });
}

export async function requestStartSession(
  planId: string,
): Promise<WorkoutSessionStartResponse> {
  const res = await apiFetch("/user/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: planId }),
  });
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json() as Promise<WorkoutSessionStartResponse>;
}

/**
 * Старт тренировки по плану; один запрос на planId за счёт React Query (dedupe).
 */
export function useStartSession(planId: string | null) {
  return useQuery({
    queryKey: ["workout-session-start", planId],
    enabled: Boolean(planId),
    queryFn: async () => requestStartSession(planId as string),
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    retry: false,
  });
}

/**
 * Логирование подхода POST /user/sessions/:id/sets.
 */
export function useLogSet(sessionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: WorkoutSetLogPayload) => {
      if (!sessionId) {
        throw new Error("Нет активной сессии");
      }
      const body: Record<string, unknown> = {
        exercise_id: payload.exercise_id,
        set_num: payload.set_num,
        reps_done: payload.reps_done,
      };
      if (payload.weight_kg !== null && payload.weight_kg > 0) {
        body.weight_kg = payload.weight_kg;
      }
      const res = await apiFetch(`/user/sessions/${sessionId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }
      return res.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workout-session"] });
    },
  });
}

/**
 * Завершение сессии PUT /user/sessions/:id.
 */
export function useFinishSession(sessionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<WorkoutSessionCompleteResponse> => {
      if (!sessionId) {
        throw new Error("Нет активной сессии");
      }
      const res = await apiFetch(`/user/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }
      return res.json() as Promise<WorkoutSessionCompleteResponse>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workout-session"] });
      void queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
      void queryClient.invalidateQueries({ queryKey: ["workout-session-start"] });
    },
  });
}
