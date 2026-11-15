import type { Farm, Result } from "../engine/types";
import { cropRegistry, finiteExtent, linePaths, REPORT_HORIZON, summarizeWeather, type ReportVegetation } from "./reportData";
import { CHART_INSET as inset, CHART_WIDTH as width, chartMeasure, chartNumber, rangeFraction, validNumber, wrapChartLabel } from "./chartLayout";
const ink = "#173d32", gold = "#b29650", grid = "#d8dfd1", right = width - inset;

function ChartText({ text, x, y, maxWidth, maxLines = 3, size = 22, weight = 400, anchor = "start", title = false }: { text: string; x: number; y: number; maxWidth: number; maxLines?: number; size?: number; weight?: number; anchor?: "start" | "middle" | "end"; title?: boolean }) {
  const lines = wrapChartLabel(text, maxWidth, chartMeasure(size, weight), maxLines);
  return <text x={x} y={y} textAnchor={anchor} className={title ? "agr-svg-title" : undefined} style={{ fontSize: size, fontWeight: weight }}><title>{text}</title>{lines.map((line, i) => <tspan key={i} x={x} dy={i ? size * 1.32 : 0}>{line}</tspan>)}</text>;
}

export function WaterChart({ results }: { results: Result[] }) {
  const max = Math.max(1, ...results.flatMap(r => [r.netIrrigation, r.delivered]).filter(validNumber));
  const left = 440, plotWidth = 950, rowsEnd = 94 + results.length * 100, height = rowsEnd + 84;
  return <svg className="agr-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Net and delivered irrigation requirements in millimetres">
    <ChartText text="Water requirement, across the same horizon" x={inset} y={60} maxWidth={width - inset * 2} size={27} weight={700} title />
    {results.map((r, i) => {
      const top = 94 + i * 100, lines = wrapChartLabel(r.name, 350, chartMeasure(), 3), y = top + 37 - (lines.length - 1) * 14.52;
      return <g key={r.id}><ChartText text={r.name} x={inset} y={y} maxWidth={350} maxLines={3} />
        {validNumber(r.delivered) ? <rect x={left} y={top + 10} width={Math.max(0, r.delivered) / max * plotWidth} height="26" rx="4" fill={ink} /> : null}
        <ChartText text={validNumber(r.delivered) ? chartNumber(r.delivered, " mm", 256) : "Unknown - missing evidence"} x={right} y={top + 31} maxWidth={256} maxLines={2} anchor="end" />
        {validNumber(r.netIrrigation) && <rect x={left} y={top + 46} width={Math.max(0, r.netIrrigation) / max * plotWidth} height="16" rx="3" fill={gold} />}
      </g>;
    })}
    <rect x={left} y={rowsEnd + 26} width="20" height="14" fill={ink} /><ChartText text="Delivered, including efficiency assumption" x={left + 32} y={rowsEnd + 43} maxWidth={620} maxLines={1} size={20} />
    <rect x="1120" y={rowsEnd + 26} width="20" height="14" fill={gold} /><ChartText text="Net at the root zone" x={1152} y={rowsEnd + 43} maxWidth={500} maxLines={1} size={20} />
  </svg>;
}

export function WeatherChart({ months }: { months: ReturnType<typeof summarizeWeather>["months"] }) {
  const selected = months.filter(m => m.month >= REPORT_HORIZON.start.slice(0, 7) && m.month < REPORT_HORIZON.end.slice(0, 7));
  const maxRain = Math.max(100, ...selected.map(m => m.rain).filter(validNumber));
  const [low, high] = finiteExtent(selected.map(m => m.temperature), [0, 40]), left = 210, end = 1460, top = 130, bottom = 330;
  const x = (i: number) => left + (i + .5) * (end - left) / Math.max(1, selected.length), y = (v: number) => bottom - rangeFraction(v, low, high) * (bottom - top);
  return <svg className="agr-chart" viewBox={`0 0 ${width} 510`} role="img" aria-label="Historical monthly rainfall and mean daily temperature">
    <ChartText text="Historical weather in the comparison horizon" x={inset} y={60} maxWidth={width - inset * 2} size={27} weight={700} title />
    {[0, .5, 1].map(t => <g key={t}><line x1={left} x2={end} y1={bottom - t * 200} y2={bottom - t * 200} stroke={grid} /><ChartText text={chartNumber(maxRain * t, " mm", left - inset - 20)} x={left - 20} y={bottom - t * 200 + 8} maxWidth={left - inset - 20} maxLines={1} anchor="end" /><ChartText text={chartNumber(low * (1 - t) + high * t, " °C", right - end - 20)} x={end + 20} y={bottom - t * 200 + 8} maxWidth={right - end - 20} maxLines={1} /></g>)}
    {selected.map((m, i) => !validNumber(m.rain) || m.rain < 0 ? <ChartText key={m.month} text="×" x={x(i)} y={359} maxWidth={30} maxLines={1} anchor="middle" /> : <rect key={m.month} x={x(i) - 12} y={bottom - m.rain / maxRain * 200} width="24" height={m.rain / maxRain * 200} fill="#8baf9b" />)}
    {linePaths(selected.map(m => validNumber(m.temperature) ? m.temperature : null), x, y).map((d, i) => <path key={i} d={d} stroke={ink} strokeWidth="4" fill="none" />)}
    {selected.filter((_, i) => i % 6 === 0).map(m => <ChartText key={m.month} text={m.month} x={x(selected.indexOf(m))} y={394} maxWidth={150} maxLines={1} anchor="middle" />)}
    <ChartText text="Bars: rainfall (left axis). Line: mean of daily Tmin/Tmax (right axis). Crosses: incomplete month; no interpolation." x={inset} y={444} maxWidth={width - inset * 2} maxLines={2} size={20} />
  </svg>;
}

