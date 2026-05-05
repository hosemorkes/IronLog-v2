"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";

import { IRONLOG_THEME_STORAGE_KEY } from "@/lib/constants/theme";

export type ThemePreference = "dark" | "light";

export function applyThemePreference(mode: ThemePreference): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.classList.toggle("dark", mode === "dark");
}

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "dark";
  }
  try {
    const v = localStorage.getItem(IRONLOG_THEME_STORAGE_KEY);
    return v === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export const ThemeContext = createContext<{
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => void;
} | null>(null);

/** Синхронизация темы с localStorage и классом `dark` на &lt;html&gt;. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("dark");

  useLayoutEffect(() => {
    const stored = readStoredPreference();
    setThemeState(stored);
    applyThemePreference(stored);
  }, []);

  useLayoutEffect(() => {
    applyThemePreference(theme);
    try {
      localStorage.setItem(IRONLOG_THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (
        e.key !== IRONLOG_THEME_STORAGE_KEY ||
        !e.newValue
      ) {
        return;
      }
      if (e.newValue === "light" || e.newValue === "dark") {
        setThemeState(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((t: ThemePreference) => {
    setThemeState(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
