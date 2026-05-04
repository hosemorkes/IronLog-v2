"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useFinishSession, useLogSet } from "@/lib/hooks/useSessions";
import {
  useWorkoutPlan,
  type PlanDetailExerciseRef,
  type WorkoutPlanDetail,
} from "@/lib/hooks/useWorkouts";

import type { ExerciseDetailDto } from "@/lib/types/session";

const REST_FALLBACK_SEC = 90;
const RING_R = 26;
const RING_C = 2 * Math.PI * RING_R;
const PROGRESS_TTL_MS = 24 * 60 * 60 * 1000;

function getStorage(): Storage | null {
  return typeof window !== "undefined" ? localStorage : null;
}

function workoutProgressKey(sessionId: string): string {
  return `workout_progress_${sessionId}`;
}

function clearWorkoutProgress(sessionId: string): void {
  getStorage()?.removeItem(workoutProgressKey(sessionId));
}

interface SessionStep {
  exerciseId: string;
  setNum: number;
  targetReps: number;
  targetWeightKg: number | null;
  restSeconds: number;
  exercise: ExerciseDetailDto;
}

function parseTargetWeight(
  v: string | number | null | undefined,
): number | null {
  if (v === null || v === undefined || v === "") {
    return null;
  }
  const n = typeof v === "string" ? Number.parseFloat(v) : v;
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
}

function planExerciseRefToDetail(ex: PlanDetailExerciseRef): ExerciseDetailDto {
  return {
    id: ex.id,
    name: ex.name,
    name_ru: ex.name_ru,
    muscle_group: ex.muscle_group,
    secondary_muscles: null,
    equipment: ex.equipment,
    difficulty: ex.difficulty,
    description: null,
    technique_steps: null,
    image_url: ex.image_url,
    gif_url: null,
    created_by: null,
    is_active: true,
    created_at: "",
  };
}

function buildStepsFromPlan(plan: WorkoutPlanDetail): SessionStep[] {
  const sorted = [...plan.exercises].sort((a, b) => a.order - b.order);
  const out: SessionStep[] = [];
  for (const row of sorted) {
    const rest = row.rest_seconds ?? REST_FALLBACK_SEC;
    const tw = parseTargetWeight(row.weight_kg);
    const exercise = planExerciseRefToDetail(row.exercise);
    for (let i = 1; i <= row.sets; i++) {
      out.push({
        exerciseId: exercise.id,
        setNum: i,
        targetReps: row.reps,
        targetWeightKg: tw,
        restSeconds: rest,
        exercise,
      });
    }
  }
  return out;
}

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function exerciseTitle(ex: ExerciseDetailDto): string {
  return ex.name_ru.trim() || ex.name;
}

async function startSessionDirect(
  planId: string,
): Promise<{ sessionId: string }> {
  const res = await apiFetch("/user/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan_id: planId }),
  });
  if (res.ok) {
    const data = (await res.json()) as { session_id: string };
    return { sessionId: data.session_id };
  }
  if (res.status === 409) {
    const data = (await res.json()) as {
      detail?: { active_session_id?: string } | string;
    };
    const d = data?.detail;
    if (
      typeof d === "object" &&
      d !== null &&
      typeof (d as { active_session_id?: unknown }).active_session_id ===
        "string"
    ) {
      return {
        sessionId: (d as { active_session_id: string }).active_session_id,
      };
    }
  }
  throw new Error("Не удалось начать тренировку");
}

/**
 * Активная тренировка по плану: `id` в URL — plan_id.
 */
