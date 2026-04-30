"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "Тренировка" },
  { href: "/exercises", label: "Упражнения" },
  { href: "/workouts", label: "Планы" },
  { href: "/progress", label: "Прогресс" },
  { href: "/profile", label: "Профиль" },
] as const;

/**
 * Нижняя навигация в стиле макета: подсветка текущего маршрута accent.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed bottom-0 left-0 right-0 border-t border-border bg-surface px-4 py-3"
    >
      <ul className="flex justify-around text-xs text-muted">
        {ITEMS.map(({ href, label }) => {
          const active =
            href === "/dashboard"
              ? pathname.startsWith("/dashboard")
              : href === "/workouts"
                ? pathname.startsWith("/workouts")
                : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={
                  active
                    ? "font-semibold text-accent"
                    : "transition-colors hover:text-white"
                }
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
