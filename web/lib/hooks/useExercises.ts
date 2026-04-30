"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { apiUrl } from "@/lib/api";

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
  const url = `${apiUrl("/exercises")}?${qs}`;
  const res = await fetch(url);
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
