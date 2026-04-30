"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";

import { RestTimer } from "@/components/workout/RestTimer";
import { formatDuration } from "@/lib/formatDuration";
import {
  cumulativeVolumeKg,
  findFirstIncompleteStepIndex,
} from "@/lib/session/stepProgress";
import {
  flattenPlanToSteps,
  type WorkoutFlatStep,
} from "@/lib/session/buildSteps";
import { usePlanForSession } from "@/lib/hooks/usePlanForSession";
import { useSessionWebSocket } from "@/lib/hooks/useSessionWebSocket";
import {
  useCompleteWorkout,
  useLogSessionSet,
  useSessionDetail,
} from "@/lib/hooks/useWorkoutSession";
import { useSessionWorkspace } from "@/lib/store/sessionWorkspaceStore";
import { useExercises } from "@/lib/hooks/useExercises";

interface ActiveSessionProps {
  /** UUID сессии из маршрута. */
  sessionId: string;
}

/** Сколько упражнений показать в свободном режиме выбора. */
const FREESTYLE_OPTIONS_LIMIT = 40;

/** Подпись для карточки упражнения. */
function exerciseCardTitle(step: WorkoutFlatStep | null): string {
  if (!step) return "—";
  return step.exercise.name_ru.trim() || step.exercise.name;
}

/**
 * Интерфейс активной тренировки по плану или в свободном режиме.
 */
