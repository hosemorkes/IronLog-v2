"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MUSCLE_FILTER_CHIPS } from "@/lib/exercise/constants";
import type { ExerciseListItem } from "@/lib/hooks/useWorkouts";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useExercises } from "@/lib/hooks/useWorkouts";

const SEARCH_DEBOUNCE_MS = 300;

interface ExercisePickerModalProps {
  open: boolean;
  onClose: () => void;
  /** Уже добавленные id — в списке можно скрыть или пометить (API запрещает дубликаты в плане). */
  excludedExerciseIds: ReadonlySet<string>;
  onPick: (exercise: ExerciseListItem) => void;
}

/**
 * Модальное окно выбора упражнения из каталога с поиском и чипами групп мышц.
 */
export function ExercisePickerModal({
  open,
  onClose,
  excludedExerciseIds,
  onPick,
}: ExercisePickerModalProps) {
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
    if (!node || !open) {
      return;
    }
    const observer = new IntersectionObserver(([e]) => onIntersect(e), {
      rootMargin: "120px",
      threshold: 0,
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [onIntersect, open]);

  useEffect(() => {
    if (!open) {
      setSearchDraft("");
      setChipId("all");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const isLoading = status === "pending";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/65 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exercise-picker-title"
    >
      <div className="flex min-h-0 flex-1 flex-col bg-bg-dark pt-2">
        <div className="flex shrink-0 items-center justify-between border-b border-[#232323] px-5 py-3">
          <h2 id="exercise-picker-title" className="text-lg font-bold text-white">
            Добавить упражнение
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted hover:text-white"
          >
            Закрыть
          </button>
        </div>

        <div className="shrink-0 px-5 pb-2 pt-3">
          <label className="flex items-center gap-2 rounded-xl border border-[#232323] bg-[#252525] px-3 py-2.5">
            <svg
              aria-hidden
              width={16}
              height={16}
              viewBox="0 0 16 16"
              fill="none"
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
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Поиск упражнений..."
              className="flex-1 border-0 bg-transparent text-sm text-white outline-none placeholder:text-muted"
              type="search"
            />
          </label>
        </div>

        <div className="no-scrollbar shrink-0 pb-2 pl-5">
          <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 no-scrollbar">
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
                      : "bg-[#252525] text-muted hover:text-white"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
          {isLoading ? (
            <ul className="space-y-2 py-2" aria-busy aria-label="Загрузка">
              {[0, 1, 2, 3, 4].map((s) => (
                <li
                  key={`sk-${String(s)}`}
                  className="h-[72px] animate-pulse rounded-2xl border border-[#232323] bg-[#1a1a1a]"
                />
              ))}
            </ul>
          ) : error ? (
            <p className="py-12 text-center text-sm text-rose-400">
              {(error as Error).message}
            </p>
          ) : flat.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">Ничего не найдено</p>
          ) : (
            <ul className="space-y-2 py-2">
              {flat.map((ex) => {
                const excluded = excludedExerciseIds.has(ex.id);
                const title = ex.name_ru.trim() || ex.name;
                return (
                  <li key={ex.id}>
                    <button
                      type="button"
                      disabled={excluded}
                      onClick={() => {
                        onPick(ex);
                        onClose();
                      }}
                      className={`flex w-full touch-manipulation items-center gap-3 rounded-2xl border border-[#232323] bg-[#1a1a1a] p-3 text-left transition ${
                        excluded
                          ? "cursor-not-allowed opacity-40"
                          : "hover:border-accent/50 active:border-accent/70"
                      }`}
                    >
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[#232323] bg-[#252525]">
                        {ex.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- URL из API
                          <img
                            src={ex.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span
                            aria-hidden
                            className="flex h-full w-full items-center justify-center text-lg text-muted"
                          >
                            ◎
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-white">
                          {title}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] text-muted">
                          <span className="font-medium text-accent">{ex.muscle_group}</span>
                          <span className="mx-1">·</span>
                          <span>{ex.equipment}</span>
                        </p>
                      </div>
                      {excluded ? (
                        <span className="shrink-0 text-[11px] text-muted">В плане</span>
                      ) : (
                        <span aria-hidden className="shrink-0 text-accent">
                          +
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
              <div ref={loadMoreRef} className="h-4 w-full" />
              {isFetchingNextPage ? (
                <p className="py-2 text-center text-xs text-muted">Загрузка…</p>
              ) : null}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
