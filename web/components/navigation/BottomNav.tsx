"use client";

import { History, LayoutGrid, User, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "Старт", Icon: Zap },
  { href: "/history", label: "История", Icon: History },
  { href: "/workouts", label: "Планы", Icon: LayoutGrid },
  { href: "/profile", label: "Профиль", Icon: User },
] as const;

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname.startsWith("/dashboard");
  }
  if (href === "/workouts") {
    return pathname.startsWith("/workouts");
  }
  if (href === "/history") {
    return pathname === "/history" || pathname.startsWith("/history/");
  }
  if (href === "/profile") {
    return pathname === "/profile" || pathname.startsWith("/profile/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Нижняя навигация: подсветка текущего маршрута accent; скрывается через AppShell на /session/*.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Основная навигация"
      className="fixed bottom-0 left-0 right-0 border-t border-border bg-surface px-2 py-2.5"
    >
      <ul className="flex justify-around">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <li key={href} className="min-w-0 flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 px-1 py-1 text-[10px] leading-tight ${
                  active
                    ? "font-semibold text-accent"
                    : "text-muted transition-colors hover:text-white"
                }`}
              >
                <Icon
                  className="h-5 w-5 shrink-0"
                  strokeWidth={active ? 2.25 : 2}
                  aria-hidden
                />
                <span className="truncate text-center">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