export function VegetationChart({ veg }: { veg: ReportVegetation }) {
  const obs = veg.observations, left = 210, end = 1460, y = (v: number) => 320 - (v + 1) / 2 * 200;
  const x = (i: number) => left + (obs.length === 1 ? .5 : i / Math.max(1, obs.length - 1)) * (end - left), values = obs.map(o => validNumber(o.ndvi) && o.ndvi >= -1 && o.ndvi <= 1 ? o.ndvi : null);
  return <svg className="agr-chart" viewBox={`0 0 ${width} 510`} role="img" aria-label="Observed quality-filtered NDVI time series">
    <ChartText text="Vegetation signal, with missingness visible" x={inset} y={60} maxWidth={width - inset * 2} size={27} weight={700} title />
    {[-1, -.5, 0, .5, 1].map(v => <g key={v}><line x1={left} x2={end} y1={y(v)} y2={y(v)} stroke={grid} /><ChartText text={v.toFixed(1)} x={left - 20} y={y(v) + 8} maxWidth={left - inset - 20} maxLines={1} anchor="end" /></g>)}
    {linePaths(values, x, y).map((d, i) => <path key={i} d={d} stroke={ink} strokeWidth="4" fill="none" />)}
    {obs.map((o, i) => values[i] === null ? <ChartText key={`${o.date}-${i}`} text="×" x={x(i)} y={353} maxWidth={30} maxLines={1} anchor="middle" /> : <circle key={`${o.date}-${i}`} cx={x(i)} cy={y(values[i]!)} r="5" fill={ink} />)}
    {obs.filter((_, i) => i % Math.max(1, Math.ceil((obs.length - 1) / 6)) === 0).map(o => <ChartText key={o.date} text={o.date} x={x(obs.indexOf(o))} y={390} maxWidth={155} maxLines={1} anchor="middle" />)}
    <ChartText text="NDVI is dimensionless. Crosses and broken lines preserve missing, rejected or out-of-range observations." x={inset} y={440} maxWidth={width - inset * 2} maxLines={2} size={20} />
  </svg>;
}

export function CalendarChart({ result, farm, offset = 0 }: { result: Result; farm: Farm; offset?: number }) {
  const crops = cropRegistry(farm), seq = result.sequence.slice(offset, offset + 8), start = Date.parse(REPORT_HORIZON.start), end = Date.parse(REPORT_HORIZON.end), left = 430, plotWidth = right - left;
  const rawX = (date: number) => left + (date - start) / (end - start) * plotWidth, boundedX = (date: number) => Math.max(left, Math.min(right, rawX(date)));
  const rows = seq.map(p => { const lines = wrapChartLabel(crops[p.crop].name, 350, chartMeasure(), 2); return { p, lines, height: lines.length > 1 ? 70 : 49 }; });
  const rowEnd = 80 + rows.reduce((sum, r) => sum + r.height, 0), colors = ["#a9c6a4", "#719879", "#315b42", "#b3a677"]; let currentTop = 80;
  return <svg className="agr-chart" viewBox={`0 0 ${width} ${rowEnd + 84}`} role="img" aria-label={`Aligned crop-stage calendar for ${result.name}`}>
    {Array.from({ length: 37 }, (_, i) => { const d = new Date(Date.UTC(2021, 6 + i, 1)), x = boundedX(d.getTime()); return <g key={i}><line x1={x} x2={x} y1="72" y2={rowEnd + 4} stroke={i % 6 === 0 ? "#b6c6b1" : "#e3e7dc"} />{i % 6 === 0 && <ChartText text={d.toISOString().slice(0, 7)} x={x} y={58} maxWidth={160} maxLines={1} anchor={i === 36 ? "end" : "start"} />}</g>; })}
    {rows.map(({ p, lines, height }, i) => {
      const crop = crops[p.crop], top = currentTop, sow = Date.parse(p.sow), harvest = Date.parse(p.harvest); currentTop += height; let cumulative = 0;
      const valid = Number.isFinite(sow) && Number.isFinite(harvest) && harvest > sow && crop.stages.every(v => Number.isFinite(v) && v >= 0) && Math.abs(crop.stages.reduce((a, b) => a + b, 0) - 1) < .02;
      return <g key={`${p.crop}-${offset + i}`}><ChartText text={crop.name} x={inset} y={top + height / 2 + 8 - (lines.length - 1) * 14.52} maxWidth={350} maxLines={2} />{valid ? crop.stages.map((fraction, j) => { const a = boundedX(sow + (harvest - sow) * cumulative); cumulative = Math.min(1, cumulative + fraction); const b = boundedX(sow + (harvest - sow) * cumulative); return <rect key={j} x={a} y={top + (height - 28) / 2} width={Math.max(0, b - a)} height="28" fill={colors[j]} />; }) : <ChartText text="Dates or stage fractions unavailable" x={left} y={top + height / 2 + 8} maxWidth={plotWidth} maxLines={1} />}</g>;
    })}
    {colors.map((color, i) => { const x = left + i * plotWidth / 4; return <g key={color}><rect x={x} y={rowEnd + 26} width="21" height="17" fill={color} /><ChartText text={["Initial", "Development", "Mid-season", "Late-season"][i]} x={x + 32} y={rowEnd + 43} maxWidth={plotWidth / 4 - 40} maxLines={1} /></g>; })}
  </svg>;
}
