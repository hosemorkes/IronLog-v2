"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { WorkoutSessionHistoryDto } from "@/lib/types/dashboard";

import type { ExerciseDetailDto, SessionDetailDto } from "@/lib/types/session";

const HISTORY_PAGE_SIZE = 50;

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
      if (typeof d === "object" && d !== null && !Array.isArray(d)) {
        const msg = (d as { message?: unknown }).message;
        if (typeof msg === "string") {
          return msg;
        }
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

/** Результат подготовки сессии: после 409 может быть тело GET /sessions/:id для восстановления шага. */
export interface WorkoutSessionStartResult extends WorkoutSessionStartResponse {
  resumedDetail?: SessionDetailDto;
}

export interface SessionStepRef {
  exerciseId: string;
  setNum: number;
}

export function computeResumeStats(
  detail: SessionDetailDto,
  steps: SessionStepRef[],
): {
  completedSets: number;
  currentIdx: number;
  tonnageDone: number;
} {
  const logged = new Set(
    detail.sets.map((s) => `${s.exercise_id}:${String(s.set_num)}`),
  );
  let completedSets = 0;
  let currentIdx = 0;
  let foundIncomplete = false;
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    const key = `${st.exerciseId}:${String(st.setNum)}`;
    if (logged.has(key)) {
      completedSets += 1;
    } else {
      currentIdx = i;
      foundIncomplete = true;
      break;
    }
  }
  if (!foundIncomplete && steps.length > 0) {
    currentIdx = steps.length - 1;
    completedSets = steps.length;
  }
  let tonnageDone = 0;
  for (const s of detail.sets) {
    const w =
      s.weight_kg !== null && s.weight_kg !== ""
        ? Number.parseFloat(String(s.weight_kg))
        : NaN;
    if (Number.isFinite(w)) {
      tonnageDone += w * s.reps_done;
    }
  }
  return {
    completedSets,
    currentIdx,
    tonnageDone,
  };
}

async function parse409ConflictBody(raw: string): Promise<{
  message: string;
  activeSessionId: string | null;
}> {
  try {
    const data = JSON.parse(raw) as unknown;
    if (typeof data === "object" && data !== null && "detail" in data) {
      const d = (data as { detail: unknown }).detail;
      if (typeof d === "object" && d !== null && !Array.isArray(d)) {
        const msg =
          typeof (d as { message?: unknown }).message === "string"
            ? (d as { message: string }).message
            : "У вас уже есть активная тренировка.";
        const aid = (d as { active_session_id?: unknown }).active_session_id;
        const activeSessionId = typeof aid === "string" ? aid : null;
        return { message: msg, activeSessionId };
      }
      if (typeof d === "string") {
        return { message: d, activeSessionId: null };
      }
    }
  } catch {
    /* не JSON */
  }
  return { message: raw.slice(0, 280), activeSessionId: null };
}

/**
 * Продолжить активную сессию после 409: план и превью как у старта, плюс detail для UI.
 */
async function resumeActiveWorkout(
  activeSessionId: string,
): Promise<WorkoutSessionStartResult> {
  const res = await apiFetch(`/user/sessions/${activeSessionId}`);
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  const detail = (await res.json()) as SessionDetailDto;
  if (detail.completed_at) {
    throw new Error("Сессия уже завершена — начните новую тренировку.");
  }
  const sessionPlanId = detail.plan_id;
  if (!sessionPlanId) {
    throw new Error(
      "Активная тренировка без плана. Продолжение с этого экрана недоступно.",
    );
  }
  const planRes = await apiFetch(`/user/plans/${sessionPlanId}`);
  if (!planRes.ok) {
    throw new Error(await parseErrorMessage(planRes));
  }
  const planJson = (await planRes.json()) as {
    exercises: Array<{
      id: string;
      order: number;
      sets: number;
      reps: number;
      weight_kg: string | number | null;
      rest_seconds: number | null;
      exercise: ExerciseDetailDto;
    }>;
  };
  const exercises: SessionExercisePreview[] = [...planJson.exercises]
    .sort((a, b) => a.order - b.order)
    .map((pe) => ({
      plan_exercise_id: pe.id,
      order: pe.order,
      exercise: pe.exercise,
      target_sets: pe.sets,
      target_reps: pe.reps,
      target_weight_kg: pe.weight_kg,
      rest_seconds: pe.rest_seconds,
    }));

  return {
    session_id: detail.session_id,
    plan_id: sessionPlanId,
    started_at: detail.started_at,
    exercises,
    resumedDetail: detail,
  };
}

export async function requestStartSession(
  planId: string,
): Promise<WorkoutSessionStartResult> {
  const res = await apiFetch("/user/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: planId }),
  });
  if (res.ok) {
    return (await res.json()) as WorkoutSessionStartResult;
  }
  const raw = await res.text();
  if (res.status === 409) {
    const { message, activeSessionId } = await parse409ConflictBody(raw);
    if (activeSessionId) {
      return resumeActiveWorkout(activeSessionId);
    }
    throw new Error(message);
  }
  throw new Error(
    await parseErrorMessage(new Response(raw, { status: res.status })),
  );
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

/**
 * Старт тренировки по плану; один запрос на planId за счёт React Query (dedupe).
 * При 409 подтягивает активную сессию и возвращает тот же формат ответа.
 */
export function useStartSession(planId: string | null) {
  return useQuery({
    queryKey: ["workout-session-start", planId],
    enabled: Boolean(planId),
    queryFn: async (): Promise<WorkoutSessionStartResult> =>
      requestStartSession(planId as string),
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
      void queryClient.invalidateQueries({
        queryKey: ["workout-session-start"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["user", "sessions", "history"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["user", "sessions", "recent"],
      });
    },
  });
}

function isSessionHistoryEnabled(): boolean {
  return typeof window !== "undefined" && !!getAccessToken();
}

async function parseHistoryJson<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    throw new Error("Войдите в аккаунт.");
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `Ошибка ${String(res.status)}`);
  }
  return res.json() as Promise<T>;
}

/** Одна страница истории (после фильтра завершённых в рамках ответа). */
export interface SessionHistoryPage {
  items: WorkoutSessionHistoryDto["items"];
  total: number;
  offset: number;
}

/**
 * Журнал сессий с пагинацией: GET /api/user/sessions?limit=50&offset=…
 * В каждой странице остаются только завершённые (completed_at != null).
 */
export function useSessionHistory() {
  return useInfiniteQuery({
    queryKey: ["user", "sessions", "history"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<SessionHistoryPage> => {
      const offset = pageParam as number;
      const res = await apiFetch(
        `/user/sessions?limit=${String(HISTORY_PAGE_SIZE)}&offset=${String(offset)}`,
      );
      const data = await parseHistoryJson<WorkoutSessionHistoryDto>(res);
      const items = data.items.filter((s) => s.completed_at != null);
      return {
        items,
        total: data.total,
        offset,
      };
    },
    getNextPageParam: (lastPage) => {
      const next = lastPage.offset + HISTORY_PAGE_SIZE;
      return next < lastPage.total ? next : undefined;
    },
    staleTime: 30 * 1000,
    enabled: isSessionHistoryEnabled(),
  });
}

export { HISTORY_PAGE_SIZE };
