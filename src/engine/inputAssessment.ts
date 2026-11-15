import { CROPS } from "../data/crops";
import { PROFILES } from "../data/cropProfiles";
import { ATLAS_CROPS } from "../data/atlas";
import { addDays, date } from "./engine";
import { formatNumber } from "./format";
import type { CropId, Day, Farm, Result, Scenario } from "./types";

export type AssessmentStatus = "within" | "review" | "exceeds" | "unknown";
export type AssessmentCategory = "water" | "soil" | "temperature";
export type AssessmentRow = {
  id: string;
  category: AssessmentCategory;
  label: string;
  context: string;
  inputLabel: string;
  value: number | null;
  unit: string;
  referenceLabel: string;
  referenceMin: number | null;
  referenceMax: number | null;
  referenceText: string;
  difference: number | null;
  differenceText: string;
  status: AssessmentStatus;
  basis: string;
  referenceBasis: string;
  explanation: string;
  sources: { title: string; url: string }[];
};
export type InputAssessment = Record<AssessmentCategory, AssessmentRow[]>;

// Numeric companions to the sourced display references in cropProfiles.ts.
// Their cross-region applicability is retained; none is a local injury limit.
const PH_REFERENCES: Record<string, { range: [number, number]; source: number }> = {
  wheat: { range: [5.5, 7.5], source: 3 },
  maize: { range: [5.5, 7], source: 3 },
  mung: { range: [6.2, 7.2], source: 3 },
  chickpea: { range: [6, 8], source: 0 },
  tomato: { range: [5.5, 7], source: 3 },
  potato: { range: [6, 6.5], source: 2 },
  citrus: { range: [6, 8], source: 3 },
  mango: { range: [5.5, 7.5], source: 0 },
};

export const ASSESSMENT_STATUS: Record<AssessmentStatus, string> = {
  within: "Within comparison",
  review: "Local review needed",
  exceeds: "Budget exceeded",
  unknown: "Not enough evidence",
};

export function distanceOutsideRange(
  value: number | null,
  min: number | null,
  max: number | null,
): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  if (min !== null && value < min) return value - min;
  if (max !== null && value > max) return value - max;
  return 0;
}

function rangeText(min: number | null, max: number | null) {
  return min !== null && max !== null
    ? `${formatNumber(min)}–${formatNumber(max)}`
    : min !== null
      ? `≥ ${formatNumber(min)}`
      : max !== null
        ? `≤ ${formatNumber(max)}`
        : "Unknown";
}

function deviationText(difference: number | null, unit: string) {
  if (difference === null) return "Comparison unavailable";
  if (difference === 0) return "Inside the stated range";
  return `${formatNumber(Math.abs(difference))} ${unit} ${difference > 0 ? "above" : "below"} the reference`;
}

