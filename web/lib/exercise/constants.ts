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

/** Чипы формы создания упражнения (без «Все»); apiValue отправляются в POST. */
export const CUSTOM_EXERCISE_MUSCLE_CHIPS: ReadonlyArray<{
  label: string;
  apiValue: string;
}> = [
  { label: "Грудь", apiValue: "Грудь" },
  { label: "Спина", apiValue: "Спина" },
  { label: "Плечи", apiValue: "Плечи" },
  { label: "Руки", apiValue: "Руки" },
  { label: "Ноги", apiValue: "Ноги" },
  { label: "Пресс", apiValue: "Пресс" },
  { label: "Кардио", apiValue: "Кардио" },
];

/** Оборудование — совпадает с PRODUCT_NOTES / сидом. */
export const CUSTOM_EXERCISE_EQUIPMENT_CHIPS: ReadonlyArray<{
  label: string;
  apiValue: string;
}> = [
  { label: "Штанга", apiValue: "Штанга" },
  { label: "Гантели", apiValue: "Гантели" },
  { label: "Тренажёр", apiValue: "Тренажёр" },
  { label: "Своё тело", apiValue: "Своё тело" },
  { label: "Кроссовер", apiValue: "Кроссовер" },
];

export const CUSTOM_EXERCISE_DIFFICULTY_CHIPS: ReadonlyArray<{
  label: string;
  apiValue: "beginner" | "intermediate" | "advanced";
}> = [
  { label: "Начальный", apiValue: "beginner" },
  { label: "Средний", apiValue: "intermediate" },
  { label: "Сложный", apiValue: "advanced" },
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
