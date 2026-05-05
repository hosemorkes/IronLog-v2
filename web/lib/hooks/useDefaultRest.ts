"use client";

import { useCallback, useEffect, useState } from "react";

export const IRONLOG_DEFAULT_REST_KEY = "ironlog_default_rest";

export const ALLOWED_REST_SECONDS = [60, 90, 120, 180] as const;

export type DefaultRestSeconds = (typeof ALLOWED_REST_SECONDS)[number];

const FALLBACK: DefaultRestSeconds = 90;

function isAllowed(n: number): n is DefaultRestSeconds {
  return (ALLOWED_REST_SECONDS as readonly number[]).includes(n);
}

/** Синхронное чтение localStorage (конструктор после загрузки плана). */
export function readDefaultRestSeconds(): DefaultRestSeconds {
  if (typeof window === "undefined") {
    return FALLBACK;
  }
  try {
    const raw = localStorage.getItem(IRONLOG_DEFAULT_REST_KEY);
    const n = Number.parseInt(raw ?? "", 10);
    if (Number.isFinite(n) && isAllowed(n)) {
      return n;
    }
  } catch {
    /* ignore */
  }
  return FALLBACK;
}

/**
 * Интервал отдыха по умолчанию в секундах (конструктор планов и настройки).
 */
export function useDefaultRest(): {
  seconds: DefaultRestSeconds;
  setSeconds: (v: DefaultRestSeconds) => void;
} {
  const [seconds, setSecondsState] = useState<DefaultRestSeconds>(FALLBACK);

  useEffect(() => {
    setSecondsState(readDefaultRestSeconds());
  }, []);

  const setSeconds = useCallback((v: DefaultRestSeconds) => {
    setSecondsState(v);
    try {
      localStorage.setItem(IRONLOG_DEFAULT_REST_KEY, String(v));
    } catch {
      /* ignore */
    }
  }, []);

  return { seconds, setSeconds };
}
