"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { MuscleMap } from "@/components/exercise/MuscleMap";
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_TAILWIND,
} from "@/lib/exercise/constants";
import { normalizeTechniqueSteps } from "@/lib/exercise/technique";
import { useExerciseDetail } from "@/lib/hooks/useExerciseDetail";

/** TODO: GET /api/user/progress или аналог — подставки до готовности API. */
const STATS_PLACEHOLDER = {
  totalSets: "—",
  workouts: "—",
  tonnageKg: "—",
} as const;

/** TODO: GET для личных рекордов по упражнению — сейчас заглушки. */
const PR_PLACEHOLDER = {
  display: "—",
  dateLabel: "Нет записей",
} as const;

function difficultyLabel(slug: string): string {
  return DIFFICULTY_LABELS[slug] ?? slug;
}

function difficultyAccentClass(slug: string): string {
  const base =
    "rounded-lg px-2.5 py-1 text-[12px] font-medium ";
  const tint = DIFFICULTY_TAILWIND[slug];
  const bg =
    slug === "beginner"
      ? " bg-emerald-500/15 "
      : slug === "intermediate"
        ? " bg-amber-500/15 "
        : slug === "advanced"
          ? " bg-rose-500/15 "
          : " bg-muted/20 ";
  return base + bg + (tint ?? "text-muted");
}

export default function ExerciseDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : undefined;
  const { data, error, isPending } = useExerciseDetail(id);
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false);

  if (!id) {
    return (
      <main className="px-5 pt-12 text-center text-muted">
        Некорректный адрес упражнения.
      </main>
    );
  }

  if (isPending) {
    return (
      <div className="min-h-[50vh] animate-pulse space-y-4 p-5">
        <div className="h-52 rounded-2xl bg-surface" />
        <div className="h-8 rounded-lg bg-surface" />
        <div className="h-24 rounded-xl bg-surface" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <main className="px-5 pt-12 text-center text-sm text-rose-400">
        {(error as Error).message ?? "Не удалось загрузить упражнение"}
      </main>
    );
  }

  const title = data.name_ru.trim() || data.name;
  const primaryList = [data.muscle_group];
  const secondaryList = data.secondary_muscles ?? [];
  const steps = normalizeTechniqueSteps(data.technique_steps);

  return (
    <>
      <div className="pb-36">
        <header className="relative min-h-[240px] bg-surface/80">
          {data.image_url ? (
            <div
              aria-hidden
              className="absolute inset-0 bg-cover bg-center opacity-[0.22] blur-sm"
              style={{ backgroundImage: `url(${data.image_url})` }}
            />
          ) : null}
          <Link
            href="/exercises"
            className="absolute left-4 top-4 z-[2] flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/65"
            aria-label="Назад к каталогу"
          >
            <ChevronLeftIcon />
          </Link>
          <button
            type="button"
            className="absolute right-4 top-4 z-[2] rounded-full bg-accent px-3.5 py-2 text-[13px] font-semibold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-dark"
            onClick={() => setWorkoutModalOpen(true)}
          >
            + В тренировку
          </button>
          <div className="relative z-[1] flex items-center justify-center pt-14">
            <MuscleMap
              primaryMuscles={primaryList}
              secondaryMuscles={secondaryList}
            />
          </div>
        </header>

        <article className="space-y-5 px-5 pt-5">
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-white">
            {title}
          </h1>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-lg bg-muscle-blue/15 px-2.5 py-1 text-[12px] font-medium text-muscle-blue">
              {data.muscle_group}
            </span>
            <span className="rounded-lg bg-accent/15 px-2.5 py-1 text-[12px] font-medium text-accent">
              {data.equipment}
            </span>
            <span className={difficultyAccentClass(data.difficulty)}>
              {difficultyLabel(data.difficulty)}
            </span>
          </div>

          {data.description ? (
            <p className="text-sm leading-relaxed text-muted">{data.description}</p>
          ) : null}

          <div className="grid grid-cols-3 gap-2.5">
            <StatBox value={STATS_PLACEHOLDER.totalSets} label="подходов" />
            <StatBox value={STATS_PLACEHOLDER.workouts} label="тренировок" />
            <StatBox value={STATS_PLACEHOLDER.tonnageKg} label="кг тоннаж" />
          </div>
          <p className="text-[10px] leading-snug text-muted/90">
            TODO: агрегаты по данным пользователя после эндпоинтов прогресса /
            журнала подходов.
          </p>

          <Divider />

          <section>
            <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.55px] text-muted">
              Личный рекорд
            </h2>
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-muted">Лучший результат</p>
                <p className="mt-1 text-[22px] font-bold leading-tight text-white">
                  {PR_PLACEHOLDER.display}
                </p>
                <p className="mt-0.5 text-xs text-muted">{PR_PLACEHOLDER.dateLabel}</p>
              </div>
              <span className="inline-flex shrink-0 self-start rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 sm:self-center">
                PR
              </span>
            </div>
            <p className="mt-2 text-[10px] text-muted/90">
              TODO: отдать с API связку вес × повторы и дату (personal_records /
              workout_sets с is_pr).
            </p>
          </section>

          <Divider />

          <section>
            <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.55px] text-muted">
              Мышцы
            </h2>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border-[1.5px] border-accent/50 bg-accent/10 px-3 py-1.5 text-[13px] font-medium text-accent">
                {data.muscle_group} (осн.)
              </span>
              {secondaryList.map((m) => (
                <span
                  key={m}
                  className="rounded-full border border-border bg-bg-dark px-3 py-1.5 text-[13px] text-muted"
                >
                  {m}
                </span>
              ))}
            </div>
          </section>

          <Divider />

          <section>
            <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.55px] text-muted">
              Техника выполнения
            </h2>
            <ol className="space-y-3">
              {steps.length === 0 ? (
                <li className="text-sm text-muted">
                  Шаги пока не добавлены в справочник.
                </li>
              ) : (
                steps.map((step, i) => (
                  <li key={`${String(i)}-${step.slice(0, 24)}`} className="flex gap-3">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[12px] font-bold leading-none text-white"
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <p className="pt-0.5 text-[14px] leading-relaxed text-white/85">
                      {step}
                    </p>
                  </li>
                ))
              )}
            </ol>
          </section>
        </article>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom,0)]">
        <div className="pointer-events-auto border-t border-border bg-surface/95 px-5 py-3 backdrop-blur-md">
          <button
            type="button"
            className="w-full rounded-2xl bg-accent py-4 text-[16px] font-bold text-white shadow-lg shadow-accent/25 transition hover:bg-accent-dark"
            onClick={() => setWorkoutModalOpen(true)}
          >
            Добавить в тренировку
          </button>
        </div>
      </div>

      {workoutModalOpen ? (
        <ModalWorkoutStub onClose={() => setWorkoutModalOpen(false)} />
      ) : null}
    </>
  );
}

function Divider() {
  return <div className="my-5 h-px bg-border" role="presentation" />;
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-dark px-2 py-3 text-center">
      <div className="mb-1 text-lg font-bold text-accent">{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ModalWorkoutStub({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workout-modal-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface px-6 py-5 shadow-xl">
        <h2
          id="workout-modal-title"
          className="text-lg font-semibold text-white"
        >
          Тренировка
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Здесь будет выбор плана или создание тренировки после появления API
          планов и конструктора. Пока используйте этот диалог как заглушку.
        </p>
        <button
          type="button"
          className="mt-6 w-full rounded-xl bg-accent py-3 text-[15px] font-semibold text-white hover:bg-accent-dark"
          onClick={onClose}
        >
          Понятно
        </button>
      </div>
    </div>
  );
}
