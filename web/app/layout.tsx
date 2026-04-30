import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Providers } from "./providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "IronLog",
  description: "Тренировочный трекер",
};

/**
 * Корневой layout: стили и провайдеры клиентского состояния запросов.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
