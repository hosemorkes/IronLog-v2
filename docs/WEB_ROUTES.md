# Web (PWA) — маршруты и ответственность

Next.js 14 App Router, сервис **`web`** (порт 3000). Ниже — фактическое состояние репозитория: **17 экранов** (файлов `app/**/page.tsx` в `(app)`, `(auth)` и корень). Отдельное приложение **admin** в дереве проекта может отсутствовать — страницы админки здесь не перечислены.

## Таблица маршрутов

| URL | Файл | Назначение |
|-----|------|------------|
| `/` | `web/app/page.tsx` | Лендинг; при наличии access-токена — редирект на `/dashboard`. |
| `/login` | `web/app/(auth)/login/page.tsx` | Вход; форма на Tailwind (светлая/тёмная по **`ironlog_theme`**, layout **`(auth)`**). |
| `/signup` | `web/app/(auth)/signup/page.tsx` | Регистрация; то же. |
| `/dashboard` | `web/app/(app)/dashboard/page.tsx` | Главный дашборд после входа. |
| `/history` | `web/app/(app)/history/page.tsx` | История тренировок; каждая карточка ведёт на `/history/[session_id]`. |
| `/history/[session_id]` | `web/app/(app)/history/[session_id]/page.tsx` | Деталь завершённой сессии: план, дата, время, объём, таблицы подходов по упражнениям. Данные: **`GET /api/user/sessions/{session_id}`** (хук **`useSessionDetail`** в `useSessions.ts`). |
| `/progress` | `web/app/(app)/progress/page.tsx` | Прогресс и статистика. (сейчас слился с /dashboard) |
| `/profile` | `web/app/(app)/profile/page.tsx` | Профиль: переключатель **светлой/тёмной темы** (**`ironlog_theme`**, класс **`dark`** на `<html>`, Tailwind **`darkMode: 'class'`**), **имя** (**`PUT /api/auth/me`**), **отдых по умолчанию** (**`ironlog_default_rest`**, хук **`useDefaultRest`**), **экспорт** последних сессий (**`fetchSessionDetail`**, **`buildSessionExportText`**). Единицы — заглушка. |
| `/exercises` | `web/app/(app)/exercises/page.tsx` | Библиотека; «Назад» → `/workouts`, создание → `/exercises/new`. Превью: **`getMediaUrl(image_url)`** (`web/lib/utils/media.ts`, env **`NEXT_PUBLIC_MEDIA_URL`**). |
| `/exercises/new` | `web/app/(app)/exercises/new/page.tsx` | Кастомное упражнение: **`POST /api/user/exercises`** (тренер/админ может **`POST /api/exercises`**), хук **`useCreateCustomExercise`**. |
| `/exercises/[id]` | `web/app/(app)/exercises/[id]/page.tsx` | Карточка упражнения; фон шапки — тот же **`getMediaUrl`**. |
| `/workouts` | `web/app/(app)/workouts/page.tsx` | Список планов тренировок. |
| `/workouts/new` | `web/app/(app)/workouts/new/page.tsx` | Создание плана. |
| `/workouts/[id]` | `web/app/(app)/workouts/[id]/page.tsx` | Просмотр плана. |
| `/workouts/[id]/edit` | `web/app/(app)/workouts/[id]/edit/page.tsx` | Редактирование плана. |
| `/session/[id]` | `web/app/(app)/session/[id]/page.tsx` | Активная тренировка (план `id`). |
| `/session/[id]/complete` | `web/app/(app)/session/[id]/complete/page.tsx` | Экран итогов. Query: **`session_id`** (UUID сессии; опционально **`sessionId`**). При необходимости доводит сессию до завершения (PUT) и инвалидирует прогресс в React Query. |

### Поведение экрана активной тренировки (`/session/[id]`)

- **`[id]`** в URL — UUID **плана** (`plan_id`), не сессии.
- Старт: один **`POST /api/user/sessions`** с телом `{ plan_id }` (через **`apiFetch`**). Успех **200** — новый `session_id`; **409** с `detail.active_session_id` — используется этот id; отдельный «resume» к API для списка упражнений не вызывается.
- Список подходов строится из **`useWorkoutPlan(planId)`**, а не из ответа POST.
- В **`localStorage`** (только в браузере, см. **`getStorage()`** в коде страницы):
  - **`workout_start_<sessionId>`** — `Date.now()` начала тренировки для таймера (если ключа ещё нет — пишется при появлении `sessionId`).
  - **`workout_progress_<sessionId>`** — JSON: `currentIdx`, `completedSets`, `tonnageDone`, `savedAt` (восстановление при возрасте записи менее 24 ч).
- По **завершении** сессии оба ключа удаляются; инвалидация **`GET /api/user/progress`** и связанных запросов — в хуках после PUT.

## Оболочка и навигация

| Компонент | Файл | Роль |
|-----------|------|------|
| Корень приложения | `web/app/layout.tsx` | Глобальные стили, скрипт темы до гидрации, провайдеры. |
| Провайдеры | `web/app/providers.tsx` | TanStack Query и **`ThemeProvider`** (`web/lib/hooks/ThemeProvider.tsx`). |
| Группа `(app)` | `web/app/(app)/layout.tsx` | `AppAuthGuard` (JWT), `AppShell`, фон светлый/тёмный. |
| Оболочка | `web/components/navigation/AppShell.tsx` | Отступ под нижнюю панель; на маршрутах `/session/*` нижняя навигация **не показывается**. |
| Нижняя навигация | `web/components/navigation/BottomNav.tsx` | Четыре вкладки: **Старт** (`/dashboard`), **История** (`/history`), **Планы** (`/workouts`), **Профиль** (`/profile`). Остальные экраны открываются по ссылкам с этих страниц и из контента. С дашборда блок **«Последняя тренировка»** ведёт на **`/history/[session_id]`** (при активной сессии кнопка «Продолжить» остаётся ссылкой на **`/session/[plan_id]`**). |

Группа `(auth)` (`login`, `signup`) не использует layout `(app)` — отдельные экраны без нижней навигации; фон и карточка формы следуют выбранной теме (см. **`web/app/(auth)/layout.tsx`**).

### Тема оформления

- Источник истины: **`ironlog_theme`** в **`localStorage`** (`dark` | `light`), синхронизация с классом **`dark`** на **`<html>`** до гидрации (скрипт в **`web/app/layout.tsx`**) и через **`ThemeProvider`** (**`web/lib/hooks/ThemeProvider.tsx`**).
- Стили: Tailwind с парами **`… dark:…`** для фонов, границ и текста на экранах **`(app)`** и формах **`(auth)`**; палитра расширена в **`web/tailwind.config.ts`** (**`bg-dark`**, **`surface`**, **`border`**, **`bg-light`**, **`border-light`** и т.д.).

## Ключи `localStorage` (веб-клиент)

| Ключ | Назначение |
|------|------------|
| `ironlog_access_token` | JWT доступа (авторизация в `(app)`). |
| `ironlog_theme` | `dark` или `light` — синхронизируется с классом **`dark`** на `<html>`. |
| `ironlog_default_rest` | Секунды отдыха по умолчанию для новых упражнений в конструкторе плана. |
| `workout_start_<sessionId>`, `workout_progress_<sessionId>` | Активная тренировка, см. выше. |

## Согласование с `PROJECT_STRUCTURE.md`

Дерево в [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) может описывать целевую или устаревшую структуру (например, `session/history`, `trainers`, отдельная страница achievements). **Актуальный список URL и файлов** — в таблице выше; при расхождении ориентироваться на `web/app/` в репозитории.
