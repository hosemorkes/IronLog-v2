"use client";

import Link from "next/link";

import { useWorkoutPlans } from "@/lib/hooks/useWorkouts";

/**
 * Список планов тренировок пользователя.
 */
export default function WorkoutsListPage() {
  const { data: plans, error, isPending } = useWorkoutPlans();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-light pb-4 dark:bg-bg-dark">
      <header className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-gray-900 dark:text-white">
            Мои тренировки <span className="text-accent">·</span>
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-[#888]">
            Планы из конструктора. Откройте карточку, чтобы посмотреть состав.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Link
            href="/workouts/new"
            className="rounded-full bg-accent px-3 py-2 text-center text-[12px] font-semibold leading-tight text-white shadow-sm transition hover:bg-accent-dark sm:px-4 sm:text-[13px]"
          >
            Создать тренировку
          </Link>
          <Link
            href="/exercises"
            className="rounded-full border border-gray-200 bg-transparent px-3 py-2 text-center text-[12px] font-semibold leading-tight text-gray-900 transition hover:border-accent/50 hover:text-accent dark:border-border dark:text-white sm:px-4 sm:text-[13px]"
          >
            Библиотека упражнений →
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4">
        {isPending ? (
          <ul className="space-y-3" aria-busy aria-label="Загрузка планов">
            {[0, 1, 2].map((s) => (
              <li
                key={`sk-${String(s)}`}
                className="h-[100px] animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-[#232323] dark:bg-[#1a1a1a]"
              />
            ))}
          </ul>
        ) : error ? (
          <p className="rounded-2xl border border-rose-500/40 bg-rose-950/30 px-4 py-6 text-center text-sm text-rose-300">
            {(error as Error).message}
          </p>
        ) : !plans?.length ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-100 px-6 py-14 text-center dark:border-[#232323] dark:bg-[#1a1a1a]">
            <p className="text-sm text-gray-500 dark:text-[#888]">Пока нет сохранённых планов.</p>
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
                <article className="rounded-2xl border border-gray-200 bg-gray-100 p-4 shadow-sm dark:border-[#232323] dark:bg-[#1a1a1a]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[17px] font-bold text-gray-900 dark:text-white">
                        {plan.name}
                      </h2>
                      <p className="mt-1 text-[13px] text-gray-500 dark:text-[#888]">
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
                      className="shrink-0 rounded-full border border-gray-200 bg-gray-200 px-4 py-2 text-[13px] font-semibold text-gray-900 transition hover:border-accent/40 hover:text-accent dark:border-[#232323] dark:bg-[#252525] dark:text-white"
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
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 py-3.5 text-[15px] font-semibold text-gray-500 transition hover:border-accent/40 hover:text-gray-900 dark:border-[#232323] dark:text-[#888] dark:hover:text-white"
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
