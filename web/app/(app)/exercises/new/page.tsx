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
  "rounded-2xl border border-[#232323] bg-[#1a1a1a] p-4 sm:p-5";

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

  return (
    <div className="flex min-h-full flex-1 flex-col bg-bg-dark pb-28 pt-4">
      <header className="flex shrink-0 flex-wrap items-center gap-3 px-5 pb-4">
        <Link
          href="/exercises"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-muted transition hover:text-white"
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
        <h1 className="text-[22px] font-extrabold tracking-tight text-white">
          Новое упражнение
        </h1>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-5">
        <section className={cardClass}>
          <label className="block text-[13px] font-semibold text-white">
            Название
            <span className="text-rose-400"> *</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Сгибания на бицепс стоя"
            className="mt-2 w-full rounded-xl border border-[#232323] bg-[#232323]/60 px-3.5 py-3 text-[15px] text-white caret-accent outline-none ring-1 ring-transparent transition placeholder:text-muted focus:border-accent/40 focus:ring-accent/35"
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
          <label className="block text-[13px] font-semibold text-white">
            Описание <span className="font-normal text-muted">(необязательно)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Техника, заметки..."
            className="mt-2 w-full resize-y rounded-xl border border-[#232323] bg-[#232323]/60 px-3.5 py-3 text-[15px] leading-relaxed text-white caret-accent outline-none ring-1 ring-transparent transition placeholder:text-muted focus:border-accent/40 focus:ring-accent/35"
          />
        </section>

        {createMut.isError ? (
          <p className="text-center text-sm text-rose-400">
            {(createMut.error as Error).message}
          </p>
        ) : null}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-[1] border-t border-[#232323] bg-bg-dark/95 px-5 pb-[max(env(safe-area-inset-bottom,0px),1rem)] pt-3 backdrop-blur-sm">
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
      <h2 className="text-[13px] font-semibold text-white">
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
                  : "bg-[#232323] text-muted hover:text-white"
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