export default function ActiveSessionPage() {
  const params = useParams();
  const router = useRouter();
  const planId = typeof params.id === "string" ? params.id : null;

  const { data: plan, isPending: planPending } = useWorkoutPlan(planId);
  const planIdRef = useRef(planId);
  planIdRef.current = planId;

  const steps = useMemo(
    () => (plan ? buildStepsFromPlan(plan) : []),
    [plan],
  );

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [startSettled, setStartSettled] = useState(false);

  useEffect(() => {
    const id = planIdRef.current;
    if (!id) {
      return;
    }
    void startSessionDirect(id)
      .then(({ sessionId: sid }) => {
        setSessionId(sid);
        setStartError(null);
      })
      .catch((err: unknown) => {
        setSessionId(null);
        setStartError(
          err instanceof Error ? err.message : "Не удалось начать тренировку",
        );
      })
      .finally(() => {
        setStartSettled(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- один POST при монте; planId через ref
  }, []);

  const [elapsed, setElapsed] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completedSets, setCompletedSets] = useState(0);
  const [tonnageDone, setTonnageDone] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const [restRemaining, setRestRemaining] = useState(0);

  const [weightDraft, setWeightDraft] = useState("");
  const [repsDraft, setRepsDraft] = useState("");

  const logSet = useLogSet(sessionId);
  const finishSession = useFinishSession(sessionId);

  const curStep = steps[currentIdx];
  const totalSteps = steps.length;
  const restGoal = curStep?.restSeconds ?? REST_FALLBACK_SEC;

  const navigateComplete = useCallback(
    (sid: string) => {
      const name = plan?.name ?? "Тренировка";
      if (!planId) {
        return;
      }
      router.push(
        `/session/${planId}/complete?session_id=${encodeURIComponent(sid)}&planName=${encodeURIComponent(name)}`,
      );
    },
    [plan?.name, planId, router],
  );

  const runFinish = useCallback(async () => {
    if (!sessionId) {
      return;
    }
    await finishSession.mutateAsync(sessionId);
    clearWorkoutProgress(sessionId);
    navigateComplete(sessionId);
  }, [finishSession, navigateComplete, sessionId]);

  useLayoutEffect(() => {
    if (!sessionId || totalSteps === 0) {
      return;
    }
    const raw = getStorage()?.getItem(workoutProgressKey(sessionId));
    if (!raw) {
      return;
    }
    try {
      const data = JSON.parse(raw) as {
        currentIdx?: unknown;
        completedSets?: unknown;
        tonnageDone?: unknown;
        savedAt?: unknown;
      };
      if (typeof data.savedAt !== "number") {
        return;
      }
      if (Date.now() - data.savedAt >= PROGRESS_TTL_MS) {
        clearWorkoutProgress(sessionId);
        return;
      }
      const idx =
        typeof data.currentIdx === "number" && Number.isFinite(data.currentIdx)
          ? data.currentIdx
          : 0;
      const done =
        typeof data.completedSets === "number" &&
        Number.isFinite(data.completedSets)
          ? data.completedSets
          : 0;
      const tonn =
        typeof data.tonnageDone === "number" && Number.isFinite(data.tonnageDone)
          ? data.tonnageDone
          : 0;
      const maxIdx = Math.max(0, totalSteps - 1);
      setCurrentIdx(Math.min(Math.max(0, idx), maxIdx));
      setCompletedSets(Math.min(Math.max(0, done), totalSteps));
      setTonnageDone(Math.max(0, tonn));
    } catch {
      /* некорректный JSON */
    }
  }, [sessionId, totalSteps]);

  useEffect(() => {
    if (!sessionId || totalSteps === 0) {
      return;
    }
    getStorage()?.setItem(
      workoutProgressKey(sessionId),
      JSON.stringify({
        currentIdx,
        completedSets,
        tonnageDone,
        savedAt: Date.now(),
      }),
    );
  }, [sessionId, totalSteps, currentIdx, completedSets, tonnageDone]);

  useEffect(() => {
    const iv = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!curStep) {
      return;
    }
    setWeightDraft(
      curStep.targetWeightKg !== null ? String(curStep.targetWeightKg) : "",
    );
    setRepsDraft(String(curStep.targetReps));
  }, [curStep]);

  useEffect(() => {
    if (!restActive) {
      return;
    }
    const iv = window.setInterval(() => {
      setRestRemaining((r) => {
        if (r <= 1) {
          setRestActive(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(iv);
  }, [restActive]);

  const handleCompleteSet = async () => {
    if (restActive || !sessionId || !curStep || logSet.isPending) {
      return;
    }
    const wParsed = Number.parseFloat(weightDraft.replace(",", "."));
    const weightKg =
      Number.isFinite(wParsed) && wParsed > 0 ? wParsed : null;
    const rParsed = Number.parseInt(repsDraft, 10);
    const repsDone = Number.isFinite(rParsed)
      ? Math.max(1, rParsed)
      : Math.max(1, curStep.targetReps);

    await logSet.mutateAsync({
      exercise_id: curStep.exerciseId,
      set_num: curStep.setNum,
      reps_done: repsDone,
      weight_kg: weightKg,
    });

    const vol = weightKg !== null ? weightKg * repsDone : 0;
    setTonnageDone((t) => t + vol);
    setCompletedSets((c) => c + 1);

    const next = currentIdx + 1;
    if (next >= totalSteps) {
      await runFinish();
      return;
    }
    setCurrentIdx(next);
    setRestRemaining(curStep.restSeconds);
    setRestActive(true);
  };

  const skipRest = () => {
    setRestActive(false);
    setRestRemaining(0);
  };

  const handleFinishEarly = () => {
    if (
      !window.confirm(
        "Завершить тренировку? Невыполненные подходы не будут сохранены.",
      )
    ) {
      return;
    }
    void runFinish();
  };

  const progressPct =
    totalSteps > 0 ? Math.min(100, (completedSets / totalSteps) * 100) : 0;

  const restPct = restGoal > 0 ? restRemaining / restGoal : 0;
  const ringOffset = RING_C * (1 - restPct);

  const distinctExercises = useMemo(
    () => new Set(steps.map((s) => s.exerciseId)).size,
    [steps],
  );

  if (!planId) {
    return (
      <div className="flex flex-1 flex-col bg-bg-dark p-6">
        <p className="text-sm text-muted">Некорректная ссылка.</p>
        <Link href="/workouts" className="mt-4 text-accent">
          К планам
        </Link>
      </div>
    );
  }

  if (startError) {
    return (
      <div className="flex flex-1 flex-col bg-bg-dark px-6 py-10">
        <p className="text-center text-sm text-rose-300">{startError}</p>
        <p className="mt-3 text-center text-xs text-muted">
          Если проблема не исчезла, откройте главную и начните снова.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 block rounded-2xl bg-accent py-3 text-center font-semibold text-white"
        >
          На главную
        </Link>
        <Link
          href={`/workouts/${planId}`}
          className="mt-3 block text-center text-sm text-accent"
        >
          К плану
        </Link>
      </div>
    );
  }

  if (!startSettled || planPending || !sessionId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-bg-dark px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="mt-4 text-sm text-muted">Подготовка тренировки…</p>
      </div>
    );
  }

  if (totalSteps === 0) {
    return (
      <div className="flex flex-1 flex-col bg-bg-dark px-6 py-10">
        <p className="text-center text-sm text-muted">
          В плане нет упражнений для выполнения.
        </p>
        <Link
          href={`/workouts/${planId}`}
          className="mt-6 block rounded-2xl bg-accent py-3 text-center font-semibold text-white"
        >
          Назад к плану
        </Link>
      </div>
    );
  }

  const planTitle = plan?.name ?? "Тренировка";
  const nextStep = steps[currentIdx + 1];

  return (
    <div className="flex min-h-full flex-1 flex-col overflow-hidden bg-bg-dark pb-28">
      <header className="flex shrink-0 items-start justify-between gap-3 px-5 pb-3 pt-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            В процессе
          </p>
          <h1 className="truncate text-[15px] font-bold text-white">{planTitle}</h1>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
          <div className="rounded-full bg-accent/15 px-3 py-1 text-[13px] font-bold text-accent">
            ⏱ {formatClock(elapsed)}
          </div>
          <button
            type="button"
            onClick={handleFinishEarly}
            disabled={finishSession.isPending}
            className="rounded-full border border-rose-500/40 bg-rose-950/40 px-3 py-1 text-[13px] font-semibold text-rose-300 hover:bg-rose-900/50 disabled:opacity-50"
          >
            Завершить тренировку
          </button>
        </div>
      </header>

      <div className="shrink-0 px-5 pb-3">
        <div className="h-1 overflow-hidden rounded-full bg-[#252525]">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${String(progressPct)}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-muted">
          <span>
            Подход {Math.min(completedSets + 1, totalSteps)} из {totalSteps}
          </span>
          <span>{distinctExercises} упр.</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {restActive ? (
          <div className="mb-4 rounded-2xl border border-accent/35 bg-[#1a1420] px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.55px] text-accent">
                  Отдых
                </p>
                <p className="mt-1 text-[34px] font-extrabold leading-none tracking-tight text-accent">
                  {formatClock(restRemaining)}
                </p>
                <p className="mt-2 text-xs text-muted">Цель: {restGoal}с</p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="relative h-[58px] w-[58px]">
                  <svg
                    width={58}
                    height={58}
                    viewBox="0 0 60 60"
                    className="-rotate-90"
                    aria-hidden
                  >
                    <circle
                      cx={30}
                      cy={30}
                      r={RING_R}
                      fill="none"
                      strokeWidth={4}
                      className="stroke-[#2a2040]"
                    />
                    <circle
                      cx={30}
                      cy={30}
                      r={RING_R}
                      fill="none"
                      strokeWidth={4}
                      strokeLinecap="round"
                      className="stroke-accent transition-[stroke-dashoffset] duration-1000 linear"
                      strokeDasharray={RING_C}
                      strokeDashoffset={ringOffset}
                    />
                  </svg>
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] font-bold text-accent">
                    {Math.round(restPct * 100)}%
                  </span>
                </div>
                <button
                  type="button"
                  onClick={skipRest}
                  className="rounded-full bg-accent/20 px-3 py-1 text-[11px] font-semibold text-accent"
                >
                  Пропустить отдых
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {!restActive && curStep ? (
          <>
            <section className="rounded-2xl border border-[#232323] bg-[#1a1a1a] p-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.55px] text-muted">
                Сейчас · Сет {curStep.setNum}
              </p>
              <h2 className="mx-auto mt-3 max-w-[22ch] text-[22px] font-extrabold leading-tight text-white">
                {exerciseTitle(curStep.exercise)}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {curStep.exercise.muscle_group} · {curStep.exercise.equipment}
              </p>
              <div className="mx-auto mt-5 flex max-w-xs justify-center gap-6 rounded-xl bg-[#252525] py-4">
                <div>
                  <p className="text-[11px] text-muted">План вес</p>
                  <p className="mt-1 text-xl font-bold text-accent">
                    {curStep.targetWeightKg !== null
                      ? `${String(curStep.targetWeightKg)} кг`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted">План повторы</p>
                  <p className="mt-1 text-xl font-bold text-accent">
                    {curStep.targetReps}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-4 space-y-3 rounded-2xl border border-[#232323] bg-[#1a1a1a] p-4">
              <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
                Факт
              </p>
              <label className="block">
                <span className="sr-only">Вес кг</span>
                <input
                  inputMode="decimal"
                  value={weightDraft}
                  onChange={(e) => setWeightDraft(e.target.value)}
                  className="w-full rounded-xl border border-[#232323] bg-[#141414] px-4 py-3 text-center text-2xl font-bold text-white caret-accent outline-none focus:border-accent/50"
                  placeholder="Вес (кг)"
                />
              </label>
              <label className="block">
                <span className="sr-only">Повторы</span>
                <input
                  inputMode="numeric"
                  value={repsDraft}
                  onChange={(e) => setRepsDraft(e.target.value)}
                  className="w-full rounded-xl border border-[#232323] bg-[#141414] px-4 py-3 text-center text-2xl font-bold text-white caret-accent outline-none focus:border-accent/50"
                  placeholder="Повторы"
                />
              </label>
            </section>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { v: formatClock(elapsed), l: "время" },
                {
                  v: `${Math.round(tonnageDone).toLocaleString("ru-RU")} кг`,
                  l: "поднято",
                },
                { v: `${completedSets}/${totalSteps}`, l: "шаги" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="rounded-xl border border-[#232323] bg-[#1a1a1a] py-2.5 text-center"
                >
                  <div className="text-[13px] font-bold text-accent">{s.v}</div>
                  <div className="mt-0.5 text-[10px] text-muted">{s.l}</div>
                </div>
              ))}
            </div>

            {nextStep ? (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#232323] bg-[#1a1a1a] px-3 py-3">
                <span className="text-muted" aria-hidden>
                  →
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted">Следующее</p>
                  <p className="truncate text-[13px] font-semibold text-white">
                    {exerciseTitle(nextStep.exercise)} · сет {nextStep.setNum}
                  </p>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {!restActive && curStep ? (
        <div className="fixed bottom-0 left-0 right-0 border-t border-[#232323] bg-bg-dark p-4 pb-8">
          <button
            type="button"
            onClick={() => void handleCompleteSet()}
            disabled={logSet.isPending || finishSession.isPending}
            className="w-full rounded-2xl bg-emerald-600 py-4 text-base font-bold text-white shadow-lg transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {logSet.isPending ? "Сохранение…" : "Выполнено"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
