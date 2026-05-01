"use client";

import { useRouter } from "next/navigation";

import { WorkoutPlanForm } from "@/components/workouts/WorkoutPlanForm";
import { useCreateWorkoutPlan } from "@/lib/hooks/useWorkouts";

/**
 * Конструктор нового плана тренировки.
 */
export default function WorkoutNewPage() {
  const router = useRouter();
  const createPlan = useCreateWorkoutPlan();

  return (
    <WorkoutPlanForm
      defaultName="Новая тренировка"
      defaultItems={[]}
      backHref="/workouts"
      pageTitle="Новая тренировка"
      submitLabel="Создать"
      submitPendingLabel="Создание…"
      isSubmitting={createPlan.isPending}
      onSubmit={async (payload) => {
        await createPlan.mutateAsync(payload);
        router.push("/workouts");
      }}
    />
  );
}