export function assessInputs(
  farm: Farm,
  scenario: Scenario,
  results: Result[],
  weather: Day[] = [],
): InputAssessment {
  const assessment: InputAssessment = { water: [], soil: [], temperature: [] };
  const crops = farm.cropTable ?? CROPS;
  const assumedSoil = /demo|assum|illustrative/i.test(farm.soil.source);
  const assumedManagement = /demo|assum|illustrative/i.test(farm.observations);
  const soilBasis = assumedSoil
    ? "Assumed soil input"
    : "Entered soil input · source not independently verified";
  const cropIds = new Set<string>(
    results.flatMap((result) => result.sequence.map((planting) => planting.crop)),
  );
  if (farm.cropInterest) cropIds.add(farm.cropInterest);
  for (const originalId of cropIds) {
    const id = originalId === "cover" ? "mung" : originalId;
    if (originalId === "cover" && cropIds.has("mung")) continue;
    const reference = PH_REFERENCES[id];
    const profile = PROFILES[id];
    if (!reference || !profile) continue;
    const name = ATLAS_CROPS.find((crop) => crop.id === id)?.name ?? id;
    const [min, max] = reference.range;
    const difference = distanceOutsideRange(farm.soil.ph, min, max);
    assessment.soil.push({
      id: `ph-${id}`,
      category: "soil",
      label: `${name} · soil pH`,
      context: "General crop reference; local cultivar and soil interpretation needed",
      inputLabel: "Your entered soil pH",
      value: farm.soil.ph,
      unit: "pH units",
      referenceLabel: "General growth reference",
      referenceMin: min,
      referenceMax: max,
      referenceText: rangeText(min, max),
      difference,
      differenceText: deviationText(difference, "pH units"),
      status: difference === null ? "unknown" : difference === 0 ? "within" : "review",
      basis: soilBasis,
      referenceBasis: "Sourced general guidance · transfer to Punjab is provisional",
      explanation: `${profile.ph} An out-of-range value prompts local review; this reference does not replace the engine's separately labeled provisional soil screen. Soil source: ${farm.soil.source || "not supplied"}; test date: ${farm.soil.date || "not supplied"}.`,
      sources: [profile.sources[reference.source]],
    });
  }
  const ecDifference = distanceOutsideRange(farm.soil.ec, null, 4);
  assessment.soil.push({
    id: "soil-ec-screen",
    category: "soil",
    label: "Soil salinity · EC",
    context: "Shared demonstration screen, not a crop-specific tolerance curve",
    inputLabel: "Your entered soil EC",
    value: farm.soil.ec,
    unit: "dS/m",
    referenceLabel: "Provisional engine screen",
    referenceMin: null,
    referenceMax: 4,
    referenceText: "≤ 4",
    difference: ecDifference,
    differenceText: deviationText(ecDifference, "dS/m"),
    status: ecDifference === null ? "unknown" : ecDifference > 0 ? "review" : "within",
    basis: soilBasis,
    referenceBasis: "Model assumption · requires a suitable local EC test and crop advice",
    explanation: "The current feasibility engine uses EC ≤ 4 dS/m as a provisional screen. Sampling depth, extraction method, cultivar and soil conditions must be established before interpreting salinity as a crop-specific limit. This is not a laboratory measurement supplied by NASA.",
    sources: [],
  });

  const budget = farm.waterLimitMm === null
    ? null
    : farm.waterLimitMm * scenario.waterFactor;
  for (const result of results) {
    const value = result.delivered;
    const difference = value === null || budget === null ? null : value - budget;
    assessment.water.push({
      id: `water-${result.id}`,
      category: "water",
      label: result.name,
      context: "Same area and 1 July 2021–30 June 2024 horizon",
      inputLabel: "Modeled delivered irrigation",
      value,
      unit: "mm / 36 months",
      referenceLabel: "Your scenario water budget",
      referenceMin: null,
      referenceMax: budget,
      referenceText: formatNumber(budget),
      difference,
      differenceText: difference === null
        ? "Enter a water limit and efficiency; complete weather is required"
        : difference > 0
          ? `${formatNumber(difference)} mm above your budget`
          : `${formatNumber(Math.abs(difference))} mm of budget remains`,
      status: difference === null ? "unknown" : difference > 0 ? "exceeds" : "within",
      basis: "Modeled estimate · current weather input + entered management + assumptions",
      referenceBasis: `Entered/scenario water limit · ${assumedManagement ? "sample management assumption · " : ""}original ${formatNumber(farm.waterLimitMm)} mm × ${formatNumber(scenario.waterFactor)} supply factor`,
      explanation: `This compares delivered irrigation with delivered-water supply, not crop ET with irrigation. The bucket estimate accounts for effective rainfall, storage and delivery efficiency. One millimetre over one hectare is 10 m³. ${result.sequence.some((p) => p.crop === "rice") ? "Rice has missing paddy preparation, ponding, seepage and percolation terms; the displayed value is incomplete and cannot establish rice viability." : "A value below budget establishes only this model comparison; it does not remove other constraints or unknown evidence."}`,
      sources: [{ title: "FAO 56: Crop evapotranspiration and Kc", url: "https://www.fao.org/4/X0490E/x0490e0b.htm" }],
    });
  }

  const weatherByDate = new Map(weather.map((day) => [day.date, day]));
  const modeledIds = new Set<CropId>(results.flatMap((r) => r.sequence.map((p) => p.crop)));
  for (const cropId of modeledIds) {
    const crop = crops[cropId];
    const dates = new Set<string>();
    for (const result of results) {
      for (const planting of result.sequence.filter((p) => p.crop === cropId)) {
        // The engine uses this common horizon; never silently mix newer observations.
        const start = planting.sow < "2021-07-01" ? "2021-07-01" : planting.sow;
        const end = planting.harvest > "2024-07-01" ? "2024-07-01" : planting.harvest;
        try {
          date(start);
          date(end);
        } catch {
          continue;
        }
        for (let day = start; day < end; day = addDays(day, 1)) {
          dates.add(day);
        }
      }
    }
    const valid = [...dates].flatMap((day) => {
      const record = weatherByDate.get(day);
      return record && record.min !== null && record.max !== null ? [record] : [];
    });
    const complete = dates.size > 0 && valid.length === dates.size;
    for (const kind of ["heat", "frost"] as const) {
      const minimum = kind === "frost" ? crop.frost : null;
      const maximum = kind === "heat" ? crop.heat : null;
      const value = !complete
        ? null
        : kind === "heat"
          ? Math.max(...valid.map((d) => d.max! + scenario.tempDelta))
          : Math.min(...valid.map((d) => d.min! + scenario.tempDelta));
      const difference = distanceOutsideRange(value, minimum, maximum);
      assessment.temperature.push({
        id: `temperature-${cropId}-${kind}`,
        category: "temperature",
        label: `${crop.name} · ${kind} screen`,
        context: `${valid.length}/${dates.size} dated crop-days; duplicates across alternatives counted once`,
        inputLabel: kind === "heat" ? "Highest daily maximum" : "Lowest daily minimum",
        value,
        unit: "°C",
        referenceLabel: "Provisional exposure threshold",
        referenceMin: minimum,
        referenceMax: maximum,
        referenceText: rangeText(minimum, maximum),
        difference,
        differenceText: deviationText(difference, "°C"),
        status: difference === null ? "unknown" : difference === 0 ? "within" : "review",
        basis: !complete
          ? "Incomplete weather evidence for these crop dates · comparison withheld"
          : scenario.tempDelta === 0
            ? "Historical weather input · source and dates shown in the evidence panel"
            : `Hypothetical modeled temperature stress · current weather input + ${formatNumber(scenario.tempDelta)} °C`,
        referenceBasis: "Provisional engine exposure threshold · not a crop optimum or injury prediction",
        explanation: "Daily extrema are compared with extrema thresholds, not with a crop's mean-temperature growth range. This summarizes exposure during entered crop dates; cultivar, stage and duration govern biological effects. These screening parameters do not quantify yield loss. Incomplete crop-day coverage prevents a reassuring comparison.",
        sources: [{ title: `${crop.name}: regional/parameter source; threshold remains provisional`, url: crop.source }],
      });
    }
  }
  return assessment;
}
