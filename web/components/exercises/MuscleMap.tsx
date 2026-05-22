"use client";

import { labelsToRegions, type BodyRegion } from "@/lib/exercise/muscleRegions";

interface MuscleMapProps {
  /** Основные мышцы (muscle_group). */
  primaryMuscles: readonly string[];
  /** Вторичные мышцы (secondary_muscles). */
  secondaryMuscles: readonly string[];
}

type MuscleId =
  | "chest"
  | "traps"
  | "lats_left"
  | "lats_right"
  | "deltoid_left"
  | "deltoid_right"
  | "biceps_left"
  | "biceps_right"
  | "triceps_left"
  | "triceps_right"
  | "forearm_left"
  | "forearm_right"
  | "abs"
  | "quad_left"
  | "quad_right"
  | "hamstring_left"
  | "hamstring_right"
  | "glute_left"
  | "glute_right"
  | "calf_left"
  | "calf_right";

const PRIMARY_FILL = "#7c6ef2";
const PRIMARY_OPACITY = 0.85;
const SECONDARY_FILL = "#5ba3d9";
const SECONDARY_OPACITY = 0.5;
const DEFAULT_FILL = "#2a2a2a";
const MUSCLE_STROKE = "#383838";
const OUTLINE_STROKE = "#444444";

const REGION_TO_MUSCLES: Record<BodyRegion, readonly MuscleId[]> = {
  chest: ["chest"],
  back: ["traps", "lats_left", "lats_right"],
  shoulders: ["deltoid_left", "deltoid_right"],
  arms: [
    "biceps_left",
    "biceps_right",
    "triceps_left",
    "triceps_right",
    "forearm_left",
    "forearm_right",
  ],
  legs: [
    "quad_left",
    "quad_right",
    "hamstring_left",
    "hamstring_right",
    "calf_left",
    "calf_right",
    "glute_left",
    "glute_right",
  ],
  core: ["abs"],
  cardio: [],
};

interface MusclePathDef {
  id: MuscleId;
  d: string;
}

/** Анатомические зоны — вид спереди, viewBox 0 0 200 400. */
const MUSCLE_PATHS: readonly MusclePathDef[] = [
  {
    id: "traps",
    d: "M80 66 C86 70 93 74 100 77 C107 74 114 70 120 66 C116 60 108 58 100 59 C92 58 84 60 80 66Z",
  },
  {
    id: "lats_left",
    d: "M66 96 C56 112 52 134 54 158 C56 172 60 182 66 188 C70 172 72 150 70 128 C68 108 66 96 66 96Z",
  },
  {
    id: "lats_right",
    d: "M134 96 C144 112 148 134 146 158 C144 172 140 182 134 188 C130 172 128 150 130 128 C132 108 134 96 134 96Z",
  },
  {
    id: "chest",
    d: "M100 83 C86 85 72 92 64 104 C60 114 62 126 70 134 C80 140 90 138 100 134 C110 138 120 140 130 134 C138 126 140 114 136 104 C128 92 114 85 100 83Z",
  },
  {
    id: "deltoid_left",
    d: "M66 80 C50 82 38 92 32 106 C30 114 34 120 42 122 C52 120 60 112 66 102 C68 92 66 80 66 80Z",
  },
  {
    id: "deltoid_right",
    d: "M134 80 C150 82 162 92 168 106 C170 114 166 120 158 122 C148 120 140 112 134 102 C132 92 134 80 134 80Z",
  },
  {
    id: "biceps_left",
    d: "M42 122 C36 132 32 148 34 164 C36 174 42 180 48 178 C52 166 54 150 52 136 C50 126 42 122 42 122Z",
  },
  {
    id: "triceps_left",
    d: "M52 124 C58 120 64 124 66 136 C68 152 66 168 62 180 C56 178 50 168 48 154 C46 140 48 128 52 124Z",
  },
  {
    id: "biceps_right",
    d: "M158 122 C164 132 168 148 166 164 C164 174 158 180 152 178 C148 166 146 150 148 136 C150 126 158 122 158 122Z",
  },
  {
    id: "triceps_right",
    d: "M148 124 C142 120 136 124 134 136 C132 152 134 168 138 180 C144 178 150 168 152 154 C154 140 152 128 148 124Z",
  },
  {
    id: "forearm_left",
    d: "M34 176 C28 192 26 212 28 230 C30 244 36 252 42 254 C46 238 48 218 46 198 C44 184 38 176 34 176Z",
  },
  {
    id: "forearm_right",
    d: "M166 176 C172 192 174 212 172 230 C170 244 164 252 158 254 C154 238 152 218 154 198 C156 184 162 176 166 176Z",
  },
  {
    id: "abs",
    d: "M100 136 C86 138 76 146 72 158 C70 170 72 182 78 192 C86 198 94 196 100 192 C106 196 114 198 122 192 C128 182 130 170 128 158 C124 146 114 138 100 136Z",
  },
  {
    id: "glute_left",
    d: "M72 192 C66 198 60 208 62 218 C66 224 74 222 80 214 C82 206 78 196 72 192Z",
  },
  {
    id: "glute_right",
    d: "M128 192 C134 198 140 208 138 218 C134 224 126 222 120 214 C118 206 122 196 128 192Z",
  },
  {
    id: "quad_left",
    d: "M80 214 C70 224 64 244 62 266 C60 286 64 304 72 312 C82 306 88 286 90 264 C92 242 88 224 80 214Z",
  },
  {
    id: "hamstring_left",
    d: "M72 312 C66 306 62 292 64 276 C66 260 70 248 76 240 C80 254 82 272 80 290 C78 304 76 312 72 312Z",
  },
  {
    id: "quad_right",
    d: "M120 214 C130 224 136 244 138 266 C140 286 136 304 128 312 C118 306 112 286 110 264 C108 242 112 224 120 214Z",
  },
  {
    id: "hamstring_right",
    d: "M128 312 C134 306 138 292 136 276 C134 260 130 248 124 240 C120 254 118 272 120 290 C122 304 124 312 128 312Z",
  },
  {
    id: "calf_left",
    d: "M72 312 C66 328 64 346 66 362 C68 376 72 384 78 386 C82 372 84 354 82 336 C80 320 76 312 72 312Z",
  },
  {
    id: "calf_right",
    d: "M128 312 C134 328 136 346 134 362 C132 376 128 384 122 386 C118 372 116 354 118 336 C120 320 124 312 128 312Z",
  },
];

