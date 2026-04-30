"use client";

import { useQuery } from "@tanstack/react-query";

import { apiUrl } from "@/lib/api";

/** Ответ GET /api/exercises/{id} (ExerciseDetailResponse). */
export interface ExerciseDetail {
  id: string;
  name: string;
  name_ru: string;
  muscle_group: string;
  secondary_muscles: string[] | null;
  equipment: string;
  difficulty: string;
  description: string | null;
  technique_steps: unknown;
  image_url: string | null;
  gif_url: string | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
}

async function fetchExerciseDetail(id: string): Promise<ExerciseDetail> {
  const res = await fetch(apiUrl(`/exercises/${id}`));
  if (res.status === 404) {
    throw new Error("Упражнение не найдено");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Ошибка ${String(res.status)}`);
  }
  return res.json() as Promise<ExerciseDetail>;
}

/**
 * Загрузка карточки упражнения по id (React Query).
 */
export function useExerciseDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["exercise", "detail", id],
    queryFn: () => fetchExerciseDetail(id as string),
    enabled: Boolean(id),
    staleTime: 2 * 60 * 1000,
  });
}
