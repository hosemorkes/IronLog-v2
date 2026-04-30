"use client";

import { formatDuration } from "@/lib/formatDuration";

const RING_CIRCUMFERENCE = 163;

interface RestTimerProps {
  /** Целевое время отдыха (сек), для кольца. */
  goalSeconds: number;
  /** Оставшиеся секунды. */
  remainingSeconds: number;
  /** Пропустить без ожидания. */
  onSkip: () => void;
}

/**
 * Блок отдыха: крупный счётчик, процент заполнения кольца и кнопка «Пропустить».
 */
export function RestTimer({
  goalSeconds,
  remainingSeconds,
  onSkip,
}: RestTimerProps) {
  const goal = Math.max(goalSeconds, 1);
  const pct = remainingSeconds > 0 ? remainingSeconds / goal : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - pct);

  return (
    <section
      className="flex items-center justify-between rounded-2xl border border-accent/35 bg-accent/10 px-[18px] py-4"
      aria-live="polite"
    >
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
          Отдых
        </p>
        <p className="text-[34px] font-extrabold leading-none tracking-tight text-accent">
          {formatDuration(remainingSeconds)}
        </p>
        <p className="mt-0.5 text-xs text-accent/70">Цель: {goal}с</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="relative h-[58px] w-[58px] shrink-0">
          <svg
            className="h-[58px] w-[58px] -rotate-90"
            viewBox="0 0 60 60"
            aria-hidden
          >
            <circle cx="30" cy="30" r="26" fill="none" strokeWidth={4} className="stroke-white/15" />
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              strokeWidth={4}
              strokeLinecap="round"
              className="stroke-accent transition-[stroke-dashoffset] duration-500"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-accent">
            {Math.round(pct * 100)}%
          </span>
        </div>
        <button
          type="button"
          className="rounded-full bg-accent/20 px-2.5 py-1 text-[11px] font-semibold text-accent transition hover:bg-accent/30"
          onClick={onSkip}
        >
          Пропустить
        </button>
      </div>
    </section>
  );
}