function regionsToMuscleSets(
  primaryLabels: readonly string[],
  secondaryLabels: readonly string[],
): { primary: Set<MuscleId>; secondary: Set<MuscleId>; cardio: boolean } {
  const primaryRegions = labelsToRegions(primaryLabels);
  const secondaryRegions = labelsToRegions(secondaryLabels);

  const primary = new Set<MuscleId>();
  const secondary = new Set<MuscleId>();

  for (const region of primaryRegions) {
    for (const muscle of REGION_TO_MUSCLES[region]) {
      primary.add(muscle);
    }
  }

  for (const region of secondaryRegions) {
    for (const muscle of REGION_TO_MUSCLES[region]) {
      if (!primary.has(muscle)) {
        secondary.add(muscle);
      }
    }
  }

  const cardio =
    primaryRegions.has("cardio") || secondaryRegions.has("cardio");

  return { primary, secondary, cardio };
}

function muscleStyle(
  id: MuscleId,
  primary: Set<MuscleId>,
  secondary: Set<MuscleId>,
): { fill: string; opacity: number } {
  if (primary.has(id)) {
    return { fill: PRIMARY_FILL, opacity: PRIMARY_OPACITY };
  }
  if (secondary.has(id)) {
    return { fill: SECONDARY_FILL, opacity: SECONDARY_OPACITY };
  }
  return { fill: DEFAULT_FILL, opacity: 1 };
}

/**
 * Анатомическая карта мышц (вид спереди) с подсветкой по muscle_group / secondary_muscles.
 */
