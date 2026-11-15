import type { Result, Scenario } from "./types";

export type WaterHeadline = {
  kind: "less" | "same" | "more" | "no-feasible-alternative" | "missing-baseline";
  baseline: Result | null;
  alternative: Result | null;
  differenceMm: number | null;
  percentDifference: number | null;
  feasibleAlternatives: number;
  hypothetical: boolean;
};

const usableWater = (result: Result) => result.delivered !== null && Number.isFinite(result.delivered) && result.delivered >= 0;

/** A water-only comparison of current engine outputs; never a new overall rank. */
export function rotationWaterHeadline(results: Result[], scenario: Scenario): WaterHeadline {
  const baseline = results.find(result => result.id === "baseline") ?? null;
  const feasible = results.filter(result => result.id !== "baseline" && result.status === "feasible" && usableWater(result));
  const alternative = [...feasible].sort((a, b) => a.delivered! - b.delivered! || a.id.localeCompare(b.id))[0] ?? null;
  const hypothetical = scenario.rainFactor !== 1 || scenario.tempDelta !== 0 || scenario.waterFactor !== 1 || scenario.kcFactor !== 1;
  const common = { baseline, alternative, feasibleAlternatives: feasible.length, hypothetical };
  if (!baseline || !usableWater(baseline)) return { ...common, kind: "missing-baseline", differenceMm: null, percentDifference: null };
  if (!alternative) return { ...common, kind: "no-feasible-alternative", differenceMm: null, percentDifference: null };
  const differenceMm = alternative.delivered! - baseline.delivered!;
  return {
    ...common,
    kind: differenceMm < 0 ? "less" : differenceMm > 0 ? "more" : "same",
    differenceMm,
    // A zero baseline has no meaningful percentage denominator.
    percentDifference: baseline.delivered! > 0 ? 100 * differenceMm / baseline.delivered! : null,
  };
}
