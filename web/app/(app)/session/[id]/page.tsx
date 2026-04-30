import type { Metadata } from "next";

import { ActiveSession } from "@/components/workout/ActiveSession";

export const metadata: Metadata = {
  title: "Тренировка — IronLog",
  description: "Режим выполнения тренировки",
};

/**
 * Экран активной тренировки по id сессии (журнал выполнения из API).
 */
export default function SessionPage({
  params,
}: {
  params: { id: string };
}) {
  return <ActiveSession sessionId={params.id} />;
}
