"use client";

import Link from "next/link";

import { useWorkoutPlans } from "@/lib/hooks/useWorkouts";

/**
 * Список планов тренировок пользователя.
 */
export default function WorkoutsListPage() {
  const { data: plans, error, isPending } = useWorkoutPlans();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-dark pb-4">
      <header className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-white">
            Мои тренировки <span className="text-accent">·</span>
          </h1>
          <p className="mt-1 text-xs text-muted">
            Планы из конструктора. Откройте карточку, чтобы посмотреть состав.
          </p>
        </div>
        <Link
          href="/workouts/new"
          className="shrink-0 rounded-full bg-accent px-3 py-2 text-center text-[12px] font-semibold leading-tight text-white shadow-sm transition hover:bg-accent-dark sm:px-4 sm:text-[13px]"
        >
          Создать тренировку
        </Link>
      </header>

      <main className="flex-1 px-4">
        {isPending ? (
          <ul className="space-y-3" aria-busy aria-label="Загрузка планов">
            {[0, 1, 2].map((s) => (
              <li
                key={`sk-${String(s)}`}
                className="h-[100px] animate-pulse rounded-2xl border border-[#232323] bg-[#1a1a1a]"
              />
            ))}
          </ul>
        ) : error ? (
          <p className="rounded-2xl border border-rose-500/40 bg-rose-950/30 px-4 py-6 text-center text-sm text-rose-300">
            {(error as Error).message}
          </p>
        ) : !plans?.length ? (
          <div className="rounded-2xl border border-dashed border-[#232323] bg-[#1a1a1a] px-6 py-14 text-center">
            <p className="text-sm text-muted">Пока нет сохранённых планов.</p>
            <Link
              href="/workouts/new"
              className="mt-4 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              Создать тренировку
            </Link>
          </div>
        ) : (
          <ul className="space-y-3 pb-8">
            {plans.map((plan) => (
              <li key={plan.id}>
                <article className="rounded-2xl border border-[#232323] bg-[#1a1a1a] p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[17px] font-bold text-white">
                        {plan.name}
                      </h2>
                      <p className="mt-1 text-[13px] text-muted">
                        {plan.exercise_count}{" "}
                        {plan.exercise_count === 1
                          ? "упражнение"
                          : plan.exercise_count < 5
                            ? "упражнения"
                            : "упражнений"}
                      </p>
                      {plan.assigned_by_trainer ? (
                        <p className="mt-2 inline-block rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent">
                          От тренера
                        </p>
                      ) : null}
                    </div>
                    <Link
                      href={`/workouts/${plan.id}`}
                      className="shrink-0 rounded-full border border-[#232323] bg-[#252525] px-4 py-2 text-[13px] font-semibold text-white transition hover:border-accent/40 hover:text-accent"
                    >
                      Открыть
                    </Link>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>

      <div className="px-5 pb-2">
        <Link
          href="/workouts/new"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#232323] py-3.5 text-[15px] font-semibold text-muted transition hover:border-accent/40 hover:text-white"
        >
          <PlusIcon />
          Создать тренировку
        </Link>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      aria-hidden
      width={18}
      height={18}
      viewBox="0 0 18 18"
      fill="none"
      className="text-current"
    >
      <path
        d="M9 2v14M2 9h14"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}
