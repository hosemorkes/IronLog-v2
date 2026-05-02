"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { BottomNav } from "@/components/navigation/BottomNav";

/**
 * Отступ под нижнюю навигацию и сам навбар — скрываются на экране активной тренировки.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname.startsWith("/session");

  return (
    <>
      <div className={hideNav ? "flex-1" : "flex-1 pb-20"}>{children}</div>
      {!hideNav ? <BottomNav /> : null}
    </>
  );
}
