/**
 * Сопоставление текстовых меток мышц с областями схемы тела (как в прототипе MuscleFigure).
 */

export type BodyRegion =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "core"
  | "cardio";

const RULES: ReadonlyArray<{ pattern: RegExp; region: BodyRegion }> = [
  { pattern: /груд|chest|pector|pectorals/i, region: "chest" },
  { pattern: /спин|широч|ромб|лат|trap|back|rhomb|lats|rear/i, region: "back" },
  { pattern: /плеч|дельт|shoulder/i, region: "shoulders" },
  {
    pattern: /бицеп|трицеп|рук|предплеч|biceps|triceps|forearm|arms|брахи/i,
    region: "arms",
  },
  {
    pattern: /ног|квадри|ягод|икр|голен|quad|hamstring|calf|leg|ягоди|adduct/i,
    region: "legs",
  },
  { pattern: /пресс|кор|abs|abdomen|core|обратн|разгиб/i, region: "core" },
  { pattern: /кардио|сердечно|cardio|бегов|дорож/i, region: "cardio" },
];

/**
 * Возвращает набор регионов для списка подписей мышц.
 */
export function labelsToRegions(labels: readonly string[]): Set<BodyRegion> {
  const set = new Set<BodyRegion>();
  for (const label of labels) {
    const raw = label.trim();
    if (!raw) {
      continue;
    }
    for (const { pattern, region } of RULES) {
      if (pattern.test(raw)) {
        set.add(region);
      }
    }
  }
  return set;
}
