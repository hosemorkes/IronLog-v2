"use client";

import { labelsToRegions, type BodyRegion } from "@/lib/exercise/muscleRegions";

interface MuscleMapProps {
  /** Основные мышцы (подсветка акцентом). */
  primaryMuscles: readonly string[];
  /** Дополнительные мышцы (подсветка вторичным цветом). */
  secondaryMuscles: readonly string[];
}

const ACCENT = "#7c6ef2";
const BLUE = "#5ba3d9";

/**
 * Схематичная фигура с подсветкой зон по спискам мышц (аналог MuscleFigure в прототипе).
 */
export function MuscleMap({ primaryMuscles, secondaryMuscles }: MuscleMapProps) {
  const pri = labelsToRegions(primaryMuscles);
  const sec = labelsToRegions(secondaryMuscles);

  function role(region: BodyRegion): "primary" | "secondary" | "none" {
    if (pri.has(region)) {
      return "primary";
    }
    if (sec.has(region)) {
      return "secondary";
    }
    return "none";
  }

  const bodyFill = "#2a2a2a";
  const bodyStroke = "#444";
  const bodyFill2 = "#222";

  function fillCore(): string {
    const r = role("core");
    if (r === "primary") {
      return ACCENT;
    }
    if (r === "secondary") {
      return BLUE;
    }
    return bodyFill2;
  }

  function opacityChestOverlay(): number {
    return role("chest") !== "none" ? 0.75 : 0;
  }

  function fillChestPeek(): string {
    return role("chest") !== "none" ? ACCENT : "transparent";
  }

  function fillBack(): string {
    const b = role("back");
    if (b === "primary") {
      return ACCENT;
    }
    if (b === "secondary") {
      return BLUE;
    }
    return bodyFill;
  }

  function backWholeOpacity(): number {
    const b = role("back");
    if (b !== "none") {
      return 0.55;
    }
    return role("chest") === "secondary" ? 0.2 : 0.45;
  }

  function shoulderEllipse(): { fill: string; opacity: number } {
    const r = role("shoulders");
    if (r === "primary") {
      return { fill: ACCENT, opacity: 0.82 };
    }
    if (r === "secondary") {
      return { fill: BLUE, opacity: 0.55 };
    }
    return { fill: bodyFill, opacity: 1 };
  }

  function armRect(upper: boolean): { fill: string; opacity: number } {
    const r = role("arms");
    if (r === "primary") {
      return { fill: ACCENT, opacity: upper ? 0.82 : 0.65 };
    }
    if (r === "secondary") {
      return { fill: BLUE, opacity: upper ? 0.55 : 0.45 };
    }
    return { fill: bodyFill, opacity: 1 };
  }

  function legRects(upper: boolean): { fill: string; opacity: number } {
    const r = role("legs");
    if (r === "primary") {
      return { fill: ACCENT, opacity: upper ? 0.78 : 0.55 };
    }
    if (r === "secondary") {
      return { fill: BLUE, opacity: upper ? 0.5 : 0.45 };
    }
    return { fill: upper ? bodyFill : bodyFill2, opacity: 1 };
  }

  const cardioGlow = role("cardio") !== "none";
  const sh = shoulderEllipse();
  const arU = armRect(true);
  const arL = armRect(false);
  const lgU = legRects(true);
  const lgL = legRects(false);

  return (
    <div className="relative flex flex-col items-center justify-center px-6 py-8">
      {cardioGlow ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-6 rounded-[50%] bg-accent/10 blur-xl"
        />
      ) : null}
      <svg
        width={150}
        height={228}
        viewBox="0 0 150 228"
        fill="none"
        className="relative z-[1]"
        aria-hidden
      >
        <ellipse
          cx="75"
          cy="22"
          rx="16"
          ry="18"
          fill={bodyFill}
          stroke={bodyStroke}
          strokeWidth={1}
        />
        <rect x="69" y="38" width="12" height="10" rx="3" fill={bodyFill} />
        <path
          d="M45 48 L35 100 L40 130 L110 130 L115 100 L105 48 Z"
          fill={fillBack()}
          stroke={bodyStroke}
          strokeWidth="1"
          opacity={backWholeOpacity()}
        />
        <path
          d="M45 48 L35 100 L40 130 L110 130 L115 100 L105 48 Z"
          fill="none"
          stroke={bodyStroke}
          strokeWidth="1"
        />
        <path
          d="M48 52 L75 62 L102 52 L105 78 L75 84 L45 78 Z"
          fill={fillChestPeek()}
          opacity={opacityChestOverlay()}
        />
        <rect
          x="60"
          y="88"
          width="30"
          height="38"
          rx="4"
          fill={fillCore()}
          opacity={role("core") !== "none" ? 0.85 : 0.92}
        />
        <path
          d="M55 48 L75 54 L95 48 L88 40 L75 42 L62 40 Z"
          fill={
            role("shoulders") === "primary" || role("back") === "primary"
              ? ACCENT
              : role("shoulders") === "secondary" || role("back") === "secondary"
                ? BLUE
                : "transparent"
          }
          opacity={
            role("shoulders") !== "none" || role("back") !== "none" ? 0.55 : 0
          }
        />
        <ellipse
          cx="35"
          cy="58"
          rx="12"
          ry="16"
          fill={sh.fill}
          stroke={bodyStroke}
          strokeWidth="1"
          opacity={sh.opacity}
        />
        <ellipse
          cx="115"
          cy="58"
          rx="12"
          ry="16"
          fill={sh.fill}
          stroke={bodyStroke}
          strokeWidth="1"
          opacity={sh.opacity}
        />
        <rect
          x="24"
          y="72"
          width="14"
          height="28"
          rx="7"
          fill={arU.fill}
          stroke={bodyStroke}
          strokeWidth="1"
          opacity={arU.opacity}
        />
        <rect
          x="112"
          y="72"
          width="14"
          height="28"
          rx="7"
          fill={arU.fill}
          stroke={bodyStroke}
          strokeWidth="1"
          opacity={arU.opacity}
        />
        <rect
          x="22"
          y="100"
          width="12"
          height="24"
          rx="6"
          fill={arL.fill}
          stroke="#383838"
          strokeWidth="1"
          opacity={arL.opacity}
        />
        <rect
          x="116"
          y="100"
          width="12"
          height="24"
          rx="6"
          fill={arL.fill}
          stroke="#383838"
          strokeWidth="1"
          opacity={arL.opacity}
        />
        <rect
          x="46"
          y="130"
          width="24"
          height="48"
          rx="8"
          fill={lgU.fill}
          stroke={bodyStroke}
          strokeWidth="1"
          opacity={lgU.opacity}
        />
        <rect
          x="80"
          y="130"
          width="24"
          height="48"
          rx="8"
          fill={lgU.fill}
          stroke={bodyStroke}
          strokeWidth="1"
          opacity={lgU.opacity}
        />
        <rect
          x="48"
          y="178"
          width="18"
          height="28"
          rx="6"
          fill={lgL.fill}
          stroke="#383838"
          strokeWidth="1"
          opacity={lgL.opacity}
        />
        <rect
          x="84"
          y="178"
          width="18"
          height="28"
          rx="6"
          fill={lgL.fill}
          stroke="#383838"
          strokeWidth="1"
          opacity={lgL.opacity}
        />
        <rect x="4" y="189" width="10" height="10" rx="2" fill={ACCENT} opacity={0.9} />
        <text x="17" y="198" fontSize="9" fill="#888888" fontFamily="system-ui,sans-serif">
          основная
        </text>
        <rect x="4" y="207" width="10" height="10" rx="2" fill={BLUE} opacity={0.7} />
        <text x="17" y="216" fontSize="9" fill="#888888" fontFamily="system-ui,sans-serif">
          вторичная
        </text>
      </svg>
    </div>
  );
}
