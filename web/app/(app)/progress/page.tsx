"use client";

import { useMemo } from "react";

import { getTonnageScaleState, TONNAGE_LEVELS } from "@/lib/dashboard/tonnage-scale";
import { getAccessToken } from "@/lib/auth";
import {
  useAchievements,
  usePersonalRecords,
  useUserProgress,
  useWeeklyProgress,
} from "@/lib/hooks/useProgress";
import type {
  RecentPrItemDto,
  UserAchievementFeedItemDto,
  WeeklyDayTonnageDto,
  WeeklyProgressDayDto,
} from "@/lib/types/dashboard";

const nf = new Intl.NumberFormat("ru-RU");
const dfPr = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function utcTodayDate(): Date {
  const n = new Date();
  return new Date(
    Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()),
  );
}

function emptyCalendarWeekChart(): WeeklyDayTonnageDto[] {
  const today = utcTodayDate();
  const dow = today.getUTCDay();
  const mondayDelta = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setUTCDate(monday.getUTCDate() + mondayDelta);
  const labels: string[] = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const out: WeeklyDayTonnageDto[] = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const iso = `${String(y)}-${m}-${day}`;
    const dwd = d.getUTCDay();
    const ix = dwd === 0 ? 6 : dwd - 1;
    const isToday =
      d.getUTCFullYear() === today.getUTCFullYear() &&
      d.getUTCMonth() === today.getUTCMonth() &&
      d.getUTCDate() === today.getUTCDate();
    out.push({
      date: iso,
      day_label: labels[ix] ?? "—",
      tonnage_kg: 0,
      is_today: isToday,
    });
  }
  return out;
}

function weeklyDtoToChart(days: WeeklyProgressDayDto[]): WeeklyDayTonnageDto[] {
  return days.map((d) => ({
    date: typeof d.date === "string" ? d.date.slice(0, 10) : String(d.date),
    day_label: d.day_label,
    tonnage_kg: d.volume_kg,
    is_today: d.is_today,
  }));
}

function formatPrWeightReps(pr: RecentPrItemDto): { main: string; sub: string } {
  if (pr.weight_kg != null) {
    return {
      main: `${nf.format(pr.weight_kg)} кг`,
      sub: `× ${pr.reps_done} повт.`,
    };
  }
  return {
    main: `${pr.reps_done} повт.`,
    sub: "Свой вес / планка",
  };
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between px-5 pb-2 pt-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
    </div>
  );
}

function ProgressPageSkeleton() {
  return (
    <div className="animate-pulse space-y-3 px-4 pb-8">
      <div className="h-28 rounded-2xl bg-[#1a1a1a]" />
      <div className="grid grid-cols-2 gap-2.5">
        {[0, 1, 2, 3].map((k) => (
          <div key={k} className="h-[118px] rounded-2xl bg-[#1a1a1a]" />
        ))}
      </div>
      <div className="h-[170px] rounded-[18px] bg-[#1a1a1a]" />
      <div className="h-[156px] rounded-2xl bg-[#1a1a1a]" />
      <div className="h-[200px] rounded-2xl bg-[#1a1a1a]" />
      <div className="h-[112px] rounded-2xl bg-[#1a1a1a]" />
    </div>
  );
}

/**
 * Экран прогресса (прототип ScreenProgress): статистика, тоннаж, неделя, PR, ачивки.
 */
