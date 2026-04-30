"use client";

import type { RecentPrItemDto } from "@/lib/types/dashboard";

const nf = new Intl.NumberFormat("ru-RU");
const df = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
});

interface PRWidgetProps {
  items: RecentPrItemDto[];
}

/**
 * Топ последних личных рекордов (подходы с флагом PR).
 */
export function PRWidget({ items }: PRWidgetProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface px-4 py-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
        Личные рекорды
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          Рекорды появятся, когда вы побите прошлый объём по упражнению в
          тренировке.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.slice(0, 3).map((pr) => (
            <li
              key={`${pr.exercise_id}-${pr.achieved_at}-${pr.set_num}`}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-bg-dark/50 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {pr.exercise_name}
                </p>
                <p className="text-xs text-muted">
                  Подход {pr.set_num}:{" "}
                  {pr.weight_kg != null
                    ? `${nf.format(pr.weight_kg)} кг × ${pr.reps_done}`
                    : `${pr.reps_done} повт.`}
                </p>
                <p className="text-[11px] text-muted/90">
                  Объём {nf.format(Math.round(pr.volume_kg))} кг ·{" "}
                  {df.format(new Date(pr.achieved_at))}
                </p>
              </div>
              <span className="flex-shrink-0 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                PR
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
