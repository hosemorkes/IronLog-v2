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
    <section className="rounded-2xl border border-border bg-surface px-4 py-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
        Поднято за всё время
      </h2>
      <p className="mt-1 text-3xl font-extrabold tracking-tight text-white">
        {nf.format(Math.round(totalLifetimeKg))}
        <span className="text-lg font-bold text-muted"> кг</span>
      </p>
      <div className="mt-3 rounded-xl border border-border bg-bg-dark/80 px-3 py-3">
        <p className="text-xs text-muted">По шкале объектов</p>
        <p className="text-lg font-bold text-accent">{scale.currentObjectLabel}</p>
        {scale.remainingKgToNext != null ? (
          <p className="mt-1 text-sm text-muted">
            До следующего:{" "}
            <span className="font-semibold text-white">
              {nf.format(Math.ceil(scale.remainingKgToNext))} кг
            </span>
          </p>
        ) : (
          <p className="mt-1 text-sm font-medium text-emerald-400">
            Вы на вершине шкалы — поздравляем!
          </p>
        )}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#2a2a2a]">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-muted">
          {scale.segmentHighKg != null
            ? `Между ${nf.format(scale.segmentLowKg)} и ${nf.format(scale.segmentHighKg)} кг`
            : `От ${nf.format(scale.segmentLowKg)} кг`}
        </p>
      </div>
      <div className="mt-4 max-h-40 overflow-y-auto no-scrollbar">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-surface text-muted">
            <tr>
              <th className="py-1 font-semibold">Кг (от)</th>
              <th className="py-1 font-semibold">Объект</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            {TONNAGE_LEVELS.map((row, i) => {
              const active = scale.currentLevelIndex === i;
              return (
                <tr
                  key={row.minKg}
                  className={
                    active
                      ? "bg-accent/15 text-white outline outline-1 outline-accent/40"
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
          <p className="mt-2 text-[10px] text-muted">
            Пока ниже первого порога ({nf.format(TONNAGE_LEVELS[0].minKg)} кг) — строка
            «Старт» активна в карточке выше.
          </p>
        )}
      </div>
    </section>
  );
}
