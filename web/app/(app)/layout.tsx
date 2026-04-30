import type { ReactNode } from "react";

import { BottomNav } from "@/components/navigation/BottomNav";

/**
 * Layout зоны приложения: нижняя навигация и отступ под safe-area контента.
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex-1 pb-20">{children}</div>
      <BottomNav />
    </div>
  );
}
