"use client";

import Link from "next/link";
import { useMemo } from "react";

import { AchievementsWidget } from "@/components/dashboard/AchievementsWidget";
import { PRWidget } from "@/components/dashboard/PRWidget";
import { TonnageWidget } from "@/components/dashboard/TonnageWidget";
import { WeeklyChart } from "@/components/dashboard/WeeklyChart";
import { getAccessToken } from "@/lib/auth";
import {
  useAchievementsFeedQuery,
  useCurrentUserQuery,
  useRecentPrsQuery,
  useUserProgressQuery,
} from "@/lib/hooks/useDashboardData";
import { useAuthStore } from "@/lib/stores/authStore";
import type {
  UserAchievementFeedItemDto,
  WeeklyDayTonnageDto,
} from "@/lib/types/dashboard";

const nf = new Intl.NumberFormat("ru-RU");

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

function emptyWeek(): WeeklyDayTonnageDto[] {
  const out: WeeklyDayTonnageDto[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dow = d.getDay();
    const map = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const dayLabel = map[dow];
    const isToday = i === 0;
    out.push({
      date: d.toISOString().slice(0, 10),
      day_label: dayLabel,
      tonnage_kg: 0,
      is_today: isToday,
    });
  }
  return out;
}

/**
 * Главный дашборд: приветствие, тоннаж, неделя, PR, ачивки, CTA тренировки.
 */
export default function DashboardPage() {
  const hasToken =
    typeof window !== "undefined" ? !!getAccessToken() : false;

  const { data: me, isPending: mePending } = useCurrentUserQuery();
  const { data: progress, isPending: progressPending } =
    useUserProgressQuery();
  const { data: prs, isPending: prsPending } = useRecentPrsQuery();
  const { data: achievements, isPending: achPending } =
    useAchievementsFeedQuery();

  const storeUser = useAuthStore((s) => s.user);
  const displayName =
    me?.username?.trim() ||
    storeUser?.username?.trim() ||
    (hasToken ? "…" : "Атлет");

  const weekDays = progress?.weekly_tonnage_by_day?.length
    ? progress.weekly_tonnage_by_day
    : emptyWeek();

  const weeklySumKg = useMemo(
    () => weekDays.reduce((a, d) => a + d.tonnage_kg, 0),
    [weekDays],
  );

  const workoutsLast7 = useMemo(() => {
    if (!progress?.weekly_tonnage_by_day) {
      return 0;
    }
    return progress.weekly_tonnage_by_day.filter((d) => d.tonnage_kg > 0)
      .length;
  }, [progress?.weekly_tonnage_by_day]);

  const prItems = prs?.items ?? [];
  const achItems: UserAchievementFeedItemDto[] = achievements?.items ?? [];

  const activeSessionId = progress?.active_session_id ?? null;
  const ctaHref = activeSessionId
    ? `/session/${activeSessionId}`
    : "/exercises";
  const ctaLabel = activeSessionId ? "Продолжить тренировку" : "Начать тренировку";

  const loadingSurface =
    (hasToken && (mePending || progressPending)) ||
    (hasToken && prsPending) ||
    (hasToken && achPending);

  const lifetime =
    progress?.total_lifetime_tonnage_kg ?? 0;
  const streak = progress?.workout_streak_days ?? 0;
  const totalWorkouts = progress?.workouts_completed_total ?? 0;

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
              Войдите в аккаунт — загрузим тоннаж, рекорды и ачивки с сервера.
            </p>
          ) : null}
        </div>
        <div
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1.5"
          title="Дней подряд с тренировкой"
        >
          <span aria-hidden>🔥</span>
          <span className="text-[13px] font-bold text-amber-400">
            {loadingSurface && hasToken ? "…" : `${streak} дн.`}
          </span>
        </div>
      </header>

      <div className="mt-3 grid grid-cols-3 gap-2.5 px-4">
        {[
          {
            val: loadingSurface && hasToken ? "…" : `${workoutsLast7}/7`,
            lbl: "Дней с нагрузкой",
            sub: "за неделю",
          },
          {
            val: loadingSurface && hasToken ? "…" : nf.format(totalWorkouts),
            lbl: "Тренировок",
            sub: "всего завершено",
          },
          {
            val:
              loadingSurface && hasToken
                ? "…"
                : `${nf.format(Math.round(weeklySumKg))} кг`,
            lbl: "Тоннаж",
            sub: "7 дней",
          },
        ].map((s) => (
          <div
            key={s.lbl}
            className="rounded-2xl border border-border bg-surface px-2.5 py-3"
          >
            <p className="text-lg font-extrabold tracking-tight text-white">
              {s.val}
            </p>
            <p className="text-[10px] text-muted">{s.lbl}</p>
            <p className="mt-1 text-[10px] font-semibold text-emerald-400/90">
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 px-4">
        <Link
          href={ctaHref}
          className="block rounded-2xl border border-accent/35 bg-gradient-to-br from-[#1d1630] to-[#1a1a2e] p-4 transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                {activeSessionId ? "Сейчас" : "Сборка"}
              </p>
              <p className="text-lg font-bold text-white">{ctaLabel}</p>
            </div>
            <span className="rounded-full border border-accent/40 bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
              →
            </span>
          </div>
          <p className="mt-2 text-xs text-muted">
            {activeSessionId
              ? "У вас есть незавершённая сессия — вернитесь к подходам."
              : "Перейдите к упражнениям и соберите тренировку (конструктор в разработке)."}
          </p>
          <div className="mt-3 rounded-xl bg-accent py-3 text-center text-[15px] font-bold text-white">
            {ctaLabel} →
          </div>
        </Link>
      </div>

      <div className="mt-4 space-y-4 px-4">
        {hasToken && progressPending ? (
          <div
            className="h-52 animate-pulse rounded-2xl bg-surface"
            aria-hidden
          />
        ) : (
          <TonnageWidget totalLifetimeKg={lifetime} />
        )}
        <WeeklyChart days={weekDays} />
        <PRWidget items={prItems} />
        <AchievementsWidget items={achItems} />
      </div>
    </main>
  );
}