export default function ProgressPage() {
  const hasToken =
    typeof window !== "undefined" ? !!getAccessToken() : false;

  const { data: progress, isPending: progressPending } = useUserProgress();
  const { data: weeklyRaw, isPending: weeklyPending } = useWeeklyProgress();
  const { data: prs, isPending: prsPending } = usePersonalRecords();
  const { data: achievements, isPending: achPending } = useAchievements();

  const weekChartDays = useMemo((): WeeklyDayTonnageDto[] => {
    if (weeklyRaw && weeklyRaw.length === 7) {
      return weeklyDtoToChart(weeklyRaw);
    }
    return emptyCalendarWeekChart();
  }, [weeklyRaw]);

  const weeklyTrainingDays = useMemo(() => {
    if (!weeklyRaw || weeklyRaw.length === 0) {
      return 0;
    }
    return weeklyRaw.filter((d) => d.workout_count > 0).length;
  }, [weeklyRaw]);

  const weeklySumKg = useMemo(
    () => weekChartDays.reduce((a, d) => a + d.tonnage_kg, 0),
    [weekChartDays],
  );

  const prItems: RecentPrItemDto[] = prs?.items ?? [];
  const achItems: UserAchievementFeedItemDto[] = achievements?.items ?? [];

  const lifetime = progress?.total_lifetime_tonnage_kg ?? 0;
  const streak = progress?.workout_streak_days ?? 0;
  const totalWorkouts = progress?.workouts_completed_total ?? 0;

  const scale = useMemo(
    () => getTonnageScaleState(lifetime),
    [lifetime],
  );

  const tonnageFooter = useMemo(() => {
    const idx = scale.currentLevelIndex;
    if (idx < 0) {
      const next = TONNAGE_LEVELS[0];
      return {
        left: "Старт",
        center: `${nf.format(Math.round(lifetime))} / ${nf.format(next.minKg)} кг`,
        right: next.objectLabel,
      };
    }
    const current = TONNAGE_LEVELS[idx];
    const next = TONNAGE_LEVELS[idx + 1];
    if (!next) {
      return {
        left: `${current.objectLabel} ✓`,
        center: `${nf.format(Math.round(lifetime))} кг`,
        right: "Шкала пройдена",
      };
    }
    return {
      left: `${current.objectLabel} ✓`,
      center: `${nf.format(Math.round(lifetime))} / ${nf.format(next.minKg)} кг`,
      right: next.objectLabel,
    };
  }, [lifetime, scale.currentLevelIndex]);

  const maxWeekT = Math.max(...weekChartDays.map((d) => d.tonnage_kg), 1);

  const loading =
    hasToken &&
    (progressPending || weeklyPending || prsPending || achPending);

  const showStreakBadge = hasToken && !loading && streak > 0;

  return (
    <main className="no-scrollbar min-h-full overflow-y-auto bg-bg-dark pb-8">
      <header className="flex items-center justify-between gap-3 bg-bg-dark px-5 pb-3.5 pt-3">
        <h1 className="text-[26px] font-extrabold tracking-tight text-white">
          Прогресс <span className="text-accent">•</span>
        </h1>
        {loading ? (
          <div
            className="h-9 w-[100px] shrink-0 animate-pulse rounded-full bg-[#1a1a1a]"
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
          <div className="w-[100px] shrink-0" aria-hidden />
        )}
      </header>

      {loading ? (
        <ProgressPageSkeleton />
      ) : (
        <>
          {/* Сетка статистики */}
          <div className="grid grid-cols-2 gap-2.5 px-4 pb-3.5">
            {[
              {
                lbl: "Тренировок",
                val: hasToken ? nf.format(totalWorkouts) : "—",
                sub: "за всё время",
              },
              {
                lbl: "Эта неделя",
                val: hasToken ? String(weeklyTrainingDays) : "—",
                sub: "дней с тренировкой",
              },
              {
                lbl: "Объём / неделя",
                val: hasToken
                  ? nf.format(Math.round(weeklySumKg))
                  : "—",
                sub: "кг тоннаж",
              },
              {
                lbl: "Личных рекордов",
                val: hasToken ? String(prItems.length) : "—",
                sub: "всего PR",
              },
            ].map((s) => (
              <div
                key={s.lbl}
                className="rounded-2xl border border-[#252525] bg-[#1a1a1a] p-4"
              >
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                  {s.lbl}
                </p>
                <p className="text-[26px] font-extrabold tracking-tight text-white">
                  {s.val}
                </p>
                <p className="mt-1 text-xs text-[#666]">{s.sub}</p>
              </div>
            ))}
          </div>

          <SectionLabel label="Тоннаж — путь к рекорду" />
          <div className="mx-4 mb-3.5 rounded-[18px] border border-accent/35 bg-gradient-to-br from-[#1d1630] to-[#1a1a2e] p-[18px]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-[#6b5ea8]">
                  Общий тоннаж
                </p>
                <p>
                  <span className="text-[32px] font-black tracking-tight text-[#c4b8f8]">
                    {nf.format(Math.round(lifetime))}
                  </span>
                  <span className="ml-0.5 text-sm font-semibold text-[#7060b0]">
                    {" "}
                    кг
                  </span>
                </p>
              </div>
              <div className="shrink-0 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-bold text-accent">
                {Math.round(scale.segmentProgress * 100)}%
              </div>
            </div>
            <div className="mb-2 h-2 w-full overflow-hidden rounded bg-[#2a2040]">
              <div
                className="h-full rounded bg-gradient-to-r from-[#5b4ff0] to-[#9b87e8] transition-[width] duration-500"
                style={{ width: `${Math.round(scale.segmentProgress * 100)}%` }}
              />
            </div>
            <div className="flex items-start justify-between gap-1 text-[11px]">
              <span className="min-w-0 shrink text-[#6050a0]">
                {tonnageFooter.left}
              </span>
              <span className="shrink-0 text-center font-bold text-accent">
                {tonnageFooter.center}
              </span>
              <span className="min-w-0 shrink text-right text-[#6050a0]">
                {tonnageFooter.right}
              </span>
            </div>
          </div>

          <SectionLabel label="Активность — 7 дней" />
          <div className="mx-4 mb-3.5 rounded-2xl border border-[#252525] bg-[#1a1a1a] p-4">
            <p className="mb-3.5 text-[13px] font-semibold text-white">
              Тоннаж по дням (кг)
            </p>
            <div className="flex h-[80px] items-end justify-between gap-1.5">
              {weekChartDays.map((d) => {
                const h =
                  maxWeekT > 0
                    ? Math.round((d.tonnage_kg / maxWeekT) * 74)
                    : 0;
                const barH = Math.max(
                  h || (d.tonnage_kg > 0 ? 4 : 3),
                  3,
                );
                let barBg = "#1a1a1a";
                if (d.is_today) {
                  barBg = "#22c55e";
                } else if (d.tonnage_kg > 0) {
                  barBg = "#7c6ef2";
                } else {
                  barBg = "#2a2a2a";
                }
                let labelClass = "font-semibold text-[#555]";
                if (d.is_today) {
                  labelClass = "font-semibold text-emerald-400";
                } else if (d.tonnage_kg > 0) {
                  labelClass = "font-semibold text-accent";
                }
                return (
                  <div
                    key={d.date}
                    className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                  >
                    <div
                      className="w-full rounded-t transition-all"
                      style={{
                        height: barH,
                        backgroundColor: barBg,
                      }}
                      title={`${d.day_label}: ${nf.format(Math.round(d.tonnage_kg))} кг`}
                    />
                    <span className={`text-[10px] ${labelClass}`}>
                      {d.day_label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <SectionLabel label="Личные рекорды" />
          <div className="mx-4 mb-3.5 overflow-hidden rounded-2xl border border-[#252525] bg-[#1a1a1a]">
            {prItems.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted">
                Установи первый рекорд на тренировке
              </p>
            ) : (
              prItems.map((pr, i) => {
                const { main, sub } = formatPrWeightReps(pr);
                return (
                  <div
                    key={`${pr.exercise_id}-${pr.achieved_at}-${pr.set_num}`}
                    className={`flex items-center justify-between gap-3 px-3.5 py-3 ${
                      i > 0 ? "border-t border-[#232323]" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">
                        {pr.exercise_name}
                      </p>
                      <p className="text-[11px] text-[#666]">
                        {dfPr.format(new Date(pr.achieved_at))}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-extrabold text-accent">
                        {main}
                      </p>
                      <p className="text-[11px] text-[#666]">{sub}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <SectionLabel label="Достижения" />
          {achItems.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-muted">
              Достижения появятся по мере тренировок
            </p>
          ) : (
            <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 pb-6">
              {achItems.map((a) => {
                const unlocked = Boolean(a.unlocked_at);
                return (
                  <div
                    key={a.achievement_id}
                    className="w-[90px] shrink-0 rounded-[14px] border border-[#252525] bg-[#1a1a1a] px-2 py-3 text-center transition-opacity"
                    style={{ opacity: unlocked ? 1 : 0.3 }}
                  >
                    <div className="mb-1.5 text-[26px]" aria-hidden>
                      {a.icon?.trim() || "🏅"}
                    </div>
                    <p className="text-[11px] font-semibold leading-snug text-white/90">
                      {a.name}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}
