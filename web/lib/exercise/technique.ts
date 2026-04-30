import type { ExerciseDetail } from "@/lib/hooks/useExerciseDetail";

/**
 * Приводит technique_steps из API к списку строк для UI.
 */
export function normalizeTechniqueSteps(raw: ExerciseDetail["technique_steps"]): string[] {
  if (raw == null) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      if (typeof item === "string") {
        return item.trim() ? [item] : [];
      }
      if (item && typeof item === "object" && "text" in item) {
        const t = String((item as { text: unknown }).text).trim();
        return t ? [t] : [];
      }
      return [];
    });
  }
  return [];
}
