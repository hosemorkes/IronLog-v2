"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  WorkoutPlanForm,
  planDetailToBuilderExercises,
} from "@/components/workouts/WorkoutPlanForm";
import { useUpdateWorkoutPlan, useWorkoutPlan } from "@/lib/hooks/useWorkouts";

/**
 * Редактирование существующего плана (GET → предзаполнение, PUT → сохранение).
 */
export default function WorkoutPlanEditPage() {
  const router = useRouter();
  const params = useParams();
  const planId = typeof params.id === "string" ? params.id : null;

  const { data: plan, error, isPending } = useWorkoutPlan(planId);
  const updatePlan = useUpdateWorkoutPlan(planId);

  if (!planId) {
    return (
      <div className="flex min-h-full flex-col bg-bg-dark px-4 py-6">
        <p className="text-sm text-muted">Некорректная ссылка.</p>
        <Link
          href="/workouts"
          className="mt-4 text-sm font-semibold text-accent"
        >
          К списку планов
        </Link>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="flex min-h-full flex-col bg-bg-dark">
        <header className="border-b border-[#232323] px-5 py-3.5">
          <div className="h-7 w-40 animate-pulse rounded-lg bg-[#1a1a1a]" />
        </header>
        <div className="space-y-3 p-5" aria-busy aria-label="Загрузка плана">
          <div className="h-12 animate-pulse rounded-xl bg-[#1a1a1a]" />
          <div className="h-32 animate-pulse rounded-2xl bg-[#1a1a1a]" />
          <div className="h-32 animate-pulse rounded-2xl bg-[#1a1a1a]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-full flex-col bg-bg-dark px-4 py-6">
        <p className="rounded-xl border border-rose-500/35 px-4 py-4 text-sm text-rose-300">
          {(error as Error).message}
        </p>
        <Link
          href="/workouts"
          className="mt-4 text-sm font-semibold text-accent"
        >
          К списку планов
        </Link>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex min-h-full flex-col bg-bg-dark px-4 py-6">
        <p className="text-sm text-muted">План не найден.</p>
        <Link
          href="/workouts"
          className="mt-4 text-sm font-semibold text-accent"
        >
          К списку планов
        </Link>
      </div>
    );
  }

  if (plan.assigned_by_trainer) {
    return (
      <div className="flex min-h-full flex-col bg-bg-dark px-4 py-6">
        <p className="text-sm text-muted">
          План, назначенный тренером, нельзя редактировать.
        </p>
        <Link
          href={`/workouts/${plan.id}`}
          className="mt-4 text-sm font-semibold text-accent"
        >
          Назад к плану
        </Link>
      </div>
    );
  }

  return (
    <WorkoutPlanForm
      key={plan.updated_at}
      defaultName={plan.name}
      defaultItems={planDetailToBuilderExercises(plan)}
      backHref={`/workouts/${plan.id}`}
      pageTitle="Редактировать тренировку"
      submitLabel="Сохранить изменения"
      submitPendingLabel="Сохранение…"
      isSubmitting={updatePlan.isPending}
      onSubmit={async (payload) => {
        await updatePlan.mutateAsync(payload);
        router.push(`/workouts/${plan.id}`);
      }}
    />
  );
}
