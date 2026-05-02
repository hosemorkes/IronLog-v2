import type { SessionDetailDto, SessionSetDto } from "@/lib/types/session";

/**
 * Текстовый отчёт для буфера обмена (формат как в ironlog-screens-b.jsx buildExportText).
 */
export function buildSessionExportText(
  planName: string,
  detail: SessionDetailDto,
): string {
  const completedAt = detail.completed_at
    ? new Date(detail.completed_at)
    : new Date();
  const startedAt = new Date(detail.started_at);
  const todayStr = completedAt.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const durationSec = Math.max(
    0,
    Math.round((completedAt.getTime() - startedAt.getTime()) / 1000),
  );
  const durationLabel = formatDurationMmSs(durationSec);

  const lines: string[] = [];
  lines.push(`💪 IronLog — ${planName}`);
  lines.push(`📅 ${todayStr} · ⏱ ${durationLabel}`);
  lines.push("");

  const sortedSets = [...detail.sets];

  const byExercise = new Map<string, SessionSetDto[]>();
  for (const s of sortedSets) {
    const list = byExercise.get(s.exercise_id) ?? [];
    list.push(s);
    byExercise.set(s.exercise_id, list);
  }

  const orderKeys = [...byExercise.keys()];
  orderKeys.sort((a, b) => {
    const sa = byExercise.get(a)?.[0];
    const sb = byExercise.get(b)?.[0];
    const ta = sa?.exercise.name_ru || sa?.exercise.name || "";
    const tb = sb?.exercise.name_ru || sb?.exercise.name || "";
    return ta.localeCompare(tb, "ru");
  });

  for (const key of orderKeys) {
    const sets = byExercise.get(key);
    if (!sets?.length) {
      continue;
    }
    const ex = sets[0].exercise;
    const title = ex.name_ru.trim() || ex.name;
    lines.push(`📌 ${title}`);
    const byNum = [...sets].sort((x, y) => x.set_num - y.set_num);
    for (const row of byNum) {
      const w =
        row.weight_kg !== null && row.weight_kg !== ""
          ? String(row.weight_kg)
          : "—";
      lines.push(
        `   Сет ${String(row.set_num)}: ${w} кг × ${String(row.reps_done)} повт.`,
      );
    }
    lines.push("");
  }

  const vol =
    detail.total_volume_kg !== null && detail.total_volume_kg !== ""
      ? Number.parseFloat(String(detail.total_volume_kg))
      : sortedSets.reduce((acc, s) => {
          const w =
            s.weight_kg !== null && s.weight_kg !== ""
              ? Number.parseFloat(String(s.weight_kg))
              : 0;
          return acc + (Number.isFinite(w) ? w * s.reps_done : 0);
        }, 0);

  lines.push(
    `📊 Итого: ${String(sortedSets.length)} сетов · ${Math.round(vol).toLocaleString("ru-RU")} кг поднято`,
  );
  lines.push("—");
  lines.push("Отправлено из IronLog 🏋️");
  return lines.join("\n");
}

function formatDurationMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}
