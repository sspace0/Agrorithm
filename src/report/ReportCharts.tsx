import type { Farm, Result } from "../engine/types";
import { cropRegistry, finiteExtent, linePaths, REPORT_HORIZON, summarizeWeather, type ReportVegetation } from "./reportData";
const ink = "#173d32", gold = "#b29650", grid = "#d8dfd1";

export function WaterChart({ results }: { results: Result[] }) {
  const max = Math.max(1, ...results.flatMap(r => [r.netIrrigation ?? 0, r.delivered ?? 0]));
  return <svg className="agr-chart" viewBox={`0 0 1728 ${Math.max(230, results.length * 104 + 70)}`} role="img" aria-label="Net and delivered irrigation requirements in millimetres">
    <text x="0" y="25" className="agr-svg-title">Water requirement, across the same horizon</text>
    {results.map((r, i) => { const y = 80 + i * 104; return <g key={r.id}><text x="0" y={y + 18}>{r.name}</text>
      {r.delivered === null ? <text x="440" y={y + 18}>Unknown - missing evidence</text> : <><rect x="440" y={y - 5} width={1120 * r.delivered / max} height="25" rx="4" fill={ink} /><text x={Math.min(1630, 456 + 1120 * r.delivered / max)} y={y + 16}>{Math.round(r.delivered).toLocaleString()} mm</text></>}
      {r.netIrrigation !== null && <rect x="440" y={y + 28} width={1120 * r.netIrrigation / max} height="15" rx="3" fill={gold} />}</g>; })}
    <rect x="440" y={results.length * 104 + 55} width="20" height="14" fill={ink} /><text x="471" y={results.length * 104 + 70}>Delivered, including efficiency assumption</text><rect x="1120" y={results.length * 104 + 55} width="20" height="14" fill={gold} /><text x="1151" y={results.length * 104 + 70}>Net at the root zone</text>
  </svg>;
}

export function WeatherChart({ months }: { months: ReturnType<typeof summarizeWeather>["months"] }) {
  const selected = months.filter(m => m.month >= REPORT_HORIZON.start.slice(0, 7) && m.month < REPORT_HORIZON.end.slice(0, 7));
  const maxRain = Math.max(100, ...selected.map(m => m.rain ?? 0));
  const [lo, hi] = finiteExtent(selected.map(m => m.temperature), [0, 40]);
  const x = (i: number) => 90 + (i + .5) * 1500 / Math.max(1, selected.length);
  const yTemp = (v: number) => 310 - (v - lo) / (hi - lo) * 210;
  return <svg className="agr-chart" viewBox="0 0 1728 420" role="img" aria-label="Historical monthly rainfall and mean daily temperature">
    <text x="0" y="28" className="agr-svg-title">Historical weather in the comparison horizon</text>
    {[0, .5, 1].map(t => <g key={t}><line x1="90" x2="1590" y1={310 - t * 210} y2={310 - t * 210} stroke={grid} /><text x="8" y={318 - t * 210}>{Math.round(maxRain * t)} mm</text><text x="1610" y={318 - t * 210}>{(lo + (hi - lo) * t).toFixed(0)} °C</text></g>)}
    {selected.map((m, i) => m.rain === null ? <text key={m.month} x={x(i)} y="339" textAnchor="middle">×</text> : <rect key={m.month} x={x(i) - 12} y={310 - m.rain / maxRain * 210} width="24" height={m.rain / maxRain * 210} fill="#8baf9b" />)}
    {linePaths(selected.map(m => m.temperature), x, yTemp).map((d, i) => <path key={i} d={d} stroke={ink} strokeWidth="4" fill="none" />)}
    {selected.filter((_, i) => i % 6 === 0).map(m => <text key={m.month} x={x(selected.indexOf(m))} y="371" textAnchor="middle">{m.month}</text>)}
    <text x="90" y="410">Bars: rainfall (left axis) · Line: mean of daily Tmin/Tmax (right axis) · ×: incomplete month; no interpolation</text>
  </svg>;
}