export function ActiveSession({ sessionId }: ActiveSessionProps) {
  useSessionWebSocket();
  const router = useRouter();

  const { data: detail, isLoading, isError, error } = useSessionDetail(sessionId);
  const planQuery = usePlanForSession(detail?.plan_id ?? undefined);
  const exercisesPicker = useExercises({ muscleGroup: null, search: "" });

  const logSet = useLogSessionSet(sessionId);
  const completeWorkout = useCompleteWorkout(sessionId);

  const workspace = useSessionWorkspace();
  const initRef = useRef<string | null>(null);

  const steps = useMemo(() => {
    const planRows = planQuery.data?.exercises ?? [];
    if (planRows.length === 0) return [];
    return flattenPlanToSteps(planRows);
  }, [planQuery.data?.exercises]);

  /** Режим с шаблонными шагами. */
  const hasPlanSteps = steps.length > 0;

  const exerciseOptions = useMemo(() => {
    const flat = exercisesPicker.data?.pages.flat() ?? [];
    return flat.slice(0, FREESTYLE_OPTIONS_LIMIT);
  }, [exercisesPicker.data?.pages]);

  const activePlanStep =
    hasPlanSteps && steps[workspace.currentStepIndex]
      ? steps[workspace.currentStepIndex]
      : null;

  const freestyleNextSetNum = useMemo(() => {
    if (!workspace.freestyleExerciseId || !detail?.sets?.length) {
      return workspace.freestyleExerciseId ? 1 : 1;
    }
    const sameExercise = detail.sets.filter(
      (s) => s.exercise_id === workspace.freestyleExerciseId,
    );
    const maxSet = Math.max(0, ...sameExercise.map((s) => s.set_num));
    return maxSet + 1;
  }, [detail?.sets, workspace.freestyleExerciseId]);

  /** Инициализация Zustand когда известна сессия и (если нужно) план. */
  useEffect(() => {
    if (!detail) return;
    /** Ждём план, если сессия от него зависит — иначе шагов нет ошибочной «свободы». */
    if (detail.plan_id && planQuery.isLoading) return;

    const marker = `${detail.session_id}-${String(steps.length)}`;
    if (initRef.current === marker) return;
    initRef.current = marker;

    const logged = detail.sets.map((s) => ({
      exercise_id: s.exercise_id,
      set_num: s.set_num,
    }));

    if (steps.length > 0) {
      const first = findFirstIncompleteStepIndex(steps, logged);
      const s0 = steps[first];
      useSessionWorkspace.setState(() => ({
        sessionId: detail.session_id,
        currentStepIndex: first,
        repsDraft: s0 !== undefined ? String(s0.target_reps) : "",
        weightDraft:
          s0 !== undefined &&
          s0.target_weight_kg !== null &&
          s0.target_weight_kg !== ""
            ? String(s0.target_weight_kg)
            : "",
        freestyleExerciseId: null,
      }));
      return;
    }

    useSessionWorkspace.setState(() => ({
      sessionId: detail.session_id,
      currentStepIndex: 0,
      repsDraft: "10",
      weightDraft: "",
      freestyleExerciseId: null,
    }));
  }, [detail, planQuery.isLoading, steps]);

  /** Подстройка черновика при переходе стрелками между шагами. */
  useEffect(() => {
    const step = steps[workspace.currentStepIndex];
    if (!step) return;
    useSessionWorkspace.setState(() => ({
      repsDraft: String(step.target_reps),
      weightDraft:
        step.target_weight_kg !== null && step.target_weight_kg !== ""
          ? String(step.target_weight_kg)
          : "",
    }));
  }, [workspace.currentStepIndex, steps]);

  /** Секундомер активной зоны. */
  useEffect(() => {
    const t = window.setInterval(() => {
      useSessionWorkspace.getState().bumpElapsedOneSecond();
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  /** Таймер отдыха. */
  useEffect(() => {
    if (!workspace.restActive) return;
    const t = window.setInterval(() => {
      useSessionWorkspace.getState().tickRestOneSecond();
    }, 1000);
    return () => window.clearInterval(t);
  }, [workspace.restActive]);

  /** Автосбор «рекорда» после ответа. */
  useEffect(() => {
    if (!workspace.prHighlight) return;
    const t = window.setTimeout(() => {
      useSessionWorkspace.getState().clearPrBanner();
    }, 4500);
    return () => window.clearTimeout(t);
  }, [workspace.prHighlight]);

  const completedProgress = useMemo(() => {
    if (!detail?.sets || steps.length === 0) return 0;
    let c = 0;
    for (const st of steps) {
      const done = detail.sets.some(
        (l) =>
          l.exercise_id === st.exercise_id && l.set_num === st.set_num,
      );
      if (done) c += 1;
    }
    return Math.min(steps.length, c);
  }, [detail?.sets, steps]);

  const tonnageKg = detail?.sets?.length ? cumulativeVolumeKg(detail.sets) : 0;

  const nextStepPreview = useMemo(() => {
    if (!hasPlanSteps) return null;
    const nx = workspace.currentStepIndex + 1;
    return steps[nx] ?? null;
  }, [hasPlanSteps, steps, workspace.currentStepIndex]);

  const handleSubmitSet = () => {
    const ws = useSessionWorkspace.getState();
    const repsParsed = Number.parseInt(ws.repsDraft.replace(",", "."), 10);
    const weightRaw = ws.weightDraft.replace(",", ".").trim();
    const weightParsed =
      weightRaw === ""
        ? null
        : Number.parseFloat(ws.weightDraft.replace(",", "."));
    if (!Number.isFinite(repsParsed) || repsParsed < 1) {
      window.alert("Укажите корректное число повторов");
      return;
    }
    const exerciseId: string | null =
      activePlanStep?.exercise_id ?? ws.freestyleExerciseId ?? null;
    if (!exerciseId) {
      window.alert("Выберите упражнение");
      return;
    }
    const setNum =
      activePlanStep !== null ? activePlanStep.set_num : freestyleNextSetNum;

    const stepIndexSnapshot = ws.currentStepIndex;

    logSet.mutate(
      {
        exercise_id: exerciseId,
        set_num: setNum,
        reps_done: repsParsed,
        weight_kg:
          weightParsed !== null && Number.isFinite(weightParsed)
            ? String(weightParsed)
            : null,
      },
      {
        onSuccess: (res) => {
          const store = useSessionWorkspace.getState();
          if (res.is_pr) store.pulsePrBanner();

          const restedFrom =
            hasPlanSteps && steps[stepIndexSnapshot] !== undefined
              ? (steps[stepIndexSnapshot]?.rest_after_seconds ?? 90)
              : 90;
          store.beginRestAfterSet(Math.max(restedFrom, 0));

          if (hasPlanSteps && stepIndexSnapshot < steps.length - 1) {
            store.setStepIndex(stepIndexSnapshot + 1);
          }
        },
      },
    );
  };

  const handleFinishAsk = () => {
    const ok =
      typeof window !== "undefined"
        ? window.confirm("Завершить тренировку и сохранить объём на сервере?")
        : false;
    if (!ok) return;
    completeWorkout.mutate(undefined, {
      onSuccess: () => {
        router.replace("/dashboard");
      },
      onError: (e) =>
        typeof window !== "undefined"
          ? window.alert(e.message)
          : {},
    });
  };

  const freestyleTitle = useMemo(() => {
    if (!workspace.freestyleExerciseId) return "Выберите упражнение";
    const picked = exerciseOptions.find(
      (x) => x.id === workspace.freestyleExerciseId,
    );
    return picked?.name_ru.trim() || picked?.name || "—";
  }, [exerciseOptions, workspace.freestyleExerciseId]);

  if (isLoading || !detail) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <p className="text-sm text-muted">Загрузка тренировки…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-2 px-4 py-12 text-center text-sm">
        <p className="text-red-400">
          {error instanceof Error ? error.message : "Не удалось загрузить сессию"}
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-xl border border-accent/40 px-4 py-2 text-accent"
        >
          На главную
        </Link>
      </div>
    );
  }

  if (detail.completed_at) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16">
        <p className="text-6xl mb-4">🏆</p>
        <h2 className="mb-6 text-xl font-bold text-white">Тренировка завершена</h2>
        <dl className="grid w-full grid-cols-2 gap-3 text-center text-sm">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <dt className="text-muted">Объём</dt>
            <dd className="text-lg font-bold text-accent">
              {detail.total_volume_kg ?? "—"} кг
            </dd>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <dt className="text-muted">Подходов</dt>
            <dd className="text-lg font-bold text-white">{detail.sets.length}</dd>
          </div>
        </dl>
        <Link
          href="/dashboard"
          className="mt-8 w-full rounded-2xl bg-accent py-4 text-center text-base font-bold text-white"
        >
          Готово
        </Link>
      </div>
    );
  }

  /** Текущий экран упражнения для отображения (план или выбранный в свободном режиме). */
  const displayExercise = activePlanStep?.exercise
    ?? (workspace.freestyleExerciseId &&
        exerciseOptions.find((e) => e.id === workspace.freestyleExerciseId));

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-bg-dark pb-28">
      {workspace.prHighlight && (
        <div className="border-b border-amber-500/45 bg-amber-500/20 px-4 py-2 text-center text-sm font-bold text-amber-200">
          Новый рекорд!
        </div>
      )}

      <header className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-3">
        <div className="min-w-0">
          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            В процессе
          </p>
          <h1 className="truncate text-base font-bold text-white">
            {planQuery.data?.name ?? "Тренировка"}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-accent/20 px-3 py-1 text-sm font-semibold text-accent">
            ⏱ {formatDuration(workspace.elapsedSeconds)}
          </span>
          <button
            type="button"
            className="rounded-full border border-red-500/50 bg-red-500/15 px-3 py-1 text-[13px] font-semibold text-red-400"
            onClick={handleFinishAsk}
          >
            Завершить
          </button>
        </div>
      </header>

      <section className="shrink-0 px-5 pb-3">
        <div className="h-1 overflow-hidden rounded bg-white/10">
          <div
            className="h-full rounded bg-accent transition-[width] duration-500"
            style={{
              width:
                hasPlanSteps && steps.length > 0
                  ? `${(completedProgress / Math.max(steps.length, 1)) * 100}%`
                  : "0%",
            }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted">
          <span>
            {hasPlanSteps
              ? `Шаг ${Math.min(workspace.currentStepIndex + 1, steps.length)} из ${steps.length}`
              : "Свободный режим"}
          </span>
          <span>{planQuery.data?.exercises?.length ?? 0} упр.</span>
        </div>
      </section>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4">
        {/* Карточка текущего упражнения */}
        <article className="flex gap-3 rounded-2xl border border-border bg-surface p-3">
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-border bg-[#252525]">
            {displayExercise && "image_url" in displayExercise && displayExercise.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayExercise.image_url ?? ""}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="flex h-full w-full items-center justify-center text-2xl text-muted"
              >
                ◎
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 py-1">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
              Сейчас
            </p>
            <h2 className="truncate text-lg font-bold leading-tight">
              {!hasPlanSteps
                ? freestyleTitle
                : exerciseCardTitle(activePlanStep)}
            </h2>
            {displayExercise && (
              <p className="mt-1 line-clamp-2 text-[12px] text-muted">
                {displayExercise.muscle_group} ·{" "}
                {"equipment" in displayExercise ? displayExercise.equipment : ""}
              </p>
            )}
          </div>
        </article>

        {!hasPlanSteps && (
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-muted">
              Упражнение
            </span>
            <select
              value={workspace.freestyleExerciseId ?? ""}
              onChange={(e) =>
                useSessionWorkspace
                  .getState()
                  .setFreestyleExerciseId(e.target.value || null)
              }
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-white"
            >
              <option value="">Выберите…</option>
              {exerciseOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name_ru.trim() || e.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Управление между шагами (только для плана) */}
        {hasPlanSteps && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex-1 rounded-xl border border-border py-3 text-white disabled:opacity-40"
              disabled={
                workspace.currentStepIndex <= 0 || workspace.restActive
              }
              onClick={() =>
                useSessionWorkspace.getState().stepBy(-1, steps.length - 1)
              }
            >
              ← Назад
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl border border-border py-3 text-white disabled:opacity-40"
              disabled={
                workspace.currentStepIndex >= steps.length - 1 ||
                workspace.restActive
              }
              onClick={() =>
                useSessionWorkspace.getState().stepBy(1, steps.length - 1)
              }
            >
              Вперёд →
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-muted">
              Повторы
            </span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-white"
              value={workspace.repsDraft}
              onChange={(e) =>
                useSessionWorkspace.setState({ repsDraft: e.target.value })
              }
              disabled={
                workspace.restActive || Boolean(detail.completed_at ?? false)
              }
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-muted">
              Вес, кг
            </span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="—"
              className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-white"
              value={workspace.weightDraft}
              onChange={(e) =>
                useSessionWorkspace.setState({ weightDraft: e.target.value })
              }
              disabled={
                workspace.restActive ||
                Boolean(detail.completed_at ?? false)
              }
            />
          </label>
        </div>

        {workspace.restActive && workspace.restGoalSeconds > 0 && (
          <RestTimer
            goalSeconds={workspace.restGoalSeconds}
            remainingSeconds={workspace.restRemainingSeconds}
            onSkip={() => useSessionWorkspace.getState().skipRest()}
          />
        )}

        <div className="grid grid-cols-3 gap-2 pb-2 text-center">
          <div className="rounded-xl border border-border bg-surface p-2">
            <p className="text-[13px] font-bold text-accent">
              {formatDuration(workspace.elapsedSeconds)}
            </p>
            <p className="text-[10px] text-muted">время</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-2">
            <p className="text-[13px] font-bold text-accent">
              {new Intl.NumberFormat("ru-RU").format(tonnageKg)} кг
            </p>
            <p className="text-[10px] text-muted">тоннаж*</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-2">
            <p className="text-[13px] font-bold text-accent">
              {completedProgress}/{steps.length || "—"}
            </p>
            <p className="text-[10px] text-muted">шаги</p>
          </div>
        </div>
        <p className="pb-14 text-[10px] text-muted">
          *Приближённо: суммируются только подходы с указанным весом согласно API.
        </p>

        {nextStepPreview && (
          <div className="flex items-start gap-2 rounded-xl border border-border bg-surface/80 p-3 text-left text-[13px]">
            <span className="text-muted">›</span>
            <div>
              <div className="text-[10px] text-muted">Следующее</div>
              <div className="font-semibold text-white">
                {exerciseCardTitle(nextStepPreview)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Нижняя CTA — как большая «кнопка» в прототипе */}
      <div className="fixed bottom-24 left-0 right-0 z-10 px-4">
        <button
          type="button"
          disabled={
            logSet.isPending ||
            workspace.restActive ||
            !!detail.completed_at
          }
          onClick={handleSubmitSet}
          className="w-full rounded-2xl bg-emerald-600 py-4 text-[16px] font-bold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-muted/60"
        >
          {workspace.restActive
            ? "Идёт отдых…"
            : activePlanStep
              ? `Подход выполнен (${activePlanStep.set_num})`
              : "Подход выполнен"}
        </button>
        {logSet.isError && (
          <p className="mt-2 text-center text-[12px] text-red-400">
            {logSet.error.message}
          </p>
        )}
      </div>
    </div>
  );
}
