/**
 * Форматирует длительность в виде мм:сс (прототип ActiveWorkout).
 */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m)}:${String(r).padStart(2, "0")}`;
}
