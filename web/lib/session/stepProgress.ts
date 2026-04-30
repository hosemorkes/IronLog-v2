import type { WorkoutFlatStep } from "@/lib/session/buildSteps";

/**
 * Первая «дырка» в цепочке шагов: ещё нет записи с тем же exercise_id + set_num.
 */
export function findFirstIncompleteStepIndex(
  steps: WorkoutFlatStep[],
  logged: { exercise_id: string; set_num: number }[],
): number {
  for (let i = 0; i < steps.length; i++) {
    const slot = steps[i];
    const done = logged.some(
      (r) =>
        r.exercise_id === slot.exercise_id && r.set_num === slot.set_num,
    );
    if (!done) return i;
  }
  return Math.max(0, steps.length - 1);
}

export function cumulativeVolumeKg(
  logged: { reps_done?: number; weight_kg?: string | null }[],
): number {
  let vol = 0;
  for (const row of logged) {
    const w =
      row.weight_kg !== null &&
      row.weight_kg !== undefined &&
      row.weight_kg !== ""
        ? Number(row.weight_kg)
        : 0;
    const r =
      typeof row.reps_done === "number" &&
      Number.isFinite(row.reps_done)
        ? row.reps_done
        : 0;
    if (Number.isFinite(w) && w > 0) {
      vol += w * r;
    }
  }
  return Math.round(vol);
}
