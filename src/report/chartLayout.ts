export const CHART_WIDTH = 1728;
export const CHART_INSET = 32;
export type TextMeasure = (text: string) => number;
let canvas: HTMLCanvasElement | undefined;

export function chartMeasure(size = 22, weight = 400): TextMeasure {
  if (typeof document === "undefined") return text => Array.from(text).length * size;
  canvas ??= document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return text => Array.from(text).length * size;
  const font = `${weight} ${size}px "Century Gothic", "DM Sans", "Segoe UI", sans-serif`;
  return text => { context.font = font; return context.measureText(text).width; };
}

/** Break long words as well as phrases; never reduce the chart's type size. */
export function wrapChartLabel(text: string, width: number, measure: TextMeasure, maxLines = 3): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" "), lines: string[] = [];
  let current = "";
  for (let word of words) {
    if (current && measure(`${current} ${word}`) <= width) { current += ` ${word}`; continue; }
    if (current) { lines.push(current); current = ""; }
    while (word && measure(word) > width) {
      const chars = Array.from(word); let low = 1, high = chars.length;
      while (low < high) { const mid = Math.ceil((low + high) / 2); if (measure(chars.slice(0, mid).join("")) <= width) low = mid; else high = mid - 1; }
      lines.push(chars.slice(0, low).join("")); word = chars.slice(low).join("");
    }
    current = word;
  }
  if (current || !lines.length) lines.push(current);
  if (lines.length <= maxLines) return lines;
  const visible = lines.slice(0, maxLines); let last = visible.at(-1)!;
  while (last && measure(`${last}...`) > width) last = Array.from(last).slice(0, -1).join("");
  visible[visible.length - 1] = `${last}...`;
  return visible;
}

export function chartNumber(value: number | null, unit: string, width: number, measure = chartMeasure()): string {
  if (value === null || !Number.isFinite(value)) return "Unknown";
  const normal = `${new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value)}${unit}`;
  if (measure(normal) <= width) return normal;
  for (let precision = 2; precision >= 0; precision--) {
    const compact = `${value.toExponential(precision)}${unit}`;
    if (measure(compact) <= width) return compact;
  }
  return `${value.toExponential(0)}${unit}`;
}

export function rangeFraction(value: number, low: number, high: number) {
  if (high === low) return .5;
  const difference = high - low;
  const fraction = Number.isFinite(difference) ? (value - low) / difference : (value / 2 - low / 2) / (high / 2 - low / 2);
  return Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : .5;
}

export const validNumber = (value: number | null): value is number => value !== null && Number.isFinite(value);
