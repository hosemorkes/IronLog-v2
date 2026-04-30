"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getAccessToken } from "@/lib/auth";
import { AUTH_UI_COLORS } from "@/lib/constants/auth-ui";
import { useAuthStore } from "@/lib/stores/authStore";

interface AppAuthGuardProps {
  children: ReactNode;
}

/**
 * Защита зоны (app): без токена — редирект на /login; иначе загрузка профиля через fetchMe().
 */
export function AppAuthGuard({ children }: AppAuthGuardProps) {
  const router = useRouter();
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const token = getAccessToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      await fetchMe();
      if (cancelled) {
        return;
      }
      if (!getAccessToken()) {
        router.replace("/login");
        return;
      }
      setReady(true);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [fetchMe, router]);

  if (!ready) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center"
        style={{ backgroundColor: AUTH_UI_COLORS.bg }}
      >
        <p className="text-sm" style={{ color: AUTH_UI_COLORS.text2 }}>
          Загрузка…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
