"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

/** Элемент списка планов (GET /api/user/plans). */
export interface WorkoutPlanListItem {
  id: string;
  name: string;
  description: string | null;
  difficulty: string | null;
  assigned_by_trainer: boolean;
  trainer_id: string | null;
  exercise_count: number;
  created_at: string;
  updated_at: string;
}

/** Упражнение в теле POST /api/user/plans (поле порядка — `order`). */
export interface CreatePlanExercisePayload {
  exercise_id: string;
  order: number;
  sets: number;
  reps: number;
  weight_kg: number | null;
  rest_seconds: number | null;
}

export interface CreateWorkoutPlanPayload {
  name: string;
  exercises: CreatePlanExercisePayload[];
}

/** Вложенное упражнение в деталях плана. */
export interface PlanDetailExerciseRef {
  id: string;
  name: string;
  name_ru: string;
  muscle_group: string;
  equipment: string;
  difficulty: string;
  image_url: string | null;
}

/** Строка упражнения в плане (ответ GET /api/user/plans/:id). */
export interface PlanExerciseRow {
  id: string;
  order: number;
  sets: number;
  reps: number;
  weight_kg: string | number | null;
  rest_seconds: number | null;
  exercise: PlanDetailExerciseRef;
}

export interface WorkoutPlanDetail {
  id: string;
  name: string;
  description: string | null;
  difficulty: string | null;
  assigned_by_trainer: boolean;
  trainer_id: string | null;
  exercises: PlanExerciseRow[];
  created_at: string;
  updated_at: string;
}

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

/**
 * Список планов текущего пользователя.
 */
export function useWorkoutPlans(options?: { enabled?: boolean }) {
  const enabled = options?.enabled !== false;
  return useQuery({
    queryKey: ["workout-plans"],
    queryFn: async (): Promise<WorkoutPlanListItem[]> => {
      const res = await apiFetch("/user/plans");
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }
      return res.json() as Promise<WorkoutPlanListItem[]>;
    },
    staleTime: 30 * 1000,
    enabled,
  });
}

/**
 * Детали плана по id.
 */
export function useWorkoutPlan(planId: string | null) {
  return useQuery({
    queryKey: ["workout-plan", planId],
    enabled: Boolean(planId),
    queryFn: async (): Promise<WorkoutPlanDetail> => {
      const res = await apiFetch(`/user/plans/${planId}`);
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }
      return res.json() as Promise<WorkoutPlanDetail>;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Создание плана (POST /api/user/plans).
 */
export function useCreateWorkoutPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: CreateWorkoutPlanPayload,
    ): Promise<WorkoutPlanDetail> => {
      const res = await apiFetch("/user/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await parseErrorMessage(res));
      }
      return res.json() as Promise<WorkoutPlanDetail>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workout-plans"] });
    },
  });
}

export {
  useExercises,
  type ExerciseListFilters,
  type ExerciseListItem,
} from "./useExercises";
