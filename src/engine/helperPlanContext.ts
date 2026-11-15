import type { Day, Farm, Result, Scenario } from "./types";
import type { HelperAnswer, HelperSection } from "./agrorithmHelper";
import { formatNumber } from "./format";
import { rankingReasons } from "./ranking";
export { rankingReasons } from "./ranking";

/** A local, explicit snapshot: this is computed plan evidence, never language-model output. */
export interface HelperPlanContext {
  farmName: string;
  areaHa: number;
  deliveredWaterLimitMm: number | null;
  deliveryEfficiency: number | null;
  scenario: Scenario;
  results: Result[];
  weatherStart: string | null;
  weatherEnd: string | null;
  weatherSource: string;
  weatherMatchesFarm: boolean;
}

export function createHelperPlanContext(
  farm: Farm,
  scenario: Scenario,
  results: Result[],
  weather: Day[],
  weatherSource: string,
  weatherMatchesFarm: boolean,
): HelperPlanContext {
  return structuredClone({
    farmName: farm.name,
    areaHa: farm.areaHa,
    deliveredWaterLimitMm: farm.waterLimitMm,
    deliveryEfficiency: farm.efficiency,
    scenario,
    results,
    weatherStart: weather[0]?.date ?? null,
    weatherEnd: weather.at(-1)?.date ?? null,
    weatherSource,
    weatherMatchesFarm,
  });
}

const planLinks = [
  { label: "Review side-by-side results", href: "#/studio/tradeoffs" },
  { label: "Review field inputs", href: "#/studio/setup" },
  { label: "Inspect NASA observations", href: "#/studio/evidence" },
];
const shown = (value: number | null, unit: string) => formatNumber(value, unit);

export function answerPlanQuestion(question: string, context?: HelperPlanContext): HelperAnswer | null {
  const ranking = /\b(?:not ranked|unranked|rank(?:ing)?|scores?|weights|pareto)\b/i.test(question);
  const results = /\b(?:my|these|the|our|current|this|plan)\s+(?:plan\s+)?(?:results?|rotations?|sequence|comparison)|\b(?:explain|compare|understand|interpret|summari[sz]e)\s+(?:(?:my|these|the|our|current)\s+)?(?:(?:plan|rotation)\s+)?(?:results?|rotations?|sequence|comparison)|\bexplain (?:my )?plan\b|\bresults?\s+(?:mean|explanation|dashboard)\b/i.test(question);
  if (!ranking && !results) return null;
  if (!context) {
    if (!results && !/\b(?:not ranked|unranked)\b/i.test(question)) return null;
    return {
      kind: "plan-results", title: "Open the result you want to discuss.",
      text: "Use Explain these results beside your plan comparison. That action brings the actual inputs and computed results into this local conversation; I will not guess your field values.",
      links: planLinks,
    };
  }
  const reviewed = /\b(?:current sequence|baseline)\b/i.test(question)
    ? context.results.filter(result => result.id === "baseline")
    : context.results;
  const sections: HelperSection[] = reviewed.map(result => {
    const reasons = rankingReasons(result, context.scenario);
    const waterLimit = context.deliveredWaterLimitMm === null ? null : context.deliveredWaterLimitMm * context.scenario.waterFactor;
    const lines = [
      `Screening status: ${result.status}. ${result.score === null ? "Not ranked." : `Optional index ${formatNumber(result.score)} / 100; this is not a probability of success.`}`,
      `Delivered irrigation estimate: ${shown(result.delivered, " mm")} over July 2021–June 2024; scenario water limit: ${shown(waterLimit, " mm")} over the same horizon. Volume: ${shown(result.volume, " m³")} for ${formatNumber(context.areaHa)} ha.`,
      ...(reasons.length ? [`Why no aggregate rank:\n${reasons.map(reason => `• ${reason}`).join("\n")}`] : [`Pareto comparison: ${result.pareto ? "non-dominated among screening-feasible choices under the compared metrics" : "not marked non-dominated in this snapshot"}. Changing priorities cannot override hard constraints.`]),
      `Crop ET: ${shown(result.etc, " mm")}; effective rainfall: ${shown(result.effectiveRain, " mm")}; net irrigation: ${shown(result.netIrrigation, " mm")}. Delivery efficiency entered: ${shown(context.deliveryEfficiency === null ? null : context.deliveryEfficiency * 100, "%")}. These are different water-accounting quantities.`,
      `Calendar live cover: ${formatNumber(result.liveCover * 100)}%; residue-only cover assumption: ${formatNumber(result.residueCover * 100)}%; ${result.families} crop families; legume ${result.legume ? "included" : "not included"}. These proxies do not measure soil health.`,
      `Historical stage-threshold exposure: ${shown(result.heatDays, " heat days")} and ${shown(result.frostDays, " frost days")}. Weather coverage ${formatNumber(result.coverage * 100)}%; input completeness ${formatNumber(result.completeness * 100)}% (includes stated assumptions, not only measurements).`,
    ];
    if (result.warnings.length) lines.push(`Limits: ${result.warnings.join(" ")}`);
    return { title: result.name, text: lines.join("\n\n"), links: planLinks.slice(0, 1) };
  });
  const perturbed = context.scenario.rainFactor !== 1 || context.scenario.tempDelta !== 0 || context.scenario.kcFactor !== 1 || context.scenario.waterFactor !== 1;
  sections.push({
    title: "Where this explanation comes from",
    text: `${context.weatherSource}. ${context.weatherMatchesFarm ? "Weather point matches the entered farm point." : "The supplied weather point does not match the entered farm point; numerical feasibility remains unresolved."}${perturbed ? " The scenario perturbs historical weather, crop coefficients or supply; it is a hypothetical stress test, not a forecast." : " Historical replay is not a forecast or yield validation."} Entered inputs may include demonstration assumptions. The helper copies actual engine outputs and exact constraints; it does not generate new numerical results. The HLS vegetation series remains a separately dated context record and does not silently become a rotation score.`,
    links:planLinks.slice(2),
  });
  return {
    kind: "plan-results", title: ranking ? "Why this sequence is, or is not, ranked." : "Your results, explained.",
    text: `For ${context.farmName}: these are engine estimates, not direct observations. Weather supplied: ${context.weatherStart ?? "unavailable"}–${context.weatherEnd ?? "unavailable"}. A withheld rank protects against missing evidence or a failed screening rule.`,
    sections,
    links: planLinks,
  };
}
