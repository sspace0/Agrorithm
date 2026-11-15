import type { Result, Scenario } from "./types";

/** Explain the existing engine gate without inventing an alternative score. */
export function rankingReasons(result: Result, scenario: Scenario): string[] {
  if (result.score !== null) return [];
  const reasons: string[] = [];
  if (result.constraints.length) reasons.push(...result.constraints);
  if (result.unknowns.length) reasons.push(...result.unknowns);
  if (Object.values(scenario.weights).reduce((sum, value) => sum + value, 0) === 0)
    reasons.push("All priority weights are zero. Set at least one priority to calculate the optional index.");
  if (result.delivered === null || result.heatDays === null || result.frostDays === null)
    reasons.push("A required water or weather-exposure value is missing. Missing dimensions cannot receive a favorable score.");
  return [...new Set(reasons.length ? reasons : ["This option has not met every requirement for the optional index. Review its feasibility and missing evidence."])];
}
