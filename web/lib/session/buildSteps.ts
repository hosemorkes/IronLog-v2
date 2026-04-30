import type {
  ExerciseDetailDto,
  PlanExerciseItemDto,
} from "@/lib/types/session";

const DEFAULT_REST_SEC = 90;

/** Одна «ячейка» плана после разбиения по подходам. */
export interface WorkoutFlatStep {
  key: string;
  exercise_id: string;
  /** Номер подхода для конкретного упражнения (для POST .../sets — set_num). */
  set_num: number;
  exercise: ExerciseDetailDto;
  target_reps: number;
  target_weight_kg: string | number | null;
  rest_after_seconds: number | null;
}

/** Разложить упражнения плана по сетам (как строки таблицы в прототипе). */
export function flattenPlanToSteps(planExercises: PlanExerciseItemDto[]): WorkoutFlatStep[] {
  const sorted = [...planExercises].sort((a, b) => a.order - b.order);
  const steps: WorkoutFlatStep[] = [];

  for (const pe of sorted) {
    const rounds = Math.max(1, pe.sets);
    for (let s = 1; s <= rounds; s++) {
      steps.push({
        key: `${pe.id}-${s}`,
        exercise_id: pe.exercise.id,
        set_num: s,
        exercise: pe.exercise,
        target_reps: pe.reps,
        target_weight_kg: pe.weight_kg,
        rest_after_seconds: pe.rest_seconds ?? DEFAULT_REST_SEC,
      });
    }
  }

  return steps;
}
