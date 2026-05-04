"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

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
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const fetchMeRef = useRef(fetchMe);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetchMeRef.current = fetchMe;
  }, [fetchMe]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const token = getAccessToken();
      if (!token) {
        window.location.replace("/login");
        return;
      }
      await fetchMeRef.current();
      if (cancelled) {
        return;
      }
      if (!getAccessToken()) {
        window.location.replace("/login");
        return;
      }
      setReady(true);
    }

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- один прогон при монте; fetchMe через ref
  }, []);

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
