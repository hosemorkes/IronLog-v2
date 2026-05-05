"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import type { WorkoutSessionHistoryDto } from "@/lib/types/dashboard";

import type { SessionDetailDto } from "@/lib/types/session";

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

/** Ответ POST /api/user/sessions (поле exercises с бэкенда не используем на клиенте). */
export interface WorkoutSessionStartResponse {
  session_id: string;
  plan_id: string | null;
  started_at: string;
}

/** Сообщение ошибки при 409 с известной активной сессией (см. isActiveSessionConflictError). */
export const ACTIVE_SESSION_CONFLICT_MESSAGE = "active";

export function isActiveSessionConflictError(
  err: unknown,
): err is Error & { activeSessionId: string } {
  return (
    err instanceof Error &&
    err.message === ACTIVE_SESSION_CONFLICT_MESSAGE &&
    typeof (err as { activeSessionId?: unknown }).activeSessionId === "string"
  );
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

export async function requestStartSession(
  planId: string,
): Promise<WorkoutSessionStartResponse> {
  const res = await apiFetch("/user/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: planId }),
  });
  if (res.ok) {
    return (await res.json()) as WorkoutSessionStartResponse;
  }
  const raw = await res.text();
  if (res.status === 409) {
    const { message, activeSessionId } = await parse409ConflictBody(raw);
    if (activeSessionId) {
      throw Object.assign(new Error(ACTIVE_SESSION_CONFLICT_MESSAGE), {
        activeSessionId,
      });
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
 * Завершить сессию PUT /user/sessions/:id (для явного id и повторных вызовов с экрана итогов).
 */
export async function finishUserSession(
  sessionId: string,
): Promise<WorkoutSessionCompleteResponse> {
  const res = await apiFetch(`/user/sessions/${sessionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (res.status === 400) {
    const msg = await parseErrorMessage(res);
    if (msg.includes("уже завершена")) {
      const check = await apiFetch(`/user/sessions/${sessionId}`);
      if (check.ok) {
        const d = (await check.json()) as SessionDetailDto;
        if (d.completed_at) {
          return {
            session_id: d.session_id,
            completed_at: d.completed_at,
            total_volume_kg: d.total_volume_kg ?? "0",
          };
        }
      }
    }
    throw new Error(msg);
  }
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }
  return res.json() as Promise<WorkoutSessionCompleteResponse>;
}

export function invalidateAfterSessionComplete(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: ["workout-session"] });
  void qc.invalidateQueries({ queryKey: ["workout-plans"] });
  void qc.invalidateQueries({ queryKey: ["user", "sessions", "history"] });
  void qc.invalidateQueries({ queryKey: ["user", "sessions", "recent"] });
  void qc.invalidateQueries({ queryKey: ["user", "progress"] });
}

/**
 * Детали сессии GET /user/sessions/:id (активная или завершённая).
 * Ответ включает `sets` и `exercises` (группировка по упражнению для истории).
 */
export function useSessionDetail(sessionId: string | null) {
  return useQuery({
    queryKey: ["workout-session", sessionId],
    enabled: Boolean(sessionId) && isSessionHistoryEnabled(),
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
 * Старт тренировки: POST /api/user/sessions через mutate(planId).
 * При 409 с active_session_id — ошибка с message "active" и полем activeSessionId.
 */
export function useStartSession() {
  return useMutation({
    mutationFn: (planId: string): Promise<WorkoutSessionStartResponse> =>
      requestStartSession(planId),
    retry: 0,
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
 * Передайте id в mutateAsync(sessionId), чтобы гарантированно завершить нужную сессию (без устаревшего замыкания).
 */
export function useFinishSession(sessionId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      explicitSessionId?: string | null,
    ): Promise<WorkoutSessionCompleteResponse> => {
      const id =
        explicitSessionId !== undefined && explicitSessionId !== null
          ? explicitSessionId
          : sessionId;
      if (!id) {
        throw new Error("Нет активной сессии");
      }
      return finishUserSession(id);
    },
    onSuccess: () => {
      invalidateAfterSessionComplete(queryClient);
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
