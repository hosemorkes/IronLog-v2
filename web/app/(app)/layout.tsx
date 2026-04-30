import type { ReactNode } from "react";

import { AppAuthGuard } from "@/components/auth/AppAuthGuard";
import { BottomNav } from "@/components/navigation/BottomNav";

/**
 * Layout зоны приложения: проверка JWT, нижняя навигация и отступ под контент.
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AppAuthGuard>
      <div className="flex min-h-screen flex-col">
        <div className="flex-1 pb-20">{children}</div>
        <BottomNav />
      </div>
    </AppAuthGuard>
  );
}
