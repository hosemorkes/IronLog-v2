"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, type ReactNode } from "react";

import { buildSessionExportText } from "@/lib/session/buildExportText";
import { getAccessToken } from "@/lib/auth";
import {
  ALLOWED_REST_SECONDS,
  useDefaultRest,
} from "@/lib/hooks/useDefaultRest";
import { usePersonalRecords, useUserProgress } from "@/lib/hooks/useProgress";
import {
  fetchSessionDetail,
  useSessionHistory,
} from "@/lib/hooks/useSessions";
import { useTheme } from "@/lib/hooks/useTheme";
import { useWorkoutPlans } from "@/lib/hooks/useWorkouts";
import type { SessionDetailDto } from "@/lib/types/session";
import type { WorkoutSessionListItemDto } from "@/lib/types/dashboard";
import { useAuthStore } from "@/lib/stores/authStore";

const nf = new Intl.NumberFormat("ru-RU");

const LABEL_MAX = 30;
const LABEL_MIN = 3;

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

function sessionExportPlanTitle(
  session: WorkoutSessionListItemDto,
  planNames: Map<string, string>,
): string {
  if (!session.plan_id) {
    return "Свободная тренировка";
  }
  const name = planNames.get(session.plan_id)?.trim();
  return name ?? "План тренировки";
}

function downloadText(filename: string, body: string): void {
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-5 pb-2 pt-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted dark:text-muted">
        {label}
      </span>
    </div>
  );
}

function ChevronRight({
  variant = "default",
}: {
  variant?: "default" | "danger";
}) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className={
        variant === "danger" ? "shrink-0 text-red-400/70" : "shrink-0 text-muted"
      }
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

