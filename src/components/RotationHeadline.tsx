import { ArrowUpRight, Droplets } from "lucide-react";
import { formatNumber } from "../engine/format";
import { rotationWaterHeadline } from "../engine/rotationHeadline";
import type { Farm, Result, Scenario } from "../engine/types";
import "./rotation-headline.css";

const percent = (value: number) => Math.abs(value) > 0 && Math.abs(value) < .01 ? "<0.01" : formatNumber(Math.abs(value));

export default function RotationHeadline({ results, farm, scenario, onOpenEvidence }: {
  results: Result[];
  farm: Farm;
  scenario: Scenario;
  onOpenEvidence?: () => void;
}) {
  const summary = rotationWaterHeadline(results, scenario);
  const { baseline, alternative, kind } = summary;
  const bridge = results.find(result => result.id === "cover");
  const bridgeNeedsMore = baseline?.delivered != null && bridge?.delivered != null && Number.isFinite(bridge.delivered) && bridge.delivered > baseline.delivered;
  const difference = summary.percentDifference === null
    ? `${formatNumber(Math.abs(summary.differenceMm ?? 0))} mm`
    : `${percent(summary.percentDifference)}%`;
  const heading = kind === "missing-baseline"
    ? "A baseline is needed to compare irrigation."
    : kind === "no-feasible-alternative"
      ? "No alternative passes the current screens."
      : kind === "same"
        ? `${alternative!.name}: the same modeled irrigation as your baseline.`
        : `${alternative!.name}: ${difference} ${kind} modeled irrigation.`;

  return <section className={`rotation-headline headline-${kind}`} aria-labelledby="rotation-headline-title" data-testid="rotation-headline">
    <div className="rotation-headline-kicker"><span><Droplets size={16} aria-hidden="true"/> YOUR CURRENT CALCULATION</span><span>{summary.hypothetical ? "Hypothetical stress test" : "Historical replay"}</span></div>
    <h2 id="rotation-headline-title">{heading}</h2>
    {alternative && baseline?.delivered != null && kind !== "missing-baseline" && <p className="rotation-headline-numbers"><strong>{formatNumber(baseline.delivered)} mm baseline</strong><span aria-hidden="true">→</span><strong>{formatNumber(alternative.delivered)} mm alternative</strong><span>delivered irrigation · Jul 2021–Jun 2024 · {formatNumber(farm.areaHa)} ha</span></p>}
    <p className="rotation-headline-meaning">{kind === "missing-baseline"
      ? "Enter your current crop sequence and matching weather, soil and irrigation inputs. Missing water estimates stay unknown."
      : kind === "no-feasible-alternative"
        ? "Review each option’s constraints and missing evidence below. A lower water estimate cannot override a failed or unresolved screen."
        : `Lowest modeled irrigation among ${summary.feasibleAlternatives} screening-feasible ${summary.feasibleAlternatives === 1 ? "alternative" : "alternatives"}; this is a water comparison, not an overall recommendation.`}</p>
    {bridgeNeedsMore && <p className="rotation-headline-bridge">The living bridge adds cover-crop evapotranspiration in this calendar; its irrigation estimate depends on the weather and scenario. More live cover does not guarantee a soil-health benefit.</p>}
    <div className="rotation-headline-bottom"><p>Screening of entered assumptions · no forecast, measured saving, yield or profit claim.</p>{onOpenEvidence && <button className="text-action" onClick={onOpenEvidence}>Data &amp; method <ArrowUpRight size={15} aria-hidden="true"/></button>}</div>
  </section>;
}
