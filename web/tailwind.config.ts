import type { Config } from "tailwindcss";

/**
 * Цвета из дизайн-системы IronLog (CLAUDE.md).
 */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-dark": "#141414",
        surface: "#1c1c1c",
        border: "#252525",
        accent: "#7c6ef2",
        "accent-dark": "#5b4ff0",
        "muscle-blue": "#5ba3d9",
        "bg-light": "#f5f5f5",
        "surface-light": "#ffffff",
        "border-light": "#e8e8e8",
        muted: "#888888",
      },
    },
  },
  plugins: [],
};

export default config;