function Overlay({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Закрыть"
        onClick={() => {
          onClose();
        }}
      />
      <div className="relative z-[121] flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#232323] bg-[#1a1a1a] shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-[#232323] px-4 py-3">
          <h2 className="text-[16px] font-bold text-white">{title}</h2>
          <button
            type="button"
            onClick={() => {
              onClose();
            }}
            className="rounded-lg px-2 py-1 text-sm text-muted transition hover:text-white"
          >
            Закрыть
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

/**
 * Профиль: статистика, живые настройки (тема, имя, отдых, экспорт), выход.
 */
export default function ProfilePage() {
  const router = useRouter();
  const hasToken =
    typeof window !== "undefined" ? !!getAccessToken() : false;

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateUsername = useAuthStore((s) => s.updateUsername);

  const { theme, setTheme } = useTheme();
  const { seconds: restSec, setSeconds: setRestSec } = useDefaultRest();

  const { data: progress, isPending: progressPending } = useUserProgress();
  const { data: prs, isPending: prsPending } = usePersonalRecords();
  const { data: plans } = useWorkoutPlans();
  const sessionHistory = useSessionHistory();

  const [themeOpen, setThemeOpen] = useState(false);
  const [usernameOpen, setUsernameOpen] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSaving, setUsernameSaving] = useState(false);

  const [restOpen, setRestOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportSelected, setExportSelected] = useState<Record<string, boolean>>(
    {},
  );
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const planNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of plans ?? []) {
      m.set(p.id, p.name);
    }
    return m;
  }, [plans]);

  const lastTenSessions = useMemo(() => {
    const flat = sessionHistory.data?.pages.flatMap((p) => p.items) ?? [];
    return flat.slice(0, 10);
  }, [sessionHistory.data?.pages]);

  const prCount = prs?.items?.length ?? 0;
  const totalWorkouts = progress?.workouts_completed_total ?? 0;
  const lifetimeKg = progress?.total_lifetime_tonnage_kg ?? 0;
  const streak = progress?.workout_streak_days ?? 0;

  const loading = hasToken && (progressPending || prsPending);

  const username = user?.username?.trim() || "—";
  const email = user?.email?.trim() || "—";

  const themeLabel = theme === "dark" ? "Тёмная" : "Светлая";

  const openUsernameEdit = useCallback(() => {
    setUsernameDraft(user?.username?.trim() ?? "");
    setUsernameError(null);
    setUsernameOpen(true);
  }, [user?.username]);

  const saveUsername = useCallback(async () => {
    const t = usernameDraft.trim();
    if (t.length < LABEL_MIN) {
      setUsernameError(`Минимум ${String(LABEL_MIN)} символа`);
      return;
    }
    if (t.length > LABEL_MAX) {
      setUsernameError(`Максимум ${String(LABEL_MAX)} символов`);
      return;
    }
    setUsernameSaving(true);
    setUsernameError(null);
    try {
      await updateUsername(t);
      setUsernameOpen(false);
    } catch (e) {
      setUsernameError(e instanceof Error ? e.message : "Не удалось сохранить.");
    } finally {
      setUsernameSaving(false);
    }
  }, [usernameDraft, updateUsername]);

  const buildExportBlob = useCallback(
    async (ids: string[]) => {
      let out = "";
      for (let i = 0; i < ids.length; i += 1) {
        const id = ids[i];
        if (!id) {
          continue;
        }
        const detail = await fetchSessionDetail(id);
        const listItem =
          lastTenSessions.find((s) => s.session_id === id) ??
          ({
            session_id: id,
            plan_id: detail.plan_id,
            started_at: detail.started_at,
            completed_at: detail.completed_at,
            total_volume_kg: detail.total_volume_kg,
          } as WorkoutSessionListItemDto);
        const planTitle = sessionExportPlanTitle(listItem, planNames);
        const text = buildSessionExportText(planTitle, detail);
        out += text;
        if (i < ids.length - 1) {
          out += "\n\n═══ ─ ─ ─ ═══\n\n";
        }
      }
      return out;
    },
    [lastTenSessions, planNames],
  );

  const runExportSelected = async () => {
    const ids = Object.entries(exportSelected)
      .filter(([, checked]) => checked)
      .map(([sid]) => sid);
    if (ids.length === 0) {
      setExportError("Отметьте тренировки или нажмите «Экспортировать все».");
      return;
    }
    setExportBusy(true);
    setExportError(null);
    try {
      const text = await buildExportBlob(ids);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadText(`ironlog-export-${stamp}.txt`, text);
      setExportOpen(false);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Ошибка экспорта.");
    } finally {
      setExportBusy(false);
    }
  };

  const runExportAll = async () => {
    const ids = lastTenSessions.map((s) => s.session_id);
    if (ids.length === 0) {
      setExportError("Нет завершённых тренировок для экспорта.");
      return;
    }
    setExportBusy(true);
    setExportError(null);
    try {
      const text = await buildExportBlob(ids);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadText(`ironlog-export-${stamp}.txt`, text);
      setExportOpen(false);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Ошибка экспорта.");
    } finally {
      setExportBusy(false);
    }
  };

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
    <main className="no-scrollbar min-h-full overflow-y-auto bg-bg-light pb-8 dark:bg-bg-dark">
      <header className="bg-bg-light px-5 pb-2.5 pt-3 dark:bg-bg-dark">
        <h1 className="text-[22px] font-extrabold text-neutral-900 dark:text-white">
          Профиль
        </h1>
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
            <div className="mx-4 overflow-hidden rounded-2xl border border-[#252525] bg-[#1a1a1a]">
              <div className="border-b border-[#232323]">
                <button
                  type="button"
                  onClick={() => {
                    setRestOpen((o) => !o);
                  }}
                  className="flex w-full items-center px-4 py-3.5 text-left text-white transition-colors hover:bg-white/[0.03]"
                >
                  <span className="mr-3 w-6 shrink-0 text-center text-lg" aria-hidden>
                    ⏱
                  </span>
                  <span className="flex-1 text-[15px]">Отдых по умолчанию</span>
                  <span className="mr-2 shrink-0 text-[13px] text-muted">
                    {String(restSec)} с
                  </span>
                  <ChevronRight />
                </button>
                {restOpen ? (
                  <div className="border-t border-[#232323] px-4 pb-4 pt-3">
                    <p className="mb-2 text-xs text-muted">
                      Для новых упражнений в конструкторе планов
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ALLOWED_REST_SECONDS.map((sec) => {
                        const sel = restSec === sec;
                        return (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => {
                              setRestSec(sec);
                            }}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                              sel
                                ? "bg-accent text-white"
                                : "bg-[#232323] text-muted hover:text-white"
                            }`}
                          >
                            {String(sec)} с
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex w-full items-center px-4 py-3.5 text-left text-[15px] text-white">
                <span className="mr-3 w-6 shrink-0 text-center text-lg" aria-hidden>
                  ⚖️
                </span>
                <span className="flex-1 text-[15px]">Единицы измерения</span>
                <span className="mr-2 max-w-[45%] shrink-0 truncate text-[13px] text-muted">
                  кг
                </span>
                <ChevronRight />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <SectionLabel label="Приложение" />
            <div className="mx-4 overflow-hidden rounded-2xl border border-[#252525] bg-[#1a1a1a]">
              <button
                type="button"
                onClick={() => {
                  setThemeOpen(true);
                }}
                className="flex w-full items-center border-b border-[#232323] px-4 py-3.5 text-left text-white transition-colors hover:bg-white/[0.03]"
              >
                <span className="mr-3 w-6 shrink-0 text-center text-lg" aria-hidden>
                  🎨
                </span>
                <span className="flex-1 text-[15px]">Тема</span>
                <span className="mr-2 shrink-0 text-[13px] text-muted">
                  {themeLabel}
                </span>
                <ChevronRight />
              </button>
              <button
                type="button"
                onClick={() => {
                  setExportSelected({});
                  setExportError(null);
                  setExportOpen(true);
                }}
                className="flex w-full items-center px-4 py-3.5 text-left text-white transition-colors hover:bg-white/[0.03]"
              >
                <span className="mr-3 w-6 shrink-0 text-center text-lg" aria-hidden>
                  📤
                </span>
                <span className="flex-1 text-[15px]">Экспорт данных</span>
                <ChevronRight />
              </button>
            </div>
          </div>

          <div className="mb-4">
            <SectionLabel label="Аккаунт" />
            <div className="mx-4 overflow-hidden rounded-2xl border border-[#252525] bg-[#1a1a1a]">
              <div className="border-b border-[#232323]">
                <button
                  type="button"
                  onClick={() => {
                    openUsernameEdit();
                  }}
                  className="flex w-full items-center px-4 py-3.5 text-left text-white transition-colors hover:bg-white/[0.03]"
                >
                  <span className="mr-3 w-6 shrink-0 text-center text-lg" aria-hidden>
                    👤
                  </span>
                  <span className="flex-1 text-[15px]">Имя пользователя</span>
                  {username !== "—" ? (
                    <span className="mr-2 max-w-[40%] shrink-0 truncate text-[13px] text-muted">
                      {username}
                    </span>
                  ) : null}
                  <ChevronRight />
                </button>
                {usernameOpen ? (
                  <div className="border-t border-[#232323] px-4 pb-4 pt-3">
                    <input
                      value={usernameDraft}
                      onChange={(e) => {
                        setUsernameDraft(e.target.value);
                        setUsernameError(null);
                      }}
                      maxLength={LABEL_MAX}
                      className="w-full rounded-xl border border-[#232323] bg-[#232323]/60 px-3 py-2.5 text-[15px] text-white caret-accent outline-none focus:border-accent/50"
                      placeholder="Новое имя"
                      autoComplete="username"
                    />
                    {usernameError ? (
                      <p className="mt-2 text-xs text-rose-400">{usernameError}</p>
                    ) : (
                      <p className="mt-1.5 text-[11px] text-muted">
                        От {LABEL_MIN} до {LABEL_MAX} символов
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={usernameSaving}
                        onClick={() => {
                          void saveUsername();
                        }}
                        className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {usernameSaving ? "Сохранение…" : "Сохранить"}
                      </button>
                      <button
                        type="button"
                        disabled={usernameSaving}
                        onClick={() => {
                          setUsernameOpen(false);
                        }}
                        className="flex-1 rounded-xl border border-[#232323] py-2.5 text-sm font-semibold text-white"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center px-4 py-3.5 text-left text-red-400 transition-colors hover:bg-white/[0.03]"
              >
                <span className="mr-3 w-6 shrink-0 text-center text-lg" aria-hidden>
                  🚪
                </span>
                <span className="flex-1 text-[15px] font-semibold">
                  Выйти из аккаунта
                </span>
                <ChevronRight variant="danger" />
              </button>
            </div>
          </div>

          <p className="px-5 pb-7 pt-2 text-center text-xs text-muted">
            IronLog v1.0.0
          </p>
        </>
      )}

      {themeOpen ? (
        <Overlay title="Тема" onClose={() => setThemeOpen(false)}>
          <p className="mb-4 text-sm text-muted">
            Оформление применяется сразу и сохраняется на устройстве.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setTheme("dark");
              }}
              className={`flex-1 rounded-2xl border py-3 text-sm font-semibold transition ${
                theme === "dark"
                  ? "border-accent bg-accent/20 text-white ring-1 ring-accent"
                  : "border-[#232323] bg-[#232323] text-muted hover:text-white"
              }`}
            >
              Тёмная
            </button>
            <button
              type="button"
              onClick={() => {
                setTheme("light");
              }}
              className={`flex-1 rounded-2xl border py-3 text-sm font-semibold transition ${
                theme === "light"
                  ? "border-accent bg-accent/20 text-white ring-1 ring-accent"
                  : "border-[#232323] bg-[#232323] text-muted hover:text-white"
              }`}
            >
              Светлая
            </button>
          </div>
        </Overlay>
      ) : null}

      {exportOpen ? (
        <Overlay title="Экспорт тренировок" onClose={() => setExportOpen(false)}>
          {sessionHistory.isPending ? (
            <p className="text-sm text-muted">Загрузка списка…</p>
          ) : lastTenSessions.length === 0 ? (
            <p className="text-sm text-muted">Пока нет завершённых тренировок.</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted">
                Последние {String(lastTenSessions.length)} записей. Отметьте
                нужные или экспортируйте все.
              </p>
              <ul className="mb-4 max-h-[40vh] space-y-2 overflow-y-auto">
                {lastTenSessions.map((s) => {
                  const title = sessionExportPlanTitle(s, planNames);
                  const date = s.completed_at
                    ? new Date(s.completed_at).toLocaleString("ru-RU", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";
                  return (
                    <li
                      key={s.session_id}
                      className="flex items-start gap-3 rounded-xl border border-[#232323] bg-[#232323]/40 px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 accent-accent"
                        checked={Boolean(exportSelected[s.session_id])}
                        onChange={(e) => {
                          setExportSelected((prev) => ({
                            ...prev,
                            [s.session_id]: e.target.checked,
                          }));
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {title}
                        </p>
                        <p className="text-xs text-muted">{date}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {exportError ? (
                <p className="mb-2 text-sm text-rose-400">{exportError}</p>
              ) : null}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={
                    exportBusy || !Object.values(exportSelected).some(Boolean)
                  }
                  onClick={() => void runExportSelected()}
                  className="w-full rounded-2xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-45"
                >
                  {exportBusy ? "Готовлю файл…" : "Экспортировать выбранные"}
                </button>
                <button
                  type="button"
                  disabled={exportBusy || lastTenSessions.length === 0}
                  onClick={() => void runExportAll()}
                  className="w-full rounded-2xl border border-[#232323] py-3 text-sm font-semibold text-white disabled:opacity-45"
                >
                  Экспортировать все
                </button>
                <button
                  type="button"
                  disabled={exportBusy || lastTenSessions.length === 0}
                  onClick={() => {
                    const all: Record<string, boolean> = {};
                    for (const s of lastTenSessions) {
                      all[s.session_id] = true;
                    }
                    setExportSelected(all);
                  }}
                  className="w-full rounded-2xl border border-[#232323]/80 py-2.5 text-xs font-semibold text-muted hover:text-white disabled:opacity-45"
                >
                  Выбрать все в списке
                </button>
              </div>
            </>
          )}
        </Overlay>
      ) : null}
    </main>
  );
}
