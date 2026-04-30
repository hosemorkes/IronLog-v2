"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DIFFICULTY_LABELS,
  DIFFICULTY_TAILWIND,
  MUSCLE_FILTER_CHIPS,
} from "@/lib/exercise/constants";
import type { ExerciseListItem } from "@/lib/hooks/useExercises";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useExercises } from "@/lib/hooks/useExercises";

/** Debounce строки поиска (мс), как в требованиях. */
const SEARCH_DEBOUNCE_MS = 300;

function difficultyLabel(slug: string): string {
  return DIFFICULTY_LABELS[slug] ?? slug;
}

function difficultyClass(slug: string): string {
  return DIFFICULTY_TAILWIND[slug] ?? "text-muted";
}

interface ExerciseCardRowProps {
  exercise: ExerciseListItem;
  index: number;
  /** Смещение индекса для staggering при продолжении списка. */
  staggerBase: number;
}

function ExerciseCardRow({
  exercise,
  index,
  staggerBase,
}: ExerciseCardRowProps) {
  const staggerIndex = staggerBase + index;
  const title = exercise.name_ru.trim() || exercise.name;
  const category = exercise.muscle_group;
  const tagLimit = exercise.tags.slice(0, 4);

  return (
    <Link
      href={`/exercises/${exercise.id}`}
      className="exercise-card-animate mb-3 flex touch-manipulation items-center gap-3 rounded-2xl border border-border bg-surface p-3 pr-2 transition hover:border-accent/40"
      style={{
        animationDelay: `${Math.min(staggerIndex, 24) * 50}ms`,
      }}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-[#252525]">
        {exercise.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- внешние URL из API
          <img
            src={exercise.image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-full w-full items-center justify-center text-xl text-muted"
          >
            ◎
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-snug text-white">
          {title}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {tagLimit.map((t, ti) => (
            <span
              key={`${exercise.id}-tag-${String(ti)}`}
              className="rounded-md bg-black/35 px-1.5 py-0.5 text-[11px] text-muscle-blue"
            >
              {t}
            </span>
          ))}
        </div>
        <p className="mt-1.5 truncate text-[12px] text-muted">
          <span className="font-medium text-accent">{category}</span>
          <span className="mx-1.5">·</span>
          <span>{exercise.equipment}</span>
          <span className="mx-1.5">·</span>
          <span className={difficultyClass(exercise.difficulty)}>
            {difficultyLabel(exercise.difficulty)}
          </span>
        </p>
      </div>
      <span aria-hidden className="shrink-0 text-muted">
        <ChevronRightIcon />
      </span>
    </Link>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M6 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ExercisesLibraryPage() {
  const [searchDraft, setSearchDraft] = useState("");
  const debouncedSearch = useDebouncedValue(searchDraft, SEARCH_DEBOUNCE_MS);
  const [chipId, setChipId] = useState<(typeof MUSCLE_FILTER_CHIPS)[number]["id"]>(
    "all",
  );

  const muscleGroup = useMemo(() => {
    const chip = MUSCLE_FILTER_CHIPS.find((c) => c.id === chipId);
    return chip?.apiValue ?? null;
  }, [chipId]);

  const filters = useMemo(
    () => ({
      muscleGroup,
      search: debouncedSearch,
    }),
    [muscleGroup, debouncedSearch],
  );

  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, status } =
    useExercises(filters);

  const flat = data?.pages.flatMap((p) => p) ?? [];
  const popular = flat.slice(0, 3);
  const scrollList = flat.slice(3);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const onIntersect = useCallback(
    (entry: IntersectionObserverEntry) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver(([e]) => onIntersect(e), {
      rootMargin: "160px",
      threshold: 0,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [onIntersect]);

  const isLoading = status === "pending";

  return (
    <div className="flex flex-1 flex-col overflow-hidden pb-4">
      <header className="shrink-0 bg-bg-dark px-5 pb-3 pt-3">
        <h1 className="text-[22px] font-extrabold tracking-tight text-white">
          Упражнения <span className="text-accent">·</span>
        </h1>
        <label className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
          <SearchIcon />
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Поиск упражнений..."
            className="flex-1 border-0 bg-transparent text-sm text-white outline-none placeholder:text-muted"
            type="search"
            autoCapitalize="off"
          />
        </label>
      </header>

      <div className="no-scrollbar shrink-0 bg-bg-dark pb-3 pl-5">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5 no-scrollbar">
          {MUSCLE_FILTER_CHIPS.map((c) => {
            const selected = chipId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setChipId(c.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selected
                    ? "bg-accent text-white"
                    : "bg-surface text-muted hover:text-white"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto px-5">
        {isLoading ? (
          <ul className="space-y-3 py-4" aria-busy aria-label="Загрузка">
            {[0, 1, 2, 3, 4].map((s) => (
              <li
                key={`sk-${String(s)}`}
                className="h-[88px] animate-pulse rounded-2xl border border-border bg-surface"
              />
            ))}
          </ul>
        ) : error ? (
          <p className="py-16 text-center text-sm text-rose-400">
            {(error as Error).message}
          </p>
        ) : (
          <>
            <section aria-labelledby="popular-heading" className="pb-2 pt-2">
              <div className="mb-3 flex flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h2
                    id="popular-heading"
                    className="text-[11px] font-semibold uppercase tracking-[0.55px] text-muted"
                  >
                    Популярные
                  </h2>
                </div>
                <p className="text-[10px] leading-snug text-muted/90">
                  TODO: топ по частоте использования после появления метрик API;
                  сейчас — первые три записи загрузки.
                </p>
              </div>
              {popular.length === 0 ? (
                <p className="text-sm text-muted">Ничего по текущим фильтрам.</p>
              ) : (
                <div className="-mx-5 flex gap-3 overflow-x-auto pb-2 pl-5 pr-5 no-scrollbar">
                  {popular.map((ex, i) => (
                    <PopularCard key={ex.id} exercise={ex} index={i} />
                  ))}
                </div>
              )}
            </section>

            <section
              aria-labelledby="all-heading"
              className="border-t border-border pt-4"
            >
              <h2
                id="all-heading"
                className="mb-3 text-[11px] font-semibold uppercase tracking-[0.55px] text-muted"
              >
                Все упражнения
              </h2>
              {scrollList.length === 0 && flat.length > 0 && flat.length <= 3 ? (
                <p className="mb-4 text-sm text-muted">
                  Весь список показан в блоке «Популярные» выше.
                </p>
              ) : null}
              <div className="pb-2">
                {scrollList.map((ex, idx) => (
                  <ExerciseCardRow
                    key={ex.id}
                    exercise={ex}
                    index={idx}
                    staggerBase={3}
                  />
                ))}
              </div>
              <div ref={loadMoreRef} className="h-6 w-full shrink-0" />
              {isFetchingNextPage ? (
                <p className="pb-4 text-center text-xs text-muted">Загрузка…</p>
              ) : null}
              {!hasNextPage && scrollList.length > 0 ? (
                <p className="pb-24 text-center text-xs text-muted">Конец списка</p>
              ) : null}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

interface PopularProps {
  exercise: ExerciseListItem;
  index: number;
}

function PopularCard({ exercise, index }: PopularProps) {
  const title = exercise.name_ru.trim() || exercise.name;
  return (
    <Link
      href={`/exercises/${exercise.id}`}
      className="exercise-card-animate shrink-0"
      style={{ animationDelay: `${index * 50}ms`, width: "min(100%,260px)" }}
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="aspect-[16/11] bg-[#252525]">
          {exercise.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- внешние URL
            <img
              src={exercise.image_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-3xl text-muted">
              ◎
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="line-clamp-2 text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-[11px] text-accent">{exercise.muscle_group}</p>
        </div>
      </div>
    </Link>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 text-muted"
    >
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth={2} />
      <path
        d="M11 11l4 4"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}
