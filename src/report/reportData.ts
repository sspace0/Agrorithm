import type { Day, Farm, Result, Scenario } from "../engine/types";
import { CROPS } from "../data/crops";

export const REPORT_HORIZON = { start: "2021-07-01", end: "2024-07-01", label: "1 July 2021 - 30 June 2024" };
export const REPORT_BODY_HEIGHT = 752;
export type ReportSnapshot = Record<string, string | number | boolean | null | undefined>;
export type ReportVegetation = {
  publisher: string; product: string; version: string; doi: string; quality: string;
  note: string; retrieved: string; status?: string; period?: string;
  latitude?: number; longitude?: number;
  spatialSupport: { pixelSizeM: number; shape: number[]; coordinates: number[][][]; nativeCRS?: string; nativeBounds?: number[] };
  observations: { date: string; ndvi: number | null; validPixels: number; totalPixels: number; coverage: number; item: string; source: string; windowHash?: string }[];
  failures: { item: string; reason: string }[];
};
export interface AgrorithmReportProps {
  farm: Farm; scenario: Scenario; results: Result[]; weatherSource: string;
  weather: Day[]; veg: ReportVegetation | null; modelVersion: string;
  weatherCoordinates?: { lat: number; lon: number; matching: boolean };
  uiSnapshot?: ReportSnapshot; generatedAt?: string; brandName?: string;
  /** A local development/review surface; normal app integration leaves this false. */
  preview?: boolean;
}
export const display = (value: unknown, unit = "") => value === null || value === undefined || value === "" ? "Unknown" : typeof value === "number" ? `${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value)}${unit}` : String(value);
export const percent = (n: number | null) => n === null ? "Unknown" : `${Math.round(n * 100)}%`;
export function splitText(text: string, limit = 900): string[] {
  if (!text) return ["Not supplied"];
  const chunks: string[] = []; let remaining = text;
  while (remaining.length > limit) {
    const space = remaining.lastIndexOf(" ", limit);
    const cut = space > limit * .55 ? space + 1 : limit;
    chunks.push(remaining.slice(0, cut)); remaining = remaining.slice(cut);
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}
/** Split oversized cell content before measured pagination; every character survives. */
export function splitTableRow(row: string[], limits: number[]): string[][] {
  const cells = row.map((cell, i) => splitText(cell, limits[i] ?? 550));
  return Array.from({ length: Math.max(...cells.map(c => c.length)) }, (_, n) => cells.map(c => c[n] ?? ""));
}
export interface MeasuredItem { height: number; table?: string; headerHeight?: number }
export function packMeasured(items: MeasuredItem[], available = REPORT_BODY_HEIGHT, gap = 22): number[][] {
  const pages: number[][] = []; let page: number[] = [], used = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i], previous = page.length ? items[page[page.length - 1]] : undefined;
    const continued = !!item.table && item.table === previous?.table;
    const addition = item.height + (continued ? 0 : (page.length ? gap : 0) + (item.headerHeight ?? 0));
    if (page.length && used + addition > available) { pages.push(page); page = []; used = 0; }
    const same = !!item.table && page.length > 0 && item.table === items[page[page.length - 1]].table;
    used += item.height + (same ? 0 : (page.length ? gap : 0) + (item.headerHeight ?? 0)); page.push(i);
  }
  if (page.length) pages.push(page);
  const heightOf = (indices: number[]) => indices.reduce((sum, index, j) => {
    const item = items[index], same = !!item.table && j > 0 && item.table === items[indices[j - 1]].table;
    return sum + item.height + (same ? 0 : (j ? gap : 0) + (item.headerHeight ?? 0));
  }, 0);
  // Avoid a nearly empty continuation containing only one short note. Move
  // trailing rows in order while retaining the measured repeated-header cost.
  for (let n = pages.length - 1; n > 0; n--) {
    if (heightOf(pages[n]) > available * .5) continue;
    while (pages[n - 1].length > 1) {
      const previous = pages[n - 1], candidate = [previous.at(-1)!, ...pages[n]];
      if (heightOf(candidate) > available || heightOf(previous.slice(0, -1)) < heightOf(candidate)) break;
      pages[n] = candidate; previous.pop();
    }
  }
  return pages;
}
export function summarizeWeather(weather: Day[]) {
  const sorted = [...weather].sort((a, b) => a.date.localeCompare(b.date));
  const complete = sorted.filter(d => d.min !== null && d.max !== null && d.rain !== null);
  const months = new Map<string, Day[]>();
  for (const d of sorted) { const key = d.date.slice(0, 7); months.set(key, [...(months.get(key) ?? []), d]); }
  return { first: sorted[0]?.date, last: sorted.at(-1)?.date, rows: sorted.length, complete: complete.length,
    months: [...months].map(([month, days]) => {
      const expected = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
      const valid = days.length === expected && days.every(d => d.min !== null && d.max !== null && d.rain !== null);
      return { month, complete: valid, validDays: days.filter(d => d.min !== null && d.max !== null && d.rain !== null).length, expectedDays: expected,
        rain: valid ? days.reduce((sum, d) => sum + d.rain!, 0) : null,
        temperature: valid ? days.reduce((sum, d) => sum + (d.min! + d.max!) / 2, 0) / days.length : null };
    }) };
}
export const cropRegistry = (farm: Farm) => farm.cropTable ?? CROPS;
export function finiteExtent(values: (number | null)[], fallback: [number, number] = [0, 1]): [number, number] {
  const finite = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (!finite.length) return fallback;
  const min = Math.min(...finite), max = Math.max(...finite);
  if (min !== max) return [min, max];
  const padding = Math.max(.5, Math.abs(min) * .01);
  return [Number.isFinite(min - padding) ? min - padding : min, Number.isFinite(max + padding) ? max + padding : max];
}
/** Separate SVG paths at missing values; missing evidence is never drawn as zero. */
export function linePaths(values: (number | null)[], x: (i: number) => number, y: (v: number) => number) {
  const paths: string[] = []; let current = "";
  values.forEach((v, i) => { if (v === null || !Number.isFinite(v)) { if (current) paths.push(current); current = ""; } else current += `${current ? " L" : "M"}${x(i).toFixed(2)},${y(v).toFixed(2)}`; });
  if (current) paths.push(current); return paths;
}
