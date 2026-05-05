"use client";

import type { UserAchievementFeedItemDto } from "@/lib/types/dashboard";

const df = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

interface AchievementsWidgetProps {
  items: UserAchievementFeedItemDto[];
}

/**
 * Последние разблокированные достижения.
 */
export function AchievementsWidget({ items }: AchievementsWidgetProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-100 px-4 py-4 dark:border-border dark:bg-surface">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#888]">
        Достижения
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-[#888]">
          Здесь появятся ачивки по мере тренировок.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((a) => (
            <li
              key={a.achievement_id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-border dark:bg-bg-dark/50"
            >
              <span className="text-xl" aria-hidden>
                {a.icon?.trim() || "🏅"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{a.name}</p>
                {a.description ? (
                  <p className="truncate text-xs text-gray-500 dark:text-[#888]">{a.description}</p>
                ) : null}
                <p className="text-[10px] text-gray-500 dark:text-[#888]">
                  {df.format(new Date(a.unlocked_at))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
