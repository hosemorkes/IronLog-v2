/**
 * Совпадают с snake_case телами FastAPI (ExerciseDetailResponse и др.).
 */
export interface ExerciseDetailDto {
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

/** Элемент упражнения в плане (GET /api/user/plans/{id}). */
export interface PlanExerciseItemDto {
  id: string;
  order: number;
  sets: number;
  reps: number;
  weight_kg: string | null;
  rest_seconds: number | null;
  exercise: ExerciseDetailDto;
}

export interface PlanDetailDto {
  id: string;
  name: string;
  description: string | null;
  difficulty: string | null;
  assigned_by_trainer: boolean;
  trainer_id: string | null;
  exercises: PlanExerciseItemDto[];
  created_at: string;
  updated_at: string;
}

export interface SessionSetDto {
  id: string;
  exercise_id: string;
  exercise: ExerciseDetailDto;
  set_num: number;
  reps_done: number;
  weight_kg: string | null;
  duration_seconds: number | null;
  is_pr: boolean;
}

export interface SessionDetailDto {
  session_id: string;
  plan_id: string | null;
  started_at: string;
  completed_at: string | null;
  total_volume_kg: string | null;
  notes: string | null;
  sets: SessionSetDto[];
}
