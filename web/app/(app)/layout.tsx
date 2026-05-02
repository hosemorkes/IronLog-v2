import type { ReactNode } from "react";

import { AppAuthGuard } from "@/components/auth/AppAuthGuard";
import { AppShell } from "@/components/navigation/AppShell";

/**
 * Layout зоны приложения: проверка JWT, нижняя навигация и отступ под контент.
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AppAuthGuard>
      <div className="flex min-h-screen flex-col">
        <AppShell>{children}</AppShell>
      </div>
    </AppAuthGuard>
  );
}