export function MuscleMap({ primaryMuscles, secondaryMuscles }: MuscleMapProps) {
  const { primary, secondary, cardio } = regionsToMuscleSets(
    primaryMuscles,
    secondaryMuscles,
  );

  return (
    <div className="relative flex flex-col items-center justify-center px-4 py-4">
      {cardio ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-4 rounded-[50%] bg-accent/10 blur-xl"
        />
      ) : null}
      <svg
        viewBox="0 0 200 400"
        height={200}
        width={100}
        fill="none"
        className="relative z-[1] overflow-visible"
        role="img"
        aria-label="Схема задействованных мышц"
      >
        {/* Силуэт: голова, шея, кисти, колени, стопы */}
        <ellipse
          cx={100}
          cy={32}
          rx={19}
          ry={23}
          fill={DEFAULT_FILL}
          stroke={OUTLINE_STROKE}
          strokeWidth={0.8}
        />
        <path
          d="M89 54 C89 60 89 66 91 70 L109 70 C111 66 111 60 111 54 C107 56 93 56 89 54Z"
          fill={DEFAULT_FILL}
          stroke={OUTLINE_STROKE}
          strokeWidth={0.8}
        />
        <ellipse
          cx={42}
          cy={256}
          rx={7}
          ry={9}
          fill={DEFAULT_FILL}
          stroke={OUTLINE_STROKE}
          strokeWidth={0.6}
        />
        <ellipse
          cx={158}
          cy={256}
          rx={7}
          ry={9}
          fill={DEFAULT_FILL}
          stroke={OUTLINE_STROKE}
          strokeWidth={0.6}
        />
        <ellipse
          cx={78}
          cy={312}
          rx={6}
          ry={5}
          fill={DEFAULT_FILL}
          stroke={OUTLINE_STROKE}
          strokeWidth={0.5}
        />
        <ellipse
          cx={122}
          cy={312}
          rx={6}
          ry={5}
          fill={DEFAULT_FILL}
          stroke={OUTLINE_STROKE}
          strokeWidth={0.5}
        />
        <path
          d="M70 382 C66 390 70 396 76 396 L84 396 C88 390 86 384 80 382Z"
          fill={DEFAULT_FILL}
          stroke={OUTLINE_STROKE}
          strokeWidth={0.6}
        />
        <path
          d="M130 382 C134 390 130 396 124 396 L116 396 C112 390 114 384 120 382Z"
          fill={DEFAULT_FILL}
          stroke={OUTLINE_STROKE}
          strokeWidth={0.6}
        />

        {/* Мышечные группы */}
        {MUSCLE_PATHS.map(({ id, d }) => {
          const style = muscleStyle(id, primary, secondary);
          return (
            <path
              key={id}
              d={d}
              fill={style.fill}
              fillOpacity={style.opacity}
              stroke={MUSCLE_STROKE}
              strokeWidth={0.6}
            />
          );
        })}

        {/* Рельеф пресса */}
        <path
          d="M100 148 L100 188 M88 156 L112 156 M86 168 L114 168 M88 180 L112 180"
          stroke={MUSCLE_STROKE}
          strokeWidth={0.4}
          opacity={0.45}
        />

        {/* Контур фигуры */}
        <path
          d="M100 77 C112 80 124 88 130 100 C134 112 132 126 128 140 C124 160 120 182 116 204 C110 232 104 262 100 292 C96 322 94 352 96 382"
          stroke={OUTLINE_STROKE}
          strokeWidth={0.8}
          fill="none"
          opacity={0.35}
        />
        <path
          d="M66 102 C54 122 48 154 44 188 C40 222 38 254 42 256"
          stroke={OUTLINE_STROKE}
          strokeWidth={0.8}
          fill="none"
          opacity={0.35}
        />
        <path
          d="M134 102 C146 122 152 154 156 188 C160 222 162 254 158 256"
          stroke={OUTLINE_STROKE}
          strokeWidth={0.8}
          fill="none"
          opacity={0.35}
        />

        {/* Легенда */}
        <rect
          x={24}
          y={368}
          width={10}
          height={10}
          rx={2}
          fill={PRIMARY_FILL}
          fillOpacity={PRIMARY_OPACITY}
        />
        <text
          x={40}
          y={377}
          fontSize={9}
          fill="#888888"
          fontFamily="system-ui, sans-serif"
        >
          основная
        </text>
        <rect
          x={24}
          y={384}
          width={10}
          height={10}
          rx={2}
          fill={SECONDARY_FILL}
          fillOpacity={SECONDARY_OPACITY}
        />
        <text
          x={40}
          y={393}
          fontSize={9}
          fill="#888888"
          fontFamily="system-ui, sans-serif"
        >
          вторичная
        </text>
      </svg>
    </div>
  );
}
