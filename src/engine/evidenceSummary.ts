import type { Day } from "./types";

export type VegetationEvidence = {
  publisher: string;
  product: string;
  version: string;
  doi: string;
  retrieved: string;
  quality: string;
  note: string;
  period?: string;
  latitude?: number;
  longitude?: number;
  spatialSupport: { pixelSizeM: number; shape: number[] };
  observations: {
    date: string;
    ndvi: number | null;
    validPixels: number;
    totalPixels: number;
    coverage: number;
    item: string;
    source: string;
  }[];
  failures: { item: string; reason: string }[];
};

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

function dateRange(dates: string[]) {
  const sorted = [...new Set(dates.filter(validDate))].sort();
  return { start: sorted[0] ?? null, end: sorted.at(-1) ?? null };
}

export function summarizeNasaEvidence(
  weather: Day[],
  weatherSource: string,
  vegetation: VegetationEvidence | null,
) {
  const weatherDates = dateRange(weather.map(row => row.date));
  const completeDates = new Set(weather.filter(row => validDate(row.date) &&
    [row.min, row.max, row.rain].every(value => value !== null && value !== -999 && Number.isFinite(value)) &&
    row.min! <= row.max! && row.rain! >= 0).map(row => row.date));
  const source = weatherSource.toLowerCase();
  const weatherOrigin = source.includes("user-import") || source.includes("provenance unverified")
    ? "user" : source.includes("nasa power") ? "nasa" : "unknown";
  const scenes = vegetation?.observations ?? [];
  // A finite ratio alone does not satisfy the shipped sample's QA threshold.
  const accepted = scenes.filter(scene => validDate(scene.date) && scene.ndvi !== null &&
    Number.isFinite(scene.ndvi) && scene.ndvi >= -1 && scene.ndvi <= 1 &&
    scene.totalPixels > 0 && scene.validPixels >= scene.totalPixels * .5 &&
    scene.validPixels <= scene.totalPixels && scene.coverage >= .5 && scene.coverage <= 1);
  return {
    weather: {
      ...weatherDates,
      completeDays: completeDates.size,
      totalDays: new Set(weather.filter(row => validDate(row.date)).map(row => row.date)).size,
      origin: weatherOrigin as "nasa" | "user" | "unknown",
      available: completeDates.size > 0,
    },
    vegetation: {
      ...dateRange(scenes.map(scene => scene.date)),
      acceptedStart: dateRange(accepted.map(scene => scene.date)).start,
      acceptedEnd: dateRange(accepted.map(scene => scene.date)).end,
      scenes: scenes.length,
      acceptedScenes: accepted.length,
      failures: vegetation?.failures.length ?? 0,
      available: accepted.length > 0,
    },
  };
}

export const NASA_RESULT_ROLES = {
  weather: "Daily minimum/maximum temperature and rainfall drive reference evapotranspiration, stage-specific crop ET, the root-zone storage screen, net and delivered irrigation estimates, and historical heat/frost/rainfall-deficit exposure. Changing weather changes these estimates; it does not predict yield.",
  vegetation: "Quality-filtered NDVI provides observed vegetation context and prompts farmer confirmation of live cover. Rotation cover is calculated from entered crop dates and residue assumptions. NDVI does not automatically change the numerical rotation score or identify crops, residue, nutrients or soil carbon.",
} as const;

export const SOIL_HEALTH_PROXY_NOTE = {
  title: "Soil-health proxies, not a soil-health measurement",
  proxies: "Live-cover days, stated residue protection, crop-family diversity and water/temperature exposure are stewardship proxies. Live cover comes from the proposed calendar; residue protection assumes 45 days after a retained-residue harvest. These are scenarios, not satellite-confirmed future cover.",
  limits: "They do not measure organic carbon, nutrient supply, soil structure, infiltration, erosion, biodiversity or long-term soil recovery. A higher proxy value does not guarantee healthier soil or greater yield.",
  next: "Next evidence: dated, depth-specific local soil tests for organic carbon and nutrients, field checks of residue/structure/infiltration, and locally calibrated water parameters. SMAP soil moisture could add coarse regional moisture context after product/depth/quality checks; it is not implemented here and would not measure field water-table depth.",
} as const;
