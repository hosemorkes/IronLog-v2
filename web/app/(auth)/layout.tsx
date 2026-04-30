import type { ReactNode } from "react";

import { AUTH_UI_COLORS } from "@/lib/constants/auth-ui";

/**
 * Layout для login/signup: центрирование и тёмный фон вне основного приложения.
 */
export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ backgroundColor: AUTH_UI_COLORS.bgLayout }}
    >
      <div className="w-full max-w-[400px]">{children}</div>
    </div>
  );
}
