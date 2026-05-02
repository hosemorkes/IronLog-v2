"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";

import { useSessionHistory } from "@/lib/hooks/useSessions";
import { useWorkoutPlans } from "@/lib/hooks/useWorkouts";
import type { WorkoutSessionListItemDto } from "@/lib/types/dashboard";

const nf = new Intl.NumberFormat("ru-RU");

const dfHistory = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

function formatHistoryDate(iso: string): string {
  const raw = dfHistory.format(new Date(iso));
  const s = raw.replace(/\.$/, "").trim();
  if (!s) {
    return "—";
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDurationMinutes(startIso: string, endIso: string | null): string {
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

function sessionTitle(
  session: WorkoutSessionListItemDto,
  planNames: Map<string, string>,
): string {
  if (!session.plan_id) {
    return "Свободная тренировка";
  }
  const n = planNames.get(session.plan_id);
  return n?.trim() || "Свободная тренировка";
}

/**
 * История завершённых тренировок (прототип ScreenWorkoutLog).
 */
export default function HistoryPage() {
  const {
    data,
    isPending,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSessionHistory();

  const { data: plans } = useWorkoutPlans();

  const planNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of plans ?? []) {
      m.set(p.id, p.name);
    }
    return m;
  }, [plans]);

  const sessions = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data?.pages],
  );

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage || isFetchingNextPage) {
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: "160px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="no-scrollbar flex min-h-full flex-1 flex-col bg-bg-dark pb-10">
      <header className="flex shrink-0 items-center gap-3 border-b border-[#232323] bg-bg-dark px-4 py-3">
        <Link
          href="/dashboard"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-[#252525] hover:text-white"
          aria-label="Назад на главную"
        >
          <svg
            width={18}
            height={18}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              d="M11 5 6 9l5 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <h1 className="truncate text-lg font-bold text-white">
          История тренировок
        </h1>
      </header>

      <main className="flex-1 px-4 pt-3">
        {isPending ? (
          <ul className="space-y-3" aria-busy aria-label="Загрузка">
            {[0, 1, 2, 3].map((k) => (
              <li
                key={k}
                className="h-28 animate-pulse rounded-2xl bg-[#1a1a1a]"
              />
            ))}
          </ul>
        ) : isError ? (
          <p className="rounded-xl border border-rose-500/35 px-4 py-4 text-sm text-rose-300">
            {(error as Error).message}
          </p>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-[#232323] bg-[#1a1a1a] px-5 py-8 text-center">
            <p className="text-sm text-muted">
              Тренировок пока нет. Начни первую!
            </p>
            <Link
              href="/workouts"
              className="mt-5 inline-flex rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white hover:opacity-95"
            >
              К тренировкам
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {sessions.map((s) => {
                const title = sessionTitle(s, planNames);
                const dateStr = formatHistoryDate(s.started_at);
                const dur = formatDurationMinutes(
                  s.started_at,
                  s.completed_at,
                );
                const vol = parseVolumeKg(s.total_volume_kg ?? null);
                return (
                  <li key={s.session_id}>
                    <article className="rounded-2xl border border-[#232323] bg-[#1a1a1a] p-4">
                      <div className="mb-2.5 flex justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="text-base font-bold text-white">
                            {title}
                          </h2>
                          <p className="mt-1 text-xs text-muted">
                            {dateStr}
                            {dur !== "—" ? ` · ${dur}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-6">
                        {(
                          [
                            {
                              v: "—",
                              l: "сетов",
                            },
                            {
                              v:
                                vol != null
                                  ? `${nf.format(Math.round(vol))} кг`
                                  : "—",
                              l: "поднято",
                            },
                          ] as const
                        ).map((row) => (
                          <div key={row.l}>
                            <div className="text-[15px] font-bold text-accent">
                              {row.v}
                            </div>
                            <div className="mt-0.5 text-[11px] text-muted">
                              {row.l}
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
            <div ref={sentinelRef} className="h-4 w-full" aria-hidden />
            {isFetchingNextPage ? (
              <p className="pb-4 pt-2 text-center text-xs text-muted">
                Загрузка…
              </p>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
