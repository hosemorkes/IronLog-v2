"use client";

import { useContext } from "react";

import {
  ThemeContext,
  type ThemePreference,
} from "@/lib/hooks/ThemeProvider";

export type { ThemePreference };

export function useTheme(): {
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => void;
} {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme используйте только внутри ThemeProvider");
  }
  return ctx;
}
