"use client";

import type { WeeklyDayTonnageDto } from "@/lib/types/dashboard";

interface WeeklyChartProps {
  days: WeeklyDayTonnageDto[];
}

const nf = new Intl.NumberFormat("ru-RU");

/**
 * Столбцы тоннажа по дням (как в прототипе — flex + высота от max).
 */
export function WeeklyChart({ days }: WeeklyChartProps) {
  const maxT = Math.max(...days.map((d) => d.tonnage_kg), 1);

  return (
    <section className="rounded-2xl border border-border bg-surface px-4 py-4">
      <h2 className="text-sm font-semibold text-white">Активность — 7 дней</h2>
      <p className="mt-1 text-xs text-muted">Тоннаж по дням (кг)</p>
      <div className="mt-4 flex h-[70px] items-end justify-between gap-1.5">
        {days.map((d) => {
          const h =
            maxT > 0 ? Math.round((d.tonnage_kg / maxT) * 64) : 0;
          const barH = Math.max(h || (d.tonnage_kg > 0 ? 4 : 3), 3);
          let barClass = "bg-[#2a2a2a]";
          if (d.is_today && d.tonnage_kg > 0) {
            barClass = "bg-emerald-500";
          } else if (d.tonnage_kg > 0) {
            barClass = "bg-accent";
          }
          let labelClass = "text-[#555]";
          if (d.is_today) {
            labelClass = "font-semibold text-emerald-400";
          } else if (d.tonnage_kg > 0) {
            labelClass = "font-semibold text-accent";
          }
          return (
            <div
              key={d.date}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <div
                className={`w-full rounded-t transition-all ${barClass}`}
                style={{ height: barH }}
                title={`${d.day_label}: ${nf.format(Math.round(d.tonnage_kg))} кг`}
              />
              <span className={`text-[10px] ${labelClass}`}>{d.day_label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
