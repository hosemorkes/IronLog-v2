"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";

/** Ответ строки каталога (GET /api/exercises). */
export interface ExerciseListItem {
  id: string;
  name: string;
  name_ru: string;
  muscle_group: string;
  equipment: string;
  difficulty: string;
  image_url: string | null;
  tags: string[];
}

const PAGE_SIZE = 20;

export interface ExerciseListFilters {
  /** Значение muscle_group для query (совпадает с чипами / сидами). */
  muscleGroup: string | null;
  /** Поиск по имени на стороне API. */
  search: string;
}

function buildQueryString(filters: ExerciseListFilters, offset: number): string {
  const p = new URLSearchParams();
  p.set("limit", String(PAGE_SIZE));
  p.set("offset", String(offset));
  if (filters.muscleGroup) {
    p.set("muscle_group", filters.muscleGroup);
  }
  if (filters.search.trim()) {
    p.set("search", filters.search.trim());
  }
  return p.toString();
}

async function fetchExercisePage(
  filters: ExerciseListFilters,
  offset: number,
): Promise<ExerciseListItem[]> {
  const qs = buildQueryString(filters, offset);
  const res = await apiFetch(`/exercises?${qs}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Ошибка ${res.status}`);
  }
  return res.json() as Promise<ExerciseListItem[]>;
}

/**
 * Бесконечный список упражнений (offset-based) и фильтры для React Query.
 */
export function useExercises(filters: ExerciseListFilters) {
  const queryKey: [string, string | null, string] = [
    "exercises",
    filters.muscleGroup,
    filters.search.trim(),
  ];

  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      fetchExercisePage(filters, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) {
        return undefined;
      }
      const loaded = allPages.reduce((acc, page) => acc + page.length, 0);
      return loaded;
    },
    staleTime: 60 * 1000,
  });
}

export interface CustomExerciseCreateInput {
  name: string;
  muscle_group: string;
  equipment: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  description?: string | null;
}

async function readCreateError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { detail?: unknown; message?: unknown };
    if (typeof j.detail === "string") {
      return j.detail;
    }
    if (typeof j.message === "string") {
      return j.message;
    }
  } catch {
    /* игнор — не JSON */
  }
  return text || `Ошибка ${String(res.status)}`;
}

/**
 * Создание кастомного упражнения: POST /api/user/exercises или /api/exercises
 * (тренер и админ используют общий эндпоинт справочника).
 */
export function useCreateCustomExercise() {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);

  return useMutation({
    mutationFn: async (body: CustomExerciseCreateInput) => {
      const useCatalogPath = role === "trainer" || role === "admin";
      const path = useCatalogPath ? "/exercises" : "/user/exercises";
      const nameTrim = body.name.trim();
      const desc =
        body.description && body.description.trim()
          ? body.description.trim()
          : null;
      const payload = useCatalogPath
        ? {
            name: nameTrim,
            name_ru: nameTrim,
            muscle_group: body.muscle_group,
            equipment: body.equipment,
            difficulty: body.difficulty,
            description: desc,
          }
        : {
            name: nameTrim,
            muscle_group: body.muscle_group,
            equipment: body.equipment,
            difficulty: body.difficulty,
            description: desc,
          };
      const res = await apiFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(await readCreateError(res));
      }
      return (await res.json()) as { id: string };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}
