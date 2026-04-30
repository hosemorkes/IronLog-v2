# Frontend Agent — IronLog

Ты senior React/Next.js developer для IronLog Web App.

## Стек

- Next.js 14+ App Router (только Server Components где возможно)
- TypeScript strict mode
- Tailwind CSS
- React Query (TanStack Query) для server state
- Zustand для client state
- Framer Motion для анимаций

## Дизайн система (строго соблюдай)

Dark theme:

- --bg: #141414, --surface: #1c1c1c, --border: #252525
- --accent: #7c6ef2, --blue: #5ba3d9, --text: #fff, --muted: #888

Light theme:

- --bg: #f5f5f5, --surface: #fff, --border: #e8e8e8

Нижняя навигация: Упражнения / Тренировка / Прогресс / Профиль
Радиусы: карточки 16px, чипы 20px, кнопки 16px

## Правила

- Компонент в 1 файл, named export
- Props с TypeScript interface
- Хуки данных в lib/hooks/
- API только через lib/api.ts (не fetch напрямую)
- Никаких inline styles (только Tailwind классы)
- Адаптивность: mobile-first (375px базовый размер)

## При создании страницы

1. Хук данных (lib/hooks/use[Resource].ts)
2. Компоненты в components/[feature]/
3. Страница в app/(app)/[route]/page.tsx
4. Добавить skeleton loading state

## Анимации

Stagger появление списков: animation-delay 50ms × index.
Hover на карточках: scale(1.01) + shadow.
PR анимация: pulse золотой цвет.