export function VegetationChart({ veg }: { veg: ReportVegetation }) {
  const obs = veg.observations, x = (i: number) => 90 + i * 1500 / Math.max(1, obs.length - 1), y = (v: number) => 300 - (v + 1) / 2 * 240;
  return <svg className="agr-chart" viewBox="0 0 1728 405" role="img" aria-label="Observed quality-filtered HLS NDVI time series">
    <text x="0" y="28" className="agr-svg-title">Vegetation signal, with missingness visible</text>
    {[-1, -.5, 0, .5, 1].map(v => <g key={v}><line x1="90" x2="1590" y1={y(v)} y2={y(v)} stroke={grid} /><text x="10" y={y(v) + 8}>{v.toFixed(1)}</text></g>)}
    {linePaths(obs.map(o => o.ndvi), x, y).map((d, i) => <path key={i} d={d} stroke={ink} strokeWidth="4" fill="none" />)}
    {obs.map((o, i) => o.ndvi === null ? <text key={`${o.date}-${i}`} x={x(i)} y="328" textAnchor="middle" fill="#8f7856">×</text> : <circle key={`${o.date}-${i}`} cx={x(i)} cy={y(o.ndvi)} r="5" fill={ink} />)}
    {obs.filter((_, i) => i % Math.max(1, Math.floor(obs.length / 6)) === 0).map(o => <text key={o.date} x={x(obs.indexOf(o))} y="365" textAnchor="middle">{o.date}</text>)}
    <text x="90" y="400">NDVI is dimensionless. Crosses and broken lines preserve missing or rejected observations.</text>
  </svg>;
}

export function CalendarChart({ result, farm, offset = 0 }: { result: Result; farm: Farm; offset?: number }) {
  const crops = cropRegistry(farm), seq = result.sequence.slice(offset, offset + 8), start = Date.parse(REPORT_HORIZON.start), end = Date.parse(REPORT_HORIZON.end), left = 300, width = 1390;
  const x = (s: string) => left + Math.max(0, Math.min(1, (Date.parse(s) - start) / (end - start))) * width;
  const colors = ["#a9c6a4", "#719879", "#315b42", "#b3a677"];
  return <svg className="agr-chart" viewBox={`0 0 1728 ${seq.length * 49 + 140}`} role="img" aria-label={`Aligned crop-stage calendar for ${result.name}`}>
    {Array.from({ length: 37 }, (_, i) => { const d = new Date(Date.UTC(2021, 6 + i, 1)).toISOString().slice(0, 10); return <g key={d}><line x1={x(d)} x2={x(d)} y1="35" y2={seq.length * 49 + 53} stroke={i % 6 === 0 ? "#b6c6b1" : "#e3e7dc"} />{i % 6 === 0 && <text x={x(d)} y="25" textAnchor={i === 36 ? "end" : "start"}>{d.slice(0, 7)}</text>}</g>; })}
    {seq.map((p, i) => { const crop = crops[p.crop], length = x(p.harvest) - x(p.sow); let cumulative = 0; return <g key={`${p.crop}-${offset + i}`}><text x="0" y={72 + i * 49}>{crop.name.length > 23 ? crop.name.slice(0, 21) + "…" : crop.name}</text>{crop.stages.map((fraction, j) => { const rect = <rect key={j} x={x(p.sow) + length * cumulative} y={52 + i * 49} width={Math.max(0, length * fraction)} height="28" fill={colors[j]} />; cumulative += fraction; return rect; })}</g>; })}
    {colors.map((color, i) => <g key={color}><rect x={left + i * 280} y={seq.length * 49 + 86} width="21" height="17" fill={color} /><text x={left + i * 280 + 32} y={seq.length * 49 + 102}>{["Initial", "Development", "Mid-season", "Late-season"][i]}</text></g>)}
  </svg>;
}
