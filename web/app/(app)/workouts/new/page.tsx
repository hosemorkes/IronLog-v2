"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ExercisePickerModal } from "@/components/workouts/ExercisePickerModal";
import type { ExerciseListItem } from "@/lib/hooks/useWorkouts";
import {
  useCreateWorkoutPlan,
  type CreateWorkoutPlanPayload,
} from "@/lib/hooks/useWorkouts";

/** Одна строка таблицы сетов в конструкторе. */
interface BuilderSetRow {
  weightKg: number;
  reps: number;
}

interface BuilderExercise {
  exercise: ExerciseListItem;
  sets: BuilderSetRow[];
  restSeconds: number;
}

const DEFAULT_REST = 90;

function exerciseTitle(ex: ExerciseListItem): string {
  return ex.name_ru.trim() || ex.name;
}

/**
 * Сохраняем в API: для каждого упражнения одна запись (уникальный exercise_id в плане).
 * Число строк таблицы → sets; вес и повторы берём из первого сета (ограничение бэкенда).
 */
function buildCreatePayload(
  name: string,
  rows: BuilderExercise[],
): CreateWorkoutPlanPayload {
  return {
    name: name.trim(),
    exercises: rows.map((row, idx) => {
      const first = row.sets[0] ?? { weightKg: 0, reps: 8 };
      return {
        exercise_id: row.exercise.id,
        order: idx,
        sets: Math.max(1, row.sets.length),
        reps: Math.max(1, Math.round(first.reps)),
        weight_kg: first.weightKg > 0 ? first.weightKg : null,
        rest_seconds: row.restSeconds,
      };
    }),
  };
}

/**
 * Конструктор нового плана тренировки (клиентская страница).
 */
