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
import { getMediaUrl } from "@/lib/utils/media";

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
  return base + bg + (tint ?? "text-gray-500 dark:text-muted");
}

export default function ExerciseDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : undefined;
  const { data, error, isPending } = useExerciseDetail(id);
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false);

  if (!id) {
    return (
      <main className="min-h-full bg-gray-100 px-5 pt-12 text-center text-gray-500 dark:bg-[#111] dark:text-muted">
        Некорректный адрес упражнения.
      </main>
    );
  }

  if (isPending) {
    return (
      <div className="min-h-[50vh] animate-pulse space-y-4 bg-gray-100 p-5 dark:bg-[#111]">
        <div className="h-52 rounded-2xl bg-gray-200 dark:bg-surface" />
        <div className="h-8 rounded-lg bg-gray-200 dark:bg-surface" />
        <div className="h-24 rounded-xl bg-gray-200 dark:bg-surface" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-full bg-gray-100 px-5 pt-12 text-center text-sm text-rose-400 dark:bg-[#111]">
        {(error as Error).message ?? "Не удалось загрузить упражнение"}
      </main>
    );
  }

  const title = data.name_ru.trim() || data.name;
  const primaryList = [data.muscle_group];
  const secondaryList = data.secondary_muscles ?? [];
  const stepsSource =
    data.technique_steps_ru != null && data.technique_steps_ru.length > 0
      ? data.technique_steps_ru
      : data.technique_steps;
  const steps = normalizeTechniqueSteps(stepsSource);
  const imageUrl = getMediaUrl(data.image_url);

  return (
    <>
      <div className="min-h-full bg-gray-100 pb-36 dark:bg-[#111]">
        <header className="relative min-h-[240px] bg-gray-100/90 dark:bg-[#1a1a1a]/90">
          {imageUrl ? (
            <div
              aria-hidden
              className="absolute inset-0 bg-cover bg-center opacity-[0.22] blur-sm"
              style={{ backgroundImage: `url(${imageUrl})` }}
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
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
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
            <p className="text-sm leading-relaxed text-gray-500 dark:text-muted">{data.description}</p>
          ) : null}

          <div className="grid grid-cols-3 gap-2.5">
            <StatBox value={STATS_PLACEHOLDER.totalSets} label="подходов" />
            <StatBox value={STATS_PLACEHOLDER.workouts} label="тренировок" />
            <StatBox value={STATS_PLACEHOLDER.tonnageKg} label="кг поднято" />
          </div>

          <Divider />

          <section>
            <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.55px] text-gray-500 dark:text-muted">
              Личный рекорд
            </h2>
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-[#232323] dark:bg-[#1a1a1a] dark:shadow-none">
              <div>
                <p className="text-xs text-gray-500 dark:text-muted">Лучший результат</p>
                <p className="mt-1 text-[22px] font-bold leading-tight text-gray-900 dark:text-white">
                  {PR_PLACEHOLDER.display}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-muted">{PR_PLACEHOLDER.dateLabel}</p>
              </div>
              <span className="inline-flex shrink-0 self-start rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 sm:self-center">
                PR
              </span>
            </div>
          </section>

          <Divider />

          <section>
            <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.55px] text-gray-500 dark:text-muted">
              Мышцы
            </h2>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border-[1.5px] border-accent/50 bg-accent/10 px-3 py-1.5 text-[13px] font-medium text-accent">
                {data.muscle_group} (осн.)
              </span>
              {secondaryList.map((m) => (
                <span
                  key={m}
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[13px] text-gray-600 shadow-sm dark:border-[#232323] dark:bg-[#1a1a1a] dark:text-muted dark:shadow-none"
                >
                  {m}
                </span>
              ))}
            </div>
          </section>

          <Divider />

          <section>
            <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.55px] text-gray-500 dark:text-muted">
              Техника выполнения
            </h2>
            <ExerciseTechniqueImages
              imageUrl={data.image_url}
              imageUrl2={data.image_url_2}
              alt={title}
            />
            <ol className="space-y-3">
              {steps.length === 0 ? (
                <li className="text-sm text-gray-500 dark:text-muted">
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
                    <p className="pt-0.5 text-[14px] leading-relaxed text-gray-800/90 dark:text-white/85">
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
        <div className="pointer-events-auto border-t border-gray-200 bg-white/95 px-5 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-[#232323] dark:bg-[#1a1a1a]/95 dark:shadow-none">
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
  return <div className="my-5 h-px bg-gray-200 dark:bg-border" role="presentation" />;
}

interface ExerciseTechniqueImagesProps {
  imageUrl: string | null;
  imageUrl2: string | null;
  alt: string;
}

const TECHNIQUE_IMAGE_FRAME_CLASS =
  "relative mb-4 h-[200px] w-full overflow-hidden rounded-xl bg-[#252525] md:mx-auto md:h-[280px] md:max-w-sm";

function ExerciseTechniqueImages({
  imageUrl,
  imageUrl2,
  alt,
}: ExerciseTechniqueImagesProps) {
  const media1 = getMediaUrl(imageUrl);
  const media2 = getMediaUrl(imageUrl2);

  if (!media1 && !media2) {
    return null;
  }

  if (media1 && media2) {
    return (
      <div
        className={`exercise-technique-images ${TECHNIQUE_IMAGE_FRAME_CLASS}`}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- внешние URL из MinIO */}
        <img
          src={media1}
          alt=""
          className="exercise-technique-image exercise-technique-image--first"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- внешние URL из MinIO */}
        <img
          src={media2}
          alt=""
          className="exercise-technique-image exercise-technique-image--second"
        />
      </div>
    );
  }

  const singleUrl = media1 ?? media2;
  if (!singleUrl) {
    return null;
  }

  return (
    <div className={TECHNIQUE_IMAGE_FRAME_CLASS}>
      {/* eslint-disable-next-line @next/next/no-img-element -- внешние URL из MinIO */}
      <img
        src={singleUrl}
        alt={alt}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-2 py-3 text-center shadow-sm dark:border-[#232323] dark:bg-[#1a1a1a] dark:shadow-none">
      <div className="mb-1 text-lg font-bold text-accent">{value}</div>
      <div className="text-[11px] text-gray-500 dark:text-muted">{label}</div>
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
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-xl dark:border-[#232323] dark:bg-[#1a1a1a]">
        <h2
          id="workout-modal-title"
          className="text-lg font-semibold text-gray-900 dark:text-white"
        >
          Тренировка
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-muted">
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
