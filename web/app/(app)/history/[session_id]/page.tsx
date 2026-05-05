"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";

import { useSessionDetail } from "@/lib/hooks/useSessions";
import { useWorkoutPlans } from "@/lib/hooks/useWorkouts";
import type {
  SessionDetailExerciseDto,
  SessionSetDto,
} from "@/lib/types/session";

const nf = new Intl.NumberFormat("ru-RU");

const dfTitle = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDurationMinutes(
  startIso: string,
  endIso: string | null,
): string {
  if (!endIso) {
    return "—";
  }
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return "—";
  }
  const m = Math.round((end - start) / 60000);
  if (m < 1) {
    return "< 1 мин";
  }
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return min > 0 ? `${h} ч ${min} мин` : `${h} ч`;
  }
  return `${m} мин`;
}

function parseVolumeKg(
  v: string | number | null | undefined,
): number | null {
  if (v === null || v === undefined) {
    return null;
  }
  if (typeof v === "number") {
    return Number.isFinite(v) ? v : null;
  }
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function formatWeightCell(w: string | number | null | undefined): string {
  if (w === null || w === undefined) {
    return "—";
  }
  const n = typeof w === "number" ? w : Number.parseFloat(String(w));
  if (!Number.isFinite(n)) {
    return "—";
  }
  return `${nf.format(n)} кг`;
}

function exercisesFromDetail(
  exercises: SessionDetailExerciseDto[] | undefined,
  sets: SessionSetDto[],
): SessionDetailExerciseDto[] {
  if (exercises && exercises.length > 0) {
    return exercises;
  }
  const byId = new Map<string, SessionSetDto[]>();
  const order: string[] = [];
  for (const s of sets) {
    if (!byId.has(s.exercise_id)) {
      byId.set(s.exercise_id, []);
      order.push(s.exercise_id);
    }
    byId.get(s.exercise_id)!.push(s);
  }
  return order.map((id) => {
    const rows = byId.get(id)!;
    const name =
      rows[0]?.exercise?.name_ru?.trim() ||
      rows[0]?.exercise?.name?.trim() ||
      "—";
    return {
      exercise_id: id,
      exercise_name: name,
      sets: [...rows]
        .sort((a, b) => a.set_num - b.set_num)
        .map((r) => ({
          set_num: r.set_num,
          reps_done: r.reps_done,
          weight_kg: r.weight_kg,
        })),
    };
  });
}

/**
 * Детальная карточка завершённой (или любой доступной) сессии из истории.
 */
export default function SessionHistoryDetailPage() {
  const params = useParams();
  const sessionId =
    typeof params.session_id === "string" ? params.session_id : "";

  const { data: detail, isPending, isError, error } = useSessionDetail(
    sessionId || null,
  );
  const { data: plans } = useWorkoutPlans();

  const planName = useMemo(() => {
    if (!detail?.plan_id) {
      return "Свободная тренировка";
    }
    const p = plans?.find((x) => x.id === detail.plan_id);
    return p?.name?.trim() || "План";
  }, [detail?.plan_id, plans]);

  const titleDateRaw = detail?.completed_at ?? detail?.started_at;
  const titleDate = useMemo(() => {
    if (!titleDateRaw) {
      return "—";
    }
    const raw = dfTitle.format(new Date(titleDateRaw));
    const s = raw.trim();
    if (!s) {
      return "—";
    }
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [titleDateRaw]);

  const duration = useMemo(
    () =>
      detail
        ? formatDurationMinutes(detail.started_at, detail.completed_at)
        : "—",
    [detail],
  );

  const volumeKg = useMemo(
    () => parseVolumeKg(detail?.total_volume_kg ?? null),
    [detail?.total_volume_kg],
  );

  const exerciseBlocks = useMemo(
    () =>
      detail ? exercisesFromDetail(detail.exercises, detail.sets) : [],
    [detail],
  );

  const exerciseCount = exerciseBlocks.length;

  if (!sessionId) {
    return (
      <div className="min-h-full bg-bg-dark px-4 py-6 text-white">
        <p className="text-sm text-muted">Некорректная ссылка.</p>
        <Link
          href="/history"
          className="mt-4 inline-block text-sm font-semibold text-[#7c6ef2] hover:underline"
        >
          ← К истории
        </Link>
      </div>
    );
  }

  return (
    <div className="no-scrollbar flex min-h-full flex-1 flex-col bg-bg-dark pb-10">
      <header className="flex shrink-0 items-center gap-3 border-b border-[#232323] bg-bg-dark px-4 py-3">
        <Link
          href="/history"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-[#252525] hover:text-white"
          aria-label="Назад к истории"
        >
          <svg
            width={18}
            height={18}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path
              d="M11 5 6 9l5 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <h1 className="min-w-0 truncate text-lg font-bold text-white">
          Тренировка
        </h1>
      </header>

      <main className="flex-1 px-4 pt-4">
        {isPending ? (
          <div className="space-y-3" aria-busy aria-label="Загрузка">
            <div className="h-20 animate-pulse rounded-2xl bg-[#1a1a1a]" />
            <div className="grid grid-cols-3 gap-2.5">
              {[0, 1, 2].map((k) => (
                <div
                  key={k}
                  className="h-[72px] animate-pulse rounded-2xl bg-[#1a1a1a]"
                />
              ))}
            </div>
            <div className="h-40 animate-pulse rounded-2xl bg-[#1a1a1a]" />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-rose-500/35 bg-[#1a1a1a] px-4 py-4">
            <p className="text-sm text-rose-300">{(error as Error).message}</p>
            <Link
              href="/history"
              className="mt-3 inline-block text-sm font-semibold text-[#7c6ef2] hover:underline"
            >
              ← К истории
            </Link>
          </div>
        ) : detail ? (
          <>
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7c6ef2]">
                {planName}
              </p>
              <p className="mt-1 text-xl font-extrabold capitalize leading-tight text-white">
                {titleDate}
              </p>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-2.5">
              {(
                [
                  { v: duration, l: "Время" },
                  {
                    v:
                      volumeKg != null
                        ? `${nf.format(Math.round(volumeKg))} кг`
                        : "—",
                    l: "Поднято",
                  },
                  { v: String(exerciseCount), l: "Упражнений" },
                ] as const
              ).map((c) => (
                <div
                  key={c.l}
                  className="rounded-2xl border border-[#232323] bg-[#1a1a1a] px-1.5 py-3 text-center"
                >
                  <p className="text-sm font-extrabold leading-tight text-[#7c6ef2]">
                    {c.v}
                  </p>
                  <p className="mt-1 text-[10px] text-muted">{c.l}</p>
                </div>
              ))}
            </div>

            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Упражнения
            </p>

            {exerciseBlocks.length === 0 ? (
              <p className="rounded-2xl border border-[#232323] bg-[#1a1a1a] px-4 py-6 text-center text-sm text-muted">
                Нет записанных подходов.
              </p>
            ) : (
              <div className="space-y-4">
                {exerciseBlocks.map((ex) => (
                  <div
                    key={ex.exercise_id}
                    className="overflow-hidden rounded-2xl border border-[#232323] bg-[#1a1a1a]"
                  >
                    <p className="border-b border-[#232323] px-4 py-3 text-sm font-bold text-white">
                      {ex.exercise_name}
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[260px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-[#232323] text-[11px] text-muted">
                            <th className="px-4 py-2.5 font-semibold">Сет</th>
                            <th className="px-4 py-2.5 font-semibold">Вес</th>
                            <th className="px-4 py-2.5 font-semibold">
                              Повторы
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {ex.sets.map((row) => (
                            <tr
                              key={`${ex.exercise_id}-${row.set_num}`}
                              className="border-t border-[#232323]"
                            >
                              <td className="px-4 py-2.5 tabular-nums text-white">
                                {row.set_num}
                              </td>
                              <td className="px-4 py-2.5 text-white">
                                {formatWeightCell(row.weight_kg)}
                              </td>
                              <td className="px-4 py-2.5 tabular-nums text-white">
                                {row.reps_done}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
