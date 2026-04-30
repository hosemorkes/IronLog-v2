import Link from "next/link";

/**
 * Временная стартовая страница до полноценного лендинга / редиректа по сессии.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold tracking-tight text-white">IronLog</h1>
      <p className="max-w-md text-center text-muted">
        Веб-приложение (Next.js 14 App Router). Интерактивный макет см.{" "}
        <code className="rounded bg-surface px-1 py-0.5 text-sm text-accent">
          ironlog-prototype/project/IronLog.html
        </code>
      </p>
      <Link
        href="/dashboard"
        className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-dark"
      >
        Перейти в приложение
      </Link>
    </main>
  );
}
