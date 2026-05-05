"use client";

import { TONNAGE_LEVELS, getTonnageScaleState } from "@/lib/dashboard/tonnage-scale";

const nf = new Intl.NumberFormat("ru-RU");

interface TonnageWidgetProps {
  totalLifetimeKg: number;
}

/**
 * Карточка суммарного поднятого веса, объект шкалы, прогресс до порога, таблица уровней.
 */
export function TonnageWidget({ totalLifetimeKg }: TonnageWidgetProps) {
  const scale = getTonnageScaleState(totalLifetimeKg);
  const pct = Math.round(scale.segmentProgress * 100);

  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-100 px-4 py-4 dark:border-border dark:bg-surface">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#888]">
        Поднято за всё время
      </h2>
      <p className="mt-1 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
        {nf.format(Math.round(totalLifetimeKg))}
        <span className="text-lg font-bold text-gray-500 dark:text-[#888]"> кг</span>
      </p>
      <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 dark:border-border dark:bg-bg-dark/80">
        <p className="text-xs text-gray-500 dark:text-[#888]">По шкале объектов</p>
        <p className="text-lg font-bold text-accent">{scale.currentObjectLabel}</p>
        {scale.remainingKgToNext != null ? (
          <p className="mt-1 text-sm text-gray-500 dark:text-[#888]">
            До следующего:{" "}
            <span className="font-semibold text-gray-900 dark:text-white">
              {nf.format(Math.ceil(scale.remainingKgToNext))} кг
            </span>
          </p>
        ) : (
          <p className="mt-1 text-sm font-medium text-emerald-400">
            Вы на вершине шкалы — поздравляем!
          </p>
        )}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-[#2a2a2a]">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-gray-500 dark:text-[#888]">
          {scale.segmentHighKg != null
            ? `Между ${nf.format(scale.segmentLowKg)} и ${nf.format(scale.segmentHighKg)} кг`
            : `От ${nf.format(scale.segmentLowKg)} кг`}
        </p>
      </div>
      <div className="mt-4 max-h-40 overflow-y-auto no-scrollbar">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-gray-100 text-gray-500 dark:bg-surface dark:text-[#888]">
            <tr>
              <th className="py-1 font-semibold">Кг (от)</th>
              <th className="py-1 font-semibold">Объект</th>
            </tr>
          </thead>
          <tbody className="text-gray-500 dark:text-[#888]">
            {TONNAGE_LEVELS.map((row, i) => {
              const active = scale.currentLevelIndex === i;
              return (
                <tr
                  key={row.minKg}
                  className={
                    active
                      ? "bg-accent/15 text-gray-900 outline outline-1 outline-accent/40 dark:text-white"
                      : ""
                  }
                >
                  <td className="py-1 pr-2 font-mono text-[11px]">
                    {nf.format(row.minKg)}
                  </td>
                  <td className="py-1">{row.objectLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {scale.currentLevelIndex < 0 && (
          <p className="mt-2 text-[10px] text-gray-500 dark:text-[#888]">
            Пока ниже первого порога ({nf.format(TONNAGE_LEVELS[0].minKg)} кг) — строка
            «Старт» активна в карточке выше.
          </p>
        )}
      </div>
    </section>
  );
}
