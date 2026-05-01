"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { getAccessToken } from "@/lib/auth";
import { useUserProgress, usePersonalRecords } from "@/lib/hooks/useProgress";
import { useAuthStore } from "@/lib/stores/authStore";

const nf = new Intl.NumberFormat("ru-RU");

function formatLifetimeTonnageShort(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) {
    return "0т";
  }
  const tons = kg / 1000;
  const num = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(tons);
  return `${num}т`;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-5 pb-2 pt-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
    </div>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className={className}
      aria-hidden
    >
      <polyline
        points="5,3 9,7 5,11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface SettingsRowProps {
  icon: string;
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
}

function SettingsRow({ icon, label, value, onClick, danger }: SettingsRowProps) {
  const content = (
    <>
      <span
        className="mr-3 w-6 shrink-0 text-center text-lg"
        aria-hidden
      >
        {icon}
      </span>
      <span className={`flex-1 text-[15px] ${danger ? "font-semibold" : ""}`}>
        {label}
      </span>
      {value ? (
        <span className="mr-2 max-w-[45%] shrink-0 truncate text-[13px] text-muted">
          {value}
        </span>
      ) : null}
      <ChevronRight
        className={
          danger ? "shrink-0 text-red-400/70" : "shrink-0 text-[#555]"
        }
      />
    </>
  );

  const baseClass = `flex w-full items-center px-4 py-3.5 text-left ${
    danger ? "text-red-400" : "text-white"
  }`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClass} transition-colors hover:bg-white/[0.03]`}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClass}>{content}</div>;
}

function SettingsRowsStatic({
  rows,
}: {
  rows: Array<{
    icon: string;
    label: string;
    value?: string;
    onClick?: () => void;
    danger?: boolean;
  }>;
}) {
  return (
    <div className="mx-4 overflow-hidden rounded-2xl border border-[#252525] bg-[#1a1a1a]">
      {rows.map((row, ii) => (
        <div
          key={`${row.label}-${ii}`}
          className={ii > 0 ? "border-t border-[#232323]" : ""}
        >
          <SettingsRow
            icon={row.icon}
            label={row.label}
            value={row.value}
            onClick={row.onClick}
            danger={row.danger}
          />
        </div>
      ))}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-4 px-4 pb-10">
      <div className="h-[108px] rounded-[18px] bg-[#1a1a1a]" />
      <div className="grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map((k) => (
          <div key={k} className="h-[72px] rounded-xl bg-[#1a1a1a]" />
        ))}
      </div>
      <div className="h-40 rounded-2xl bg-[#1a1a1a]" />
      <div className="h-32 rounded-2xl bg-[#1a1a1a]" />
      <div className="h-28 rounded-2xl bg-[#1a1a1a]" />
    </div>
  );
}

/**
 * Профиль: аватар, статистика, блоки настроек (пока без логики), выход.
 */
export default function ProfilePage() {
  const router = useRouter();
  const hasToken =
    typeof window !== "undefined" ? !!getAccessToken() : false;

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const { data: progress, isPending: progressPending } = useUserProgress();
  const { data: prs, isPending: prsPending } = usePersonalRecords();

  const prCount = prs?.items?.length ?? 0;
  const totalWorkouts = progress?.workouts_completed_total ?? 0;
  const lifetimeKg = progress?.total_lifetime_tonnage_kg ?? 0;
  const streak = progress?.workout_streak_days ?? 0;

  const loading =
    hasToken && (progressPending || prsPending);

  const username = user?.username?.trim() || "—";
  const email = user?.email?.trim() || "—";

  const stats = useMemo(
    () => [
      {
        v: hasToken ? nf.format(totalWorkouts) : "—",
        l: "Тренировок",
      },
      {
        v: hasToken ? String(prCount) : "—",
        l: "PR установлено",
      },
      {
        v: hasToken ? formatLifetimeTonnageShort(lifetimeKg) : "—",
        l: "Кг поднято",
      },
    ],
    [hasToken, totalWorkouts, prCount, lifetimeKg],
  );

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <main className="no-scrollbar min-h-full overflow-y-auto bg-bg-dark pb-8">
      <header className="bg-bg-dark px-5 pb-2.5 pt-3">
        <h1 className="text-[22px] font-extrabold text-white">Профиль</h1>
      </header>

      {loading ? (
        <ProfileSkeleton />
      ) : (
        <>
          <div className="mx-4 mb-4 flex items-center gap-4 rounded-[18px] border border-[#252525] bg-[#1a1a1a] p-5">
            <div
              className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-full border-2 border-accent bg-accent/15 text-[28px]"
              aria-hidden
            >
              💪
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xl font-bold text-white">{username}</p>
              <p className="mt-0.5 truncate text-[13px] text-muted">{email}</p>
              {hasToken && streak > 0 ? (
                <p className="mt-2 text-xs font-semibold text-amber-400">
                  🔥 {streak}-дневный стрик
                </p>
              ) : null}
            </div>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2.5 px-4">
            {stats.map((s) => (
              <div
                key={s.l}
                className="rounded-xl border border-[#252525] bg-[#1a1a1a] px-2 py-3.5 text-center"
              >
                <p className="text-xl font-extrabold text-accent">{s.v}</p>
                <p className="mt-0.5 text-[10px] leading-snug text-muted">
                  {s.l}
                </p>
              </div>
            ))}
          </div>

          <div className="mb-4">
            <SectionLabel label="Тренировки" />
            <SettingsRowsStatic
              rows={[
                { icon: "⚖️", label: "Единицы измерения", value: "кг" },
                { icon: "⏱", label: "Отдых по умолчанию", value: "90 с" },
              ]}
            />
          </div>

          <div className="mb-4">
            <SectionLabel label="Приложение" />
            <SettingsRowsStatic
              rows={[
                { icon: "🎨", label: "Тема", value: "Тёмная" },
                { icon: "📤", label: "Экспорт данных" },
              ]}
            />
          </div>

          <div className="mb-4">
            <SectionLabel label="Аккаунт" />
            <SettingsRowsStatic
              rows={[
                {
                  icon: "👤",
                  label: "Имя пользователя",
                  value: username !== "—" ? username : undefined,
                },
                {
                  icon: "🚪",
                  label: "Выйти из аккаунта",
                  danger: true,
                  onClick: handleLogout,
                },
              ]}
            />
          </div>

          <p className="px-5 pb-7 pt-2 text-center text-xs text-[#555]">
            IronLog v1.0.0
          </p>
        </>
      )}
    </main>
  );
}
