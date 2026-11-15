import { ArrowDownRight, ArrowUpRight, Droplets, Leaf, Scale } from "lucide-react";
import { CROPS } from "../data/crops";
import { formatNumber } from "../engine/format";
import { daysBetween } from "../engine/engine";
import { rankingReasons } from "../engine/ranking";
import type { Farm, Result, Scenario } from "../engine/types";
import "./results.css";

const number = (value: number | null, suffix = "") => value === null ? "Unknown" : `${formatNumber(value)}${suffix}`;
export default function RotationComparison({ results, farm, scenario, onInspect }: {
  results: Result[]; farm: Farm; scenario: Scenario; onInspect?: (id: string) => void;
}) {
  const budget = farm.waterLimitMm === null ? null : farm.waterLimitMm * scenario.waterFactor;
  const maximum = Math.max(1, budget ?? 0, ...results.map(r => r.delivered ?? 0));
  const baseline = results.find(r => r.id === "baseline");
  const crops = farm.cropTable ?? CROPS;
  const horizon = daysBetween("2021-07-01", "2024-07-01");
  return <section className="rotation-comparison" aria-labelledby="rotation-comparison-title">
    <div className="results-section-heading"><div><span className="eyebrow"><Scale size={15}/> SAME FIELD · SAME 36 MONTHS</span><h2 id="rotation-comparison-title">Compare your options.</h2></div><p>Jul 2021–Jun 2024 · {number(farm.areaHa, " ha")}<br/>Components first. No predicted yield or profit.</p></div>
    <div className="comparison-cards">{results.map(result => {
      const delta = result.delivered === null || baseline?.delivered == null ? null : result.delivered - baseline.delivered;
      const reasons = rankingReasons(result, scenario);
      return <article className={`comparison-option option-${result.status}`} key={result.id}>
        <header><span className="eyebrow">{result.id === "baseline" ? "YOUR CURRENT SEQUENCE" : "SCENARIO ALTERNATIVE"}</span><h3>{result.name}</h3><span className={`status status-${result.status}`}>{result.status === "feasible" ? "Screening-feasible" : result.status}</span></header>
        <div className="comparison-calendar" aria-label={`${result.name}: aligned crop calendar`}>
          <div className="comparison-years"><span>2021 / 22</span><span>2022 / 23</span><span>2023 / 24</span></div>
          <div className="comparison-calendar-track">{result.sequence.map((planting, index) => <span key={index} className={`calendar-crop calendar-${planting.crop}`} style={{left:`${100*daysBetween("2021-07-01",planting.sow)/horizon}%`,width:`${100*daysBetween(planting.sow,planting.harvest)/horizon}%`}} title={`${crops[planting.crop].name}: ${planting.sow} to ${planting.harvest}`}><span className="sr-only">{crops[planting.crop].name}: {planting.sow} to {planting.harvest}</span></span>)}</div>
          <p>{[...new Set(result.sequence.map(p=>crops[p.crop].name))].join(" · ") || "No crops entered"}</p>
        </div>
        <div className="comparison-water"><span><Droplets size={15}/> Modeled delivered irrigation</span><strong>{number(result.delivered," mm")}</strong><div className="comparison-bar" aria-hidden="true"><i style={{width:`${100*(result.delivered??0)/maximum}%`}}/>{budget!==null&&<b style={{left:`${100*budget/maximum}%`}}/>}</div><small>{budget===null?"Water budget unknown":`Budget: ${number(budget," mm")} · same horizon`}</small>
          {result.id!=="baseline"&&<p className="comparison-delta">{delta === null ? "Difference from baseline unknown" : <>{delta<=0?<ArrowDownRight size={15}/>:<ArrowUpRight size={15}/>} {number(Math.abs(delta)," mm")} {delta<=0?"less":"more"} than baseline</>}</p>}
        </div>
        <dl className="comparison-metrics"><div><dt><Leaf size={14}/> Scheduled live cover</dt><dd>{number(100*result.liveCover,"% of days")}</dd><div className="comparison-cover" aria-hidden="true"><i style={{width:`${100*result.liveCover}%`}}/></div></div><div><dt>Residue-only protection</dt><dd>{number(100*result.residueCover,"% of days")}</dd></div><div><dt>Plant families / legume</dt><dd>{result.families} / {result.legume?"Included":"Absent"}</dd></div><div><dt>Heat / frost exposure</dt><dd>{number(result.heatDays)} / {number(result.frostDays)} days</dd></div></dl>
        <div className="comparison-ranking"><strong>{result.score===null?"Not ranked":`${number(result.score)} / 100 optional index`}</strong>{reasons.length>0?<details><summary>Why is this not ranked?</summary><ul>{reasons.map(reason=><li key={reason}>{reason}</li>)}</ul></details>:<p>{result.pareto?"Non-dominated among feasible choices":"Other feasible choices dominate this option"}. This index reflects your priorities.</p>}</div>
        {onInspect&&<button className="secondary" onClick={()=>onInspect(result.id)}>Inspect sequence <ArrowUpRight size={16}/></button>}
      </article>;
    })}</div>
    <p className="comparison-footnote">Water bars share one scale; the line marks your budget. Live cover is scheduled crop presence, not satellite-measured canopy. A smaller water requirement alone does not establish a better rotation. Missing evidence stays unknown.</p>
  </section>;
}
