"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useWorkoutPlan } from "@/lib/hooks/useWorkouts";

/**
 * Просмотр сохранённого плана (карточка из списка «Открыть»).
 */
export default function WorkoutPlanDetailPage() {
  const params = useParams();
  const planId = typeof params.id === "string" ? params.id : null;
  const { data: plan, error, isPending } = useWorkoutPlan(planId);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-dark pb-8">
      <header className="flex shrink-0 items-center gap-2 border-b border-[#232323] px-4 py-3">
        <Link
          href="/workouts"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-[#252525] hover:text-white"
          aria-label="Назад"
        >
          <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M11 5 6 9l5 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="truncate text-[17px] font-bold text-white">План</h1>
      </header>

      <main className="flex-1 px-4 pt-4">
        {!planId ? (
          <p className="text-sm text-muted">Некорректная ссылка.</p>
        ) : isPending ? (
          <div className="space-y-3" aria-busy aria-label="Загрузка">
            <div className="h-10 animate-pulse rounded-xl bg-[#1a1a1a]" />
            <div className="h-24 animate-pulse rounded-2xl bg-[#1a1a1a]" />
            <div className="h-24 animate-pulse rounded-2xl bg-[#1a1a1a]" />
          </div>
        ) : error ? (
          <p className="rounded-xl border border-rose-500/35 px-4 py-4 text-sm text-rose-300">
            {(error as Error).message}
          </p>
        ) : plan ? (
          <>
            <div className="rounded-2xl border border-[#232323] bg-[#1a1a1a] p-4">
              <h2 className="text-xl font-bold text-white">{plan.name}</h2>
              {plan.description ? (
                <p className="mt-2 text-sm text-muted">{plan.description}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {plan.assigned_by_trainer ? (
                  <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 font-medium text-accent">
                    От тренера
                  </span>
                ) : null}
                <span className="text-muted">
                  {plan.exercises.length}{" "}
                  {plan.exercises.length === 1 ? "упражнение" : "упражнений"}
                </span>
              </div>
            </div>

            <ul className="mt-4 space-y-3">
              {[...plan.exercises]
                .sort((a, b) => a.order - b.order)
                .map((row, idx) => {
                  const title =
                    row.exercise.name_ru.trim() || row.exercise.name;
                  const w =
                    row.weight_kg !== null && row.weight_kg !== ""
                      ? String(row.weight_kg)
                      : "—";
                  return (
                    <li key={row.id}>
                      <article className="rounded-2xl border border-[#232323] bg-[#1a1a1a] p-4">
                        <div className="flex gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-sm font-bold text-accent">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-white">{title}</h3>
                            <p className="mt-1 text-xs text-muted">
                              {row.exercise.muscle_group} · {row.exercise.equipment}
                            </p>
                            <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                              <div className="rounded-lg bg-[#252525] py-2">
                                <dt className="text-muted">Подходы</dt>
                                <dd className="font-semibold text-accent">{row.sets}</dd>
                              </div>
                              <div className="rounded-lg bg-[#252525] py-2">
                                <dt className="text-muted">Повторы</dt>
                                <dd className="font-semibold text-accent">{row.reps}</dd>
                              </div>
                              <div className="rounded-lg bg-[#252525] py-2">
                                <dt className="text-muted">Вес</dt>
                                <dd className="font-semibold text-accent">{w}</dd>
                              </div>
                            </dl>
                            {row.rest_seconds != null ? (
                              <p className="mt-2 text-xs text-muted">
                                Отдых: {row.rest_seconds} с
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}
            </ul>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                href={`/session/${plan.id}`}
                className="block rounded-2xl bg-emerald-600 py-3 text-center text-sm font-semibold text-white shadow-md hover:bg-emerald-500"
              >
                Начать тренировку
              </Link>
              <Link
                href="/workouts/new"
                className="block rounded-2xl border border-[#232323] bg-[#1a1a1a] py-3 text-center text-sm font-semibold text-white hover:border-accent/40"
              >
                Создать новый план
              </Link>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
