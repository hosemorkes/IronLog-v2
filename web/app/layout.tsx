import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import { IRONLOG_THEME_STORAGE_KEY } from "@/lib/constants/theme";

import { Providers } from "./providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "IronLog",
  description: "Тренировочный трекер",
};

function themeBootstrapScript(): string {
  const key = IRONLOG_THEME_STORAGE_KEY.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `(function(){try{var k="${key}";var t=localStorage.getItem(k);var r=document.documentElement;if(t==="light"){r.classList.remove("dark");}else{r.classList.add("dark");}}catch(e){document.documentElement.classList.add("dark");}})();`;
}

/**
 * Корневой layout: стили и провайдеры клиентского состояния запросов.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7c6ef2" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="IronLog" />
      </head>
      <body className="font-sans">
        <Script id="ironlog-theme" strategy="beforeInteractive">
          {themeBootstrapScript()}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
