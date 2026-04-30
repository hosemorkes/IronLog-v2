/**
 * Шкала «тоннаж → объект» (CLAUDE.md / PRODUCT_NOTES).
 * Пороги в кг: достигнув значения, показываем соответствующий объект.
 */

export interface TonnageLevelRow {
  /** Минимальный накопленный тоннаж (кг) для уровня. */
  minKg: number;
  /** Человекочитаемый объект. */
  objectLabel: string;
}

export const TONNAGE_LEVELS: readonly TonnageLevelRow[] = [
  { minKg: 200, objectLabel: "Бурый медведь" },
  { minKg: 500, objectLabel: "Лошадь" },
  { minKg: 1_000, objectLabel: "Lada Granta" },
  { minKg: 3_000, objectLabel: "Белый медведь ×10" },
  { minKg: 5_000, objectLabel: "Африканский слон" },
  { minKg: 10_000, objectLabel: "ГАЗель" },
  { minKg: 20_000, objectLabel: "Танк Т-72" },
  { minKg: 50_000, objectLabel: "Синий кит" },
  { minKg: 100_000, objectLabel: "Локомотив ЧС7" },
  { minKg: 400_000, objectLabel: "Боинг 747" },
  { minKg: 1_000_000, objectLabel: "Паром" },
  { minKg: 5_000_000, objectLabel: "МКС" },
] as const;

export interface TonnageScaleState {
  /** Текущий объект по шкале (последний достигнутый порог). */
  currentObjectLabel: string;
  /** Кг до следующего порога; null если это последний уровень. */
  remainingKgToNext: number | null;
  /** Прогресс от текущего порога к следующему, 0–1 (или до первого порога). */
  segmentProgress: number;
  /** Нижняя граница текущего сегмента (кг). */
  segmentLowKg: number;
  /** Верхняя граница сегмента (кг); null если выше последнего порога. */
  segmentHighKg: number | null;
  /** Индекс текущего уровня в TONNAGE_LEVELS (-1 до первого рубежа). */
  currentLevelIndex: number;
}

/**
 * Вычислить положение на шкале для суммарного тоннажа (кг).
 */
export function getTonnageScaleState(totalKg: number): TonnageScaleState {
  const t = Math.max(0, totalKg);
  let idx = -1;
  for (let i = 0; i < TONNAGE_LEVELS.length; i += 1) {
    if (t >= TONNAGE_LEVELS[i].minKg) {
      idx = i;
    }
  }

  if (idx < 0) {
    const firstMin = TONNAGE_LEVELS[0].minKg;
    const segmentProgress =
      firstMin <= 0 ? 1 : Math.min(1, t / firstMin);
    return {
      currentObjectLabel: "Старт",
      remainingKgToNext: Math.max(0, firstMin - t),
      segmentProgress,
      segmentLowKg: 0,
      segmentHighKg: firstMin,
      currentLevelIndex: -1,
    };
  }

  const current = TONNAGE_LEVELS[idx];
  const next = TONNAGE_LEVELS[idx + 1];
  if (!next) {
    return {
      currentObjectLabel: current.objectLabel,
      remainingKgToNext: null,
      segmentProgress: 1,
      segmentLowKg: current.minKg,
      segmentHighKg: null,
      currentLevelIndex: idx,
    };
  }

  const span = next.minKg - current.minKg;
  const into = t - current.minKg;
  const segmentProgress =
    span <= 0 ? 1 : Math.min(1, Math.max(0, into / span));

  return {
    currentObjectLabel: current.objectLabel,
    remainingKgToNext: Math.max(0, next.minKg - t),
    segmentProgress,
    segmentLowKg: current.minKg,
    segmentHighKg: next.minKg,
    currentLevelIndex: idx,
  };
}
