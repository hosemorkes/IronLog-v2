import { create } from "zustand";

/**
 * Временное UI-состояние экрана активной тренировки (совместимо с несколькими сессиями в табах).
 */
export interface SessionWorkspaceState {
  sessionId: string | null;
  /** Индекс в разложенном массиве шагов. */
  currentStepIndex: number;
  /** Черновые поля ввода перед отправкой одного подхода. */
  repsDraft: string;
  weightDraft: string;
  /** Таймер отдыха активен только после отправки успешных сетов. */
  restActive: boolean;
  restGoalSeconds: number;
  restRemainingSeconds: number;
  elapsedSeconds: number;
  /** Анимировать баннер «Новый рекорд!» один раз после ответа API. */
  prHighlight: boolean;
  /** Выбранное упражнение в режиме без плана. */
  freestyleExerciseId: string | null;

  setSessionContext: (
    sid: string,
    initial: Partial<Pick<SessionWorkspaceState, "currentStepIndex" | "repsDraft" | "weightDraft">>,
  ) => void;
  patchDrafts: (reps: string, weight: string) => void;
  setStepIndex: (n: number) => void;
  stepBy: (delta: number, max: number) => void;

  beginRestAfterSet: (goalSeconds: number) => void;
  tickRestOneSecond: () => void;
  skipRest: () => void;

  bumpElapsedOneSecond: () => void;

  pulsePrBanner: () => void;
  clearPrBanner: () => void;

  setFreestyleExerciseId: (id: string | null) => void;
  reset: () => void;
}

const INITIAL: Omit<
  SessionWorkspaceState,
  | "setSessionContext"
  | "patchDrafts"
  | "setStepIndex"
  | "stepBy"
  | "beginRestAfterSet"
  | "tickRestOneSecond"
  | "skipRest"
  | "bumpElapsedOneSecond"
  | "pulsePrBanner"
  | "clearPrBanner"
  | "setFreestyleExerciseId"
  | "reset"
> = {
  sessionId: null,
  currentStepIndex: 0,
  repsDraft: "",
  weightDraft: "",
  restActive: false,
  restGoalSeconds: 90,
  restRemainingSeconds: 0,
  elapsedSeconds: 0,
  prHighlight: false,
  freestyleExerciseId: null,
};

export const useSessionWorkspace = create<SessionWorkspaceState>((set, get) => ({
  ...INITIAL,

  setSessionContext: (sid, initial = {}) =>
    set(() => ({
      ...INITIAL,
      sessionId: sid,
      currentStepIndex: initial.currentStepIndex ?? 0,
      repsDraft: initial.repsDraft ?? "",
      weightDraft: initial.weightDraft ?? "",
    })),

  patchDrafts: (reps, weight) => set({ repsDraft: reps, weightDraft: weight }),
  setStepIndex: (n) => set({ currentStepIndex: Math.max(0, n) }),
  stepBy: (delta, max) =>
    set((s) => ({
      currentStepIndex: Math.min(
        max,
        Math.max(0, s.currentStepIndex + delta),
      ),
    })),

  beginRestAfterSet: (goalSeconds) =>
    set({
      restActive: true,
      restGoalSeconds: Math.max(0, goalSeconds),
      restRemainingSeconds: Math.max(0, goalSeconds),
    }),

  tickRestOneSecond: () =>
    set((state) => {
      if (!state.restActive || state.restRemainingSeconds <= 0) {
        return { restActive: false, restRemainingSeconds: 0 };
      }
      const next = state.restRemainingSeconds - 1;
      if (next <= 0) {
        return {
          restActive: false,
          restRemainingSeconds: 0,
        };
      }
      return { restRemainingSeconds: next };
    }),

  skipRest: () =>
    set({
      restActive: false,
      restRemainingSeconds: 0,
    }),

  bumpElapsedOneSecond: () =>
    set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),

  pulsePrBanner: () => set({ prHighlight: true }),
  clearPrBanner: () => set({ prHighlight: false }),

  setFreestyleExerciseId: (id) => set({ freestyleExerciseId: id }),

  reset: () => set(() => ({ ...INITIAL })),
}));
