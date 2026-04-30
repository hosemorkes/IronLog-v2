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
    <section className="rounded-2xl border border-border bg-surface px-4 py-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
        Достижения
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          Здесь появятся ачивки по мере тренировок.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((a) => (
            <li
              key={a.achievement_id}
              className="flex items-center gap-3 rounded-xl border border-border bg-bg-dark/50 px-3 py-2"
            >
              <span className="text-xl" aria-hidden>
                {a.icon?.trim() || "🏅"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">{a.name}</p>
                {a.description ? (
                  <p className="truncate text-xs text-muted">{a.description}</p>
                ) : null}
                <p className="text-[10px] text-muted">
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
