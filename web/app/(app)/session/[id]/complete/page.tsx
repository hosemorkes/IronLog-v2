"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo, useState } from "react";

import { useSessionDetail } from "@/lib/hooks/useSessions";
import { buildSessionExportText } from "@/lib/session/buildExportText";

function formatMmSs(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function SessionCompleteContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const planId = typeof params.id === "string" ? params.id : "";
  const sessionId = searchParams.get("sessionId");
  const planNameFromQuery = searchParams.get("planName");

  const [copyHint, setCopyHint] = useState<string | null>(null);

  const { data: detail, error, isPending } = useSessionDetail(sessionId);

  const planTitle =
    planNameFromQuery?.trim() ||
    (detail?.plan_id ? "Тренировка по плану" : "Тренировка");

  const stats = useMemo(() => {
    if (!detail?.completed_at) {
      return null;
    }
    const start = new Date(detail.started_at).getTime();
    const end = new Date(detail.completed_at).getTime();
    const durationSec = Math.max(0, Math.round((end - start) / 1000));
    const tonnageRaw =
      detail.total_volume_kg !== null && detail.total_volume_kg !== ""
        ? Number.parseFloat(String(detail.total_volume_kg))
        : 0;
    const tonnage = Number.isFinite(tonnageRaw) ? tonnageRaw : 0;
    const exerciseIds = new Set(detail.sets.map((s) => s.exercise_id));
    return {
      durationSec,
      setsCount: detail.sets.length,
      tonnage,
      exerciseCount: exerciseIds.size,
    };
  }, [detail]);

  const exportFull = useMemo(() => {
    if (!detail?.completed_at) {
      return "";
    }
    return buildSessionExportText(planTitle, detail);
  }, [detail, planTitle]);

  const exportPreviewLines = useMemo(
    () => exportFull.split("\n").slice(0, 6),
    [exportFull],
  );

  const handleShare = useCallback(async () => {
    if (!exportFull) {
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(exportFull);
      } else {
        const ta = document.createElement("textarea");
        ta.value = exportFull;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopyHint("Скопировано в буфер");
      window.setTimeout(() => setCopyHint(null), 2500);
    } catch {
      setCopyHint("Не удалось скопировать");
      window.setTimeout(() => setCopyHint(null), 2500);
    }
  }, [exportFull]);

  if (!sessionId) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-bg-dark px-6 py-16">
        <p className="text-center text-sm text-muted">
          Не указана сессия. Откройте экран из завершённой тренировки.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 block rounded-2xl bg-accent py-3 text-center font-semibold text-white"
        >
          На главную
        </Link>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-bg-dark px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="mt-4 text-sm text-muted">Загрузка итогов…</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-bg-dark px-6 py-16">
        <p className="text-center text-sm text-rose-300">
          {(error as Error)?.message ?? "Не удалось загрузить сессию"}
        </p>
        <Link
          href="/dashboard"
          className="mt-8 block rounded-2xl bg-accent py-3 text-center font-semibold text-white"
        >
          На главную
        </Link>
      </div>
    );
  }

  if (!detail.completed_at) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-bg-dark px-6 py-16">
        <p className="text-center text-sm text-muted">
          Тренировка ещё не завершена.
        </p>
        {planId ? (
          <Link
            href={`/session/${planId}`}
            className="mt-6 block text-center text-accent"
          >
            Вернуться к тренировке
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center bg-bg-dark px-6 pb-16 pt-10">
      <div className="text-[64px] leading-none">🏆</div>
      <h1 className="mt-4 text-center text-[26px] font-extrabold text-white">
        Тренировка завершена!
      </h1>
      <p className="mt-2 text-center text-[15px] text-muted">Отличная работа!</p>

      {stats ? (
        <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-3">
          {[
            { v: formatMmSs(stats.durationSec), l: "Время" },
            { v: String(stats.setsCount), l: "Сетов" },
            {
              v: `${Math.round(stats.tonnage).toLocaleString("ru-RU")} кг`,
              l: "Тоннаж",
            },
            { v: String(stats.exerciseCount), l: "Упражнений" },
          ].map((card) => (
            <div
              key={card.l}
              className="rounded-2xl border border-[#232323] bg-[#1a1a1a] px-4 py-4 text-center"
            >
              <div className="text-[22px] font-extrabold text-accent">{card.v}</div>
              <div className="mt-1 text-xs text-muted">{card.l}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-8 w-full max-w-md overflow-hidden rounded-2xl border border-[#232323] bg-[#1a1a1a]">
        <div className="border-b border-[#232323] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.55px] text-muted">
            Поделиться тренировкой
          </p>
          <p className="mt-1 text-xs text-muted">
            Скопируй и отправь в Telegram, заметки или куда угодно
          </p>
        </div>
        <div className="relative max-h-[120px] overflow-hidden px-4 py-2.5 font-mono text-[11px] leading-relaxed text-muted">
          {exportPreviewLines.map((line, i) => (
            <p key={`pv-${String(i)}`} className="truncate">
              {line}
            </p>
          ))}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#1a1a1a] to-transparent" />
        </div>
        <div className="p-3 pt-0">
          <button
            type="button"
            onClick={() => void handleShare()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 py-3 text-sm font-bold text-accent transition hover:bg-accent/20"
          >
            <CopyIcon />
            Поделиться
          </button>
          {copyHint ? (
            <p className="mt-2 text-center text-xs text-muted">{copyHint}</p>
          ) : null}
        </div>
      </div>

      <Link
        href="/dashboard"
        className="mt-8 w-full max-w-md rounded-2xl bg-accent py-4 text-center text-base font-bold text-white hover:bg-accent-dark"
      >
        На главную
      </Link>
      {planId ? (
        <Link
          href={`/workouts/${planId}`}
          className="mt-4 text-sm text-muted hover:text-white"
        >
          К плану
        </Link>
      ) : null}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      aria-hidden
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <rect x={9} y={2} width={9} height={12} rx={2} />
      <rect x={2} y={5} width={9} height={12} rx={2} />
    </svg>
  );
}

export default function SessionCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-1 items-center justify-center bg-bg-dark">
          <p className="text-sm text-muted">Загрузка…</p>
        </div>
      }
    >
      <SessionCompleteContent />
    </Suspense>
  );
}
