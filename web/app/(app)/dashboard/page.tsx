"use client";

import Link from "next/link";
import { useMemo } from "react";

import {
  emptyCalendarWeekChart,
  ProgressHomeSection,
  weeklyDtoToChart,
} from "@/components/dashboard/ProgressHomeSection";
import { getAccessToken } from "@/lib/auth";
import { useCurrentUserQuery } from "@/lib/hooks/useDashboardData";
import {
  useAchievements,
  usePersonalRecords,
  useRecentSessions,
  useUserProgress,
  useWeeklyProgress,
} from "@/lib/hooks/useProgress";
import { useWorkoutPlans } from "@/lib/hooks/useWorkouts";
import { useAuthStore } from "@/lib/stores/authStore";
import type {
  UserAchievementFeedItemDto,
  WeeklyDayTonnageDto,
} from "@/lib/types/dashboard";

const nf = new Intl.NumberFormat("ru-RU");
const dfSession = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function greetingByHour(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) {
    return "Доброе утро";
  }
  if (h >= 11 && h < 17) {
    return "Добрый день";
  }
  if (h >= 17 && h < 23) {
    return "Добрый вечер";
  }
  return "Доброй ночи";
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

function formatSessionDuration(startIso: string, endIso: string | null): string {
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

/**
 * Главный дашборд: приветствие, сводка, активная сессия, последняя тренировка; внизу — статистика как на бывшем /progress.
 */
export default function DashboardPage() {
  const hasToken =
    typeof window !== "undefined" ? !!getAccessToken() : false;

  const { data: me, isPending: mePending } = useCurrentUserQuery();
  const { data: progress, isPending: progressPending } = useUserProgress();
  const { data: weeklyRaw, isPending: weeklyPending } = useWeeklyProgress();
  const { data: sessions, isPending: sessionsPending } =
    useRecentSessions();
  const { data: prs, isPending: prsPending } = usePersonalRecords();
  const { data: achievements, isPending: achPending } = useAchievements();
  const { data: plans } = useWorkoutPlans({
    enabled: hasToken,
  });

  const storeUser = useAuthStore((s) => s.user);
  const displayName =
    me?.username?.trim() ||
    storeUser?.username?.trim() ||
    (hasToken ? "…" : "Атлет");

  const weekChartDays = useMemo((): WeeklyDayTonnageDto[] => {
    if (weeklyRaw && weeklyRaw.length === 7) {
      return weeklyDtoToChart(weeklyRaw);
    }
    return emptyCalendarWeekChart();
  }, [weeklyRaw]);

  const weeklySumKg = useMemo(
    () => weekChartDays.reduce((a, d) => a + d.tonnage_kg, 0),
    [weekChartDays],
  );

  /** Дней с хотя бы одной завершённой сессией (текущая календарная неделя UTC). */
  const weeklyTrainingDays = useMemo(() => {
    if (!weeklyRaw || weeklyRaw.length === 0) {
      return 0;
    }
    return weeklyRaw.filter((d) => d.workout_count > 0).length;
  }, [weeklyRaw]);

  const prItems = prs?.items ?? [];
  const achItems: UserAchievementFeedItemDto[] = achievements?.items ?? [];

  const activeSessionId = progress?.active_session_id ?? null;
  const activePlanId = useMemo(() => {
    if (!activeSessionId || !sessions?.items?.length) {
      return null;
    }
    const row = sessions.items.find(
      (s) => s.session_id === activeSessionId,
    );
    return row?.plan_id ?? null;
  }, [activeSessionId, sessions?.items]);

  const lifetime = progress?.total_lifetime_tonnage_kg ?? 0;
  const streak = progress?.workout_streak_days ?? 0;
  const totalWorkouts = progress?.workouts_completed_total ?? 0;

  const lastCompletedSession = useMemo(() => {
    const items = sessions?.items ?? [];
    return items.find((s) => s.completed_at != null) ?? null;
  }, [sessions]);

  const lastPlanName = useMemo(() => {
    if (!lastCompletedSession?.plan_id) {
      return "Свободная тренировка";
    }
    const p = plans?.find((x) => x.id === lastCompletedSession.plan_id);
    return p?.name?.trim() || "План";
  }, [lastCompletedSession?.plan_id, plans]);

  const loadingDash =
    hasToken &&
    (mePending ||
      progressPending ||
      weeklyPending ||
      sessionsPending ||
      prsPending ||
      achPending);

  const showStreakBadge = hasToken && !loadingDash && streak > 0;

  return (
    <main className="no-scrollbar min-h-full overflow-y-auto pb-6">
      <header className="flex items-start justify-between gap-3 px-5 pt-3">
        <div>
          <p className="text-[13px] text-muted">{greetingByHour()},</p>
          <h1 className="mt-0.5 text-[26px] font-extrabold tracking-tight text-white">
            {displayName} <span className="text-accent">·</span>
          </h1>
          {!hasToken ? (
            <p className="mt-2 max-w-sm text-xs text-muted">
              Войдите в аккаунт — загрузим поднятый вес, рекорды и ачивки с сервера.
            </p>
          ) : null}
        </div>
        {loadingDash && hasToken ? (
          <div
            className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-surface"
            aria-hidden
          />
        ) : showStreakBadge ? (
          <div
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1.5"
            title="Дней подряд с тренировкой"
          >
            <span aria-hidden>🔥</span>
            <span className="text-[13px] font-bold text-amber-400">
              {streak} дн.
            </span>
          </div>
        ) : (
          <div className="w-24 shrink-0" aria-hidden />
        )}
      </header>

      {hasToken && activeSessionId ? (
        <div className="mt-3 px-4">
          <div className="rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3">
            {activePlanId ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                    Активная тренировка
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-white">
                    Есть незавершённая сессия
                  </p>
                </div>
                <Link
                  href={`/session/${activePlanId}`}
                  className="shrink-0 rounded-full bg-accent px-4 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-accent-dark"
                >
                  Продолжить
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                  Активная тренировка
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  Откройте историю, если нужно найти эту тренировку.
                </p>
                <Link
                  href="/history"
                  className="mt-2 inline-block text-[13px] font-semibold text-accent hover:underline"
                >
                  К истории →
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-2.5 px-4">
        {loadingDash && hasToken
          ? [0, 1, 2].map((k) => (
              <div
                key={k}
                className="h-[88px] animate-pulse rounded-2xl bg-surface"
                aria-hidden
              />
            ))
          : [
              {
                val: `${weeklyTrainingDays}/7`,
                lbl: "Тренировок за неделю",
                sub: "дней с нагрузкой",
              },
              {
                val: nf.format(totalWorkouts),
                lbl: "Тренировок",
                sub: "всего завершено",
              },
              {
                val: `${nf.format(Math.round(weeklySumKg))} кг`,
                lbl: "Поднято",
                sub: "7 дней",
              },
            ].map((s) => (
              <div
                key={s.lbl}
                className="rounded-2xl border border-border bg-surface px-2.5 py-3"
              >
                <p className="text-lg font-extrabold tracking-tight text-white">
                  {hasToken ? s.val : "—"}
                </p>
                <p className="text-[10px] text-muted">{s.lbl}</p>
                <p className="mt-1 text-[10px] font-semibold text-emerald-400/90">
                  {hasToken ? s.sub : ""}
                </p>
              </div>
            ))}
      </div>

      <div className="mt-4 px-4">
        {loadingDash && hasToken ? (
          <div
            className="h-40 animate-pulse rounded-2xl bg-surface"
            aria-hidden
          />
        ) : hasToken ? (
          lastCompletedSession ? (
            <section className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                    Последняя тренировка
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {lastPlanName}
                  </p>
                </div>
                {activeSessionId && activePlanId ? (
                  <Link
                    href={`/session/${activePlanId}`}
                    className="shrink-0 rounded-full border border-accent/40 bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent"
                  >
                    Продолжить →
                  </Link>
                ) : null}
              </div>
              <p className="mt-2 capitalize text-xs text-muted">
                {lastCompletedSession.completed_at
                  ? dfSession.format(
                      new Date(lastCompletedSession.completed_at),
                    )
                  : "—"}
                {" · "}
                {formatSessionDuration(
                  lastCompletedSession.started_at,
                  lastCompletedSession.completed_at,
                )}
              </p>
              <p className="mt-1 text-sm text-white">
                Поднято:{" "}
                {(() => {
                  const v = parseVolumeKg(
                    lastCompletedSession.total_volume_kg ?? null,
                  );
                  return v != null ? `${nf.format(Math.round(v))} кг` : "—";
                })()}
              </p>
              <Link
                href="/history"
                className="mt-3 block text-center text-sm font-semibold text-accent hover:underline"
              >
                Все тренировки →
              </Link>
            </section>
          ) : (
            <Link
              href="/workouts"
              className="block rounded-2xl border border-accent/35 bg-gradient-to-br from-[#1d1630] to-[#1a1a2e] p-4 transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                    Старт
                  </p>
                  <p className="text-lg font-bold text-white">
                    Начни первую тренировку
                  </p>
                </div>
                <span className="rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
                  →
                </span>
              </div>
              <div className="mt-3 rounded-xl bg-accent py-3 text-center text-[15px] font-bold text-white">
                К тренировкам →
              </div>
            </Link>
          )
        ) : null}
      </div>

      <div className="mt-6 px-4">
        <ProgressHomeSection
          hasToken={hasToken}
          loading={Boolean(loadingDash)}
          totalWorkouts={totalWorkouts}
          weeklyTrainingDays={weeklyTrainingDays}
          weeklySumKg={weeklySumKg}
          prItems={prItems}
          achItems={achItems}
          weekChartDays={weekChartDays}
          lifetimeKg={lifetime}
        />
      </div>
    </main>
  );
}