export default function WorkoutNewPage() {
  const router = useRouter();
  const createPlan = useCreateWorkoutPlan();
  const [name, setName] = useState("Новая тренировка");
  const [items, setItems] = useState<BuilderExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const excludedIds = useMemo(
    () => new Set(items.map((i) => i.exercise.id)),
    [items],
  );

  const totals = useMemo(() => {
    const exCount = items.length;
    const setCount = items.reduce((acc, it) => acc + it.sets.length, 0);
    const estTonnage = items.reduce(
      (acc, it) =>
        acc + it.sets.reduce((b, s) => b + (s.weightKg || 0) * (s.reps || 0), 0),
      0,
    );
    const estMin = Math.round(setCount * 2.5);
    return { exCount, setCount, estTonnage, estMin };
  }, [items]);

  function addExercise(ex: ExerciseListItem) {
    if (excludedIds.has(ex.id)) {
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        exercise: ex,
        sets: [{ weightKg: 0, reps: 8 }],
        restSeconds: DEFAULT_REST,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addSet(itemIdx: number) {
    setItems((prev) => {
      const copy = [...prev];
      const row = copy[itemIdx];
      if (!row) {
        return prev;
      }
      const last = row.sets[row.sets.length - 1] ?? { weightKg: 0, reps: 8 };
      copy[itemIdx] = {
        ...row,
        sets: [...row.sets, { ...last }],
      };
      return copy;
    });
  }

  function removeSet(itemIdx: number, setIdx: number) {
    setItems((prev) => {
      const copy = [...prev];
      const row = copy[itemIdx];
      if (!row || row.sets.length <= 1) {
        return prev;
      }
      copy[itemIdx] = {
        ...row,
        sets: row.sets.filter((_, j) => j !== setIdx),
      };
      return copy;
    });
  }

  function updateSet(
    itemIdx: number,
    setIdx: number,
    field: keyof BuilderSetRow,
    raw: string,
  ) {
    const num = Number.parseFloat(raw);
    const val = Number.isFinite(num) ? num : 0;
    setItems((prev) => {
      const copy = [...prev];
      const row = copy[itemIdx];
      if (!row) {
        return prev;
      }
      const sets = row.sets.map((s, j) =>
        j === setIdx ? { ...s, [field]: val } : s,
      );
      copy[itemIdx] = { ...row, sets };
      return copy;
    });
  }

  function setRest(itemIdx: number, seconds: number) {
    setItems((prev) => {
      const copy = [...prev];
      const row = copy[itemIdx];
      if (!row) {
        return prev;
      }
      copy[itemIdx] = { ...row, restSeconds: seconds };
      return copy;
    });
  }

  async function handleSave() {
    setFormError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError("Введите название плана.");
      return;
    }
    if (items.length === 0) {
      setFormError("Добавьте хотя бы одно упражнение.");
      return;
    }
    try {
      await createPlan.mutateAsync(buildCreatePayload(trimmed, items));
      router.push("/workouts");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Не удалось сохранить план.");
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-dark">
      <header className="flex shrink-0 items-center justify-between border-b border-[#232323] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <Link
            href="/workouts"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-[#252525] hover:text-white"
            aria-label="Назад к списку"
          >
            <svg width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M11 5 6 9l5 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <span className="text-[17px] font-bold text-white">Конструктор</span>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={createPlan.isPending}
          className="rounded-full bg-accent px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {createPlan.isPending ? "Сохранение…" : "Сохранить"}
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-28">
        <div className="px-5 pt-3.5">
          <label className="sr-only" htmlFor="plan-name">
            Название плана
          </label>
          <input
            id="plan-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-transparent bg-[#1a1a1a] px-3.5 py-3 text-lg font-semibold text-white caret-accent outline-none ring-1 ring-[#232323] focus:ring-accent/50"
            placeholder="Название тренировки"
          />
        </div>

        {formError ? (
          <p className="mx-5 mt-3 rounded-xl border border-rose-500/35 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
            {formError}
          </p>
        ) : null}

        <div className="flex items-center justify-between px-5 pb-1 pt-5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.55px] text-muted">
            Упражнения
          </span>
          <span className="text-xs text-muted">
            {totals.exCount} упр · {totals.setCount}{" "}
            {totals.setCount === 1 ? "раунд" : totals.setCount < 5 ? "раунда" : "раундов"}
          </span>
        </div>

        <ul className="space-y-1 px-4">
          {items.map((item, itemIdx) => (
            <li key={item.exercise.id}>
              <div className="overflow-hidden rounded-2xl border border-[#232323] bg-[#1a1a1a]">
                <div className="flex items-center gap-2.5 px-3.5 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#252525]">
                    {item.exercise.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.exercise.image_url}
                        alt=""
                        className="h-full w-full rounded-[10px] object-cover"
                      />
                    ) : (
                      <span className="text-xs text-muted">◎</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-white">
                      {exerciseTitle(item.exercise)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {item.exercise.muscle_group} · {item.exercise.equipment}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(itemIdx)}
                    className="shrink-0 p-2 text-muted hover:text-white"
                    aria-label="Удалить упражнение"
                  >
                    <CloseIcon />
                  </button>
                </div>

                <SetsTableHeader />
                {item.sets.map((setRow, setIdx) => (
                  <div
                    key={`${item.exercise.id}-set-${String(setIdx)}`}
                    className={`grid grid-cols-[28px_1fr_1fr_32px] items-center gap-1.5 px-3.5 py-1 ${
                      setIdx % 2 === 0 ? "bg-[#141414]/90" : ""
                    }`}
                  >
                    <span className="text-center text-[13px] font-semibold text-muted">
                      {setIdx + 1}
                    </span>
                    <input
                      aria-label={`Вес кг, сет ${String(setIdx + 1)}`}
                      value={setRow.weightKg === 0 ? "" : String(setRow.weightKg)}
                      onChange={(e) =>
                        updateSet(itemIdx, setIdx, "weightKg", e.target.value)
                      }
                      inputMode="decimal"
                      className="rounded-lg border-0 bg-[#252525] px-1 py-1.5 text-center text-sm font-semibold text-white outline-none"
                    />
                    <input
                      aria-label={`Повторы, сет ${String(setIdx + 1)}`}
                      value={setRow.reps === 0 ? "" : String(setRow.reps)}
                      onChange={(e) =>
                        updateSet(itemIdx, setIdx, "reps", e.target.value)
                      }
                      inputMode="numeric"
                      className="rounded-lg border-0 bg-[#252525] px-1 py-1.5 text-center text-sm font-semibold text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeSet(itemIdx, setIdx)}
                      className="flex items-center justify-center opacity-50 hover:opacity-100"
                      aria-label="Удалить сет"
                    >
                      <CloseIconSmall />
                    </button>
                  </div>
                ))}
                <div className="px-3.5 pb-2 pt-1">
                  <button
                    type="button"
                    onClick={() => addSet(itemIdx)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[#232323] py-2 text-xs font-medium text-muted hover:border-accent/40 hover:text-white"
                  >
                    <PlusTiny />
                    Добавить сет
                  </button>
                </div>

                <RestRow
                  value={item.restSeconds}
                  onChange={(r) => setRest(itemIdx, r)}
                  label="Отдых между сетами"
                />
              </div>
            </li>
          ))}
        </ul>

        <div className="px-4 pt-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#232323] py-3.5 text-[15px] font-semibold text-muted hover:border-accent/40 hover:text-white"
          >
            <PlusIcon />
            Добавить упражнение
          </button>
        </div>

        <div className="px-5 pb-2 pt-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.55px] text-muted">
            Итого
          </h3>
        </div>
        <div className="mx-4 mb-6 flex justify-around rounded-xl border border-[#232323] bg-[#1a1a1a] px-3 py-3">
          {[
            { v: totals.exCount, l: "упражнения" },
            { v: totals.setCount, l: "раундов" },
            { v: `~${totals.estMin}`, l: "мин" },
            {
              v:
                totals.estTonnage >= 100
                  ? `~${Math.round(totals.estTonnage / 100) * 100}`
                  : `~${Math.round(totals.estTonnage)}`,
              l: "кг тонн.",
            },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <div className="text-base font-bold text-accent">{s.v}</div>
              <div className="mt-0.5 text-[11px] text-muted">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <ExercisePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        excludedExerciseIds={excludedIds}
        onPick={addExercise}
      />
    </div>
  );
}

function SetsTableHeader() {
  return (
    <div className="grid grid-cols-[28px_1fr_1fr_32px] gap-1.5 px-3.5 pb-1 pt-1">
      {["#", "Вес (кг)", "Повторы", ""].map((h, i) => (
        <span
          key={`h-${String(i)}`}
          className="text-center text-[11px] font-semibold text-muted"
        >
          {h}
        </span>
      ))}
    </div>
  );
}

interface RestRowProps {
  value: number;
  onChange: (seconds: number) => void;
  label: string;
}

function RestRow({ value, onChange, label }: RestRowProps) {
  const options = [60, 90, 120] as const;
  return (
    <div className="flex items-center justify-between px-3.5 pb-3.5 pt-2">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex gap-1.5">
        {options.map((r) => {
          const active = value === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => onChange(r)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                active
                  ? "bg-accent text-white"
                  : "bg-[#252525] text-muted hover:text-white"
              }`}
            >
              {r}с
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M9 2v14M2 9h14" strokeLinecap="round" />
    </svg>
  );
}

function PlusTiny() {
  return (
    <svg aria-hidden width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 1v10M1 6h10" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="m2 2 10 10M12 2 2 10" strokeLinecap="round" />
    </svg>
  );
}

function CloseIconSmall() {
  return (
    <svg aria-hidden width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="m2 2 10 10M12 2 2 10" strokeLinecap="round" />
    </svg>
  );
}
