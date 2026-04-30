/**
 * Чипы фильтра группы мышц (совпадают с макетом и PRODUCT_NOTES: каталог упражнений).
 * Значение `apiValue = null` — без фильтра (Все).
 * Для «Кардио» в данных может использоваться «Кардио» или «Разминка/Кардио» — см. сиды.
 */
export const MUSCLE_FILTER_CHIPS: ReadonlyArray<{
  id: string;
  label: string;
  apiValue: string | null;
}> = [
  { id: "all", label: "Все", apiValue: null },
  { id: "chest", label: "Грудь", apiValue: "Грудь" },
  { id: "back", label: "Спина", apiValue: "Спина" },
  { id: "legs", label: "Ноги", apiValue: "Ноги" },
  { id: "shoulders", label: "Плечи", apiValue: "Плечи" },
  { id: "arms", label: "Руки", apiValue: "Руки" },
  { id: "core", label: "Пресс", apiValue: "Пресс" },
  { id: "cardio", label: "Кардио", apiValue: "Кардио" },
];

/** Отображение сложности API (англ.) в короткий заголовок RU как в прототипе. */
export const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "Начальный",
  intermediate: "Средний",
  advanced: "Сложный",
};

/** Цвет строки сложности (по мотивам ironlog-dark). */
export const DIFFICULTY_TAILWIND: Record<string, string> = {
  beginner: "text-emerald-400",
  intermediate: "text-amber-400",
  advanced: "text-rose-400",
};
