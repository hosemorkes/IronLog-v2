"use client";

import { useMemo } from "react";
import Model, { IExerciseData, type Muscle } from "react-body-highlighter";

import { labelsToRegions, type BodyRegion } from "@/lib/exercise/muscleRegions";

interface MuscleMapProps {
  /** Основные мышцы (muscle_group). */
  primaryMuscles: readonly string[];
  /** Вторичные мышцы (secondary_muscles). */
  secondaryMuscles: readonly string[];
}

const HIGHLIGHTED_COLORS = ["#5ba3d9", "#7c6ef2"] as const;
const BODY_COLOR = "#2a2a2a";

const MUSCLE_GROUP_MAP: Record<Exclude<BodyRegion, "cardio">, readonly Muscle[]> = {
  chest: ["chest"],
  back: ["trapezius", "upper-back", "lower-back"],
  shoulders: ["front-deltoids", "back-deltoids"],
  arms: ["biceps", "triceps", "forearm"],
  legs: ["quadriceps", "hamstring", "calves", "gluteal", "adductor"],
  core: ["abs", "obliques"],
};

function regionsToMuscles(regions: Set<BodyRegion>): Muscle[] {
  const muscles = new Set<Muscle>();

  for (const region of regions) {
    if (region === "cardio") {
      continue;
    }
    for (const muscle of MUSCLE_GROUP_MAP[region]) {
      muscles.add(muscle);
    }
  }

  return [...muscles];
}

function buildExerciseData(
  primaryMuscles: readonly string[],
  secondaryMuscles: readonly string[],
): IExerciseData[] {
  const primary = regionsToMuscles(labelsToRegions(primaryMuscles));
  const secondarySet = new Set(
    regionsToMuscles(labelsToRegions(secondaryMuscles)),
  );
  const primarySet = new Set(primary);

  for (const muscle of primarySet) {
    secondarySet.delete(muscle);
  }

  const data: IExerciseData[] = [];

  if (primary.length > 0) {
    data.push({
      name: "primary",
      muscles: primary,
      frequency: 2,
    });
  }

  const secondary = [...secondarySet];
  if (secondary.length > 0) {
    data.push({
      name: "secondary",
      muscles: secondary,
      frequency: 1,
    });
  }

  return data;
}

/**
 * Карта мышц (front + back) через react-body-highlighter.
 */
export function MuscleMap({ primaryMuscles, secondaryMuscles }: MuscleMapProps) {
  const exerciseData = useMemo(
    () => buildExerciseData(primaryMuscles, secondaryMuscles),
    [primaryMuscles, secondaryMuscles],
  );

  const primaryRegions = labelsToRegions(primaryMuscles);
  const secondaryRegions = labelsToRegions(secondaryMuscles);
  const cardio =
    primaryRegions.has("cardio") || secondaryRegions.has("cardio");

  return (
    <div className="relative flex flex-col items-center justify-center px-4 py-4">
      {cardio ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-4 rounded-[50%] bg-accent/10 blur-xl"
        />
      ) : null}

      <div
        className="relative z-[1] flex items-center justify-center gap-1 rounded-2xl bg-[#141414] px-3 py-2"
        role="img"
        aria-label="Схема задействованных мышц"
      >
        <Model
          data={exerciseData}
          bodyColor={BODY_COLOR}
          highlightedColors={[...HIGHLIGHTED_COLORS]}
          style={{ width: "120px" }}
        />
        <Model
          data={exerciseData}
          type="posterior"
          bodyColor={BODY_COLOR}
          highlightedColors={[...HIGHLIGHTED_COLORS]}
          style={{ width: "120px" }}
        />
      </div>

      <div className="relative z-[1] mt-3 flex items-center gap-4 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: HIGHLIGHTED_COLORS[1], opacity: 0.85 }}
          />
          основная
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: HIGHLIGHTED_COLORS[0], opacity: 0.5 }}
          />
          вторичная
        </span>
      </div>
    </div>
  );
}
