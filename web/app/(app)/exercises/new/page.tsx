"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  CUSTOM_EXERCISE_DIFFICULTY_CHIPS,
  CUSTOM_EXERCISE_EQUIPMENT_CHIPS,
  CUSTOM_EXERCISE_MUSCLE_CHIPS,
} from "@/lib/exercise/constants";
import { useCreateCustomExercise } from "@/lib/hooks/useExercises";

const cardClass =
  "rounded-2xl border border-gray-200 bg-gray-100 p-4 sm:p-5 dark:border-[#232323] dark:bg-[#1a1a1a]";

export default function NewCustomExercisePage() {
  const router = useRouter();
  const createMut = useCreateCustomExercise();

  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<
    "beginner" | "intermediate" | "advanced" | null
  >(null);
  const [description, setDescription] = useState("");

  const canSubmit =
    name.trim().length > 0 &&
    muscleGroup !== null &&
    equipment !== null &&
    difficulty !== null;

  const submit = (): void => {
    if (
      muscleGroup === null ||
      equipment === null ||
      difficulty === null ||
      createMut.isPending
    ) {
      return;
    }
    createMut.mutate(
      {
        name,
        muscle_group: muscleGroup,
        equipment,
        difficulty,
        description: description.trim() || null,
      },
      {
        onSuccess: () => {
          router.push("/exercises");
        },
      },
    );
  };

  const fieldInputClass =
    "mt-2 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[15px] text-gray-900 caret-accent outline-none ring-1 ring-transparent transition placeholder:text-gray-400 focus:border-accent/40 focus:ring-accent/35 dark:border-[#232323] dark:bg-[#232323]/60 dark:text-white dark:placeholder:text-[#888]";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-light pb-28 pt-4 dark:bg-bg-dark">
      <header className="flex shrink-0 flex-wrap items-center gap-3 px-5 pb-4">
        <Link
          href="/exercises"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:text-gray-900 dark:bg-[#1a1a1a] dark:text-[#888] dark:hover:text-white"
          aria-label="Назад к каталогу"
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <h1 className="text-[22px] font-extrabold tracking-tight text-gray-900 dark:text-white">
          Новое упражнение
        </h1>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-5">
        <section className={cardClass}>
          <label className="block text-[13px] font-semibold text-gray-900 dark:text-white">
            Название
            <span className="text-rose-400"> *</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Сгибания на бицепс стоя"
            className={fieldInputClass}
          />
        </section>

        <ChipSection
          title="Группа мышц"
          required
          options={CUSTOM_EXERCISE_MUSCLE_CHIPS.map((c) => ({
            label: c.label,
            value: c.apiValue,
          }))}
          selected={muscleGroup}
          onSelect={setMuscleGroup}
        />

        <ChipSection
          title="Оборудование"
          required
          options={CUSTOM_EXERCISE_EQUIPMENT_CHIPS.map((c) => ({
            label: c.label,
            value: c.apiValue,
          }))}
          selected={equipment}
          onSelect={setEquipment}
        />

        <ChipSection
          title="Сложность"
          required
          options={CUSTOM_EXERCISE_DIFFICULTY_CHIPS.map((c) => ({
            label: c.label,
            value: c.apiValue,
          }))}
          selected={difficulty}
          onSelect={setDifficulty}
        />

        <section className={cardClass}>
          <label className="block text-[13px] font-semibold text-gray-900 dark:text-white">
            Описание{" "}
            <span className="font-normal text-gray-500 dark:text-muted">(необязательно)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Техника, заметки..."
            className={`${fieldInputClass} resize-y leading-relaxed`}
          />
        </section>

        {createMut.isError ? (
          <p className="text-center text-sm text-rose-400">
            {(createMut.error as Error).message}
          </p>
        ) : null}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-[1] border-t border-gray-200 bg-bg-light/95 px-5 pb-[max(env(safe-area-inset-bottom,0px),1rem)] pt-3 backdrop-blur-sm dark:border-[#232323] dark:bg-bg-dark/95">
        <button
          type="button"
          disabled={!canSubmit || createMut.isPending}
          onClick={() => submit()}
          className="w-full rounded-2xl bg-accent py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-accent/15 transition hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-45"
        >
          {createMut.isPending ? "Создание…" : "Создать упражнение"}
        </button>
      </footer>
    </div>
  );
}

function ChipSection<T extends string>({
  title,
  required,
  options,
  selected,
  onSelect,
}: {
  title: string;
  required?: boolean;
  options: ReadonlyArray<{ label: string; value: T }>;
  selected: T | null;
  onSelect: (v: T) => void;
}) {
  return (
    <section className={cardClass}>
      <h2 className="text-[13px] font-semibold text-gray-900 dark:text-white">
        {title}
        {required ? <span className="text-rose-400"> *</span> : null}
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((opt) => {
          const sel = selected === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => {
                onSelect(opt.value);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                sel
                  ? "bg-accent text-white"
                  : "bg-gray-200 text-gray-600 hover:text-gray-900 dark:bg-[#232323] dark:text-[#888] dark:hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
