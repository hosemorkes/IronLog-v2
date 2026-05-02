"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";

import { getAccessToken } from "@/lib/auth";

const BG = "#0f0f0f";
const ACCENT = "#7c6ef2";

/**
 * Лендинг: брендинг и вход / регистрация; при наличии access-токена — редирект на дашборд.
 */
export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (getAccessToken()) {
      router.replace("/dashboard");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <main
        className="min-h-screen"
        style={{ backgroundColor: BG }}
        aria-busy="true"
        aria-label="Загрузка"
      />
    );
  }

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6"
      style={{ backgroundColor: BG }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-[28%] h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-[120px]"
        style={{
          background: `radial-gradient(circle, ${ACCENT}33 0%, transparent 68%)`,
        }}
        aria-hidden
      />

      <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
        <div className="mb-8 flex flex-col items-center gap-3">
          <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl">
            IronLog
          </h1>
          <p className="max-w-xs text-[1.05rem] leading-snug text-[#a3a3a3] sm:max-w-md sm:text-lg">
            Трекер силовых тренировок
          </p>
        </div>

        <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/login"
            className="order-2 flex min-h-[48px] w-full items-center justify-center rounded-xl border px-7 text-[15px] font-semibold text-white transition hover:bg-white/[0.06] sm:order-1 sm:w-auto sm:min-w-[160px]"
            style={{ borderColor: "#2a2a2a", backgroundColor: "transparent" }}
          >
            Войти
          </Link>
          <Link
            href="/signup"
            className="order-1 flex min-h-[48px] w-full items-center justify-center rounded-xl px-7 text-[15px] font-semibold text-white shadow-lg transition hover:opacity-[0.92] sm:order-2 sm:w-auto sm:min-w-[200px]"
            style={{
              backgroundColor: ACCENT,
              boxShadow: `0 12px 40px ${ACCENT}40`,
            }}
          >
            Зарегистрироваться
          </Link>
        </div>
      </div>

      <footer className="absolute bottom-6 text-[13px] text-[#5c5c5c]">
        © {new Date().getFullYear()} IronLog
      </footer>
    </main>
  );
}
