import type { ReactNode } from "react";

/**
 * Layout для login/signup: центрирование и фон под светлую/тёмную тему.
 */
export default function AuthGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-light px-4 py-10 dark:bg-[#0f0f0f]">
      <div className="w-full max-w-[400px]">{children}</div>
    </div>
  );
}
