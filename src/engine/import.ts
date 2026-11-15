import type { Crop, CropId, Day, Farm, Scenario } from "./types";
import { date } from "./engine";
import { CROPS } from "../data/crops";
import { isCropInterest } from "./cropInterest";
export function parseCropTable(text: string): Record<CropId, Crop> {
  const input: unknown = JSON.parse(text);
  if (!input || typeof input !== "object")
    throw Error("Expected a crop registry object");
  const out = structuredClone(CROPS);
  for (const [id, v] of Object.entries(input)) {
    if (!(id in CROPS) || !v || typeof v !== "object")
      throw Error("Only known crop ids are accepted");
    const c = v as Crop;
    if (
      c.id !== id ||
      typeof c.name !== "string" ||
      !c.name ||
      typeof c.family !== "string" ||
      typeof c.legume !== "boolean"
    )
      throw Error("Missing crop identity/family/legume");
    if (
      !Array.isArray(c.window) ||
      c.window.length !== 2 ||
      !Array.isArray(c.duration) ||
      c.duration.length !== 2 ||
      c.duration.some((x) => !Number.isFinite(x) || x < 1 || x > 366) ||
      c.duration[0] > c.duration[1]
    )
      throw Error("Invalid crop window/duration");
    for (const w of c.window) date("2020-" + w);
    if (c.window[0] > c.window[1])
      throw Error("Cross-year sowing windows need a future schema");
    if (
      !Array.isArray(c.stages) ||
      c.stages.length !== 4 ||
      c.stages.some((x) => !Number.isFinite(x) || x <= 0) ||
      Math.abs(c.stages.reduce((a, b) => a + b, 0) - 1) > 0.001 ||
      !Array.isArray(c.kc) ||
      c.kc.length !== 4 ||
      c.kc.some((x) => !Number.isFinite(x) || x < 0 || x > 2)
    )
      throw Error("Expected four stages totaling 1 and four Kc values 0–2");
    if (
      !Number.isFinite(c.heat) ||
      !Number.isFinite(c.frost) ||
      c.heat <= c.frost ||
      !Number.isFinite(c.rootM) ||
      c.rootM <= 0 ||
      c.rootM > 5
    )
      throw Error("Invalid thresholds/root assumption");
    if (
      typeof c.source !== "string" ||
      !/^https:\/\//.test(c.source) ||
      typeof c.applicability !== "string" ||
      !c.applicability ||
      !Array.isArray(c.provisional) ||
      !c.provisional.length ||
      c.provisional.some((x) => typeof x !== "string")
    )
      throw Error(
        "Supply source, region/variety applicability and provisional notes",
      );
    if (
      !["drill", "planter", "paddy"].includes(c.equipment) ||
      !["grain", "pulses", "rice", "none"].includes(c.market)
    )
      throw Error("Unsupported access constraint");
    out[id as CropId] = {
      ...c,
      provisional: [
        ...new Set([
          ...c.provisional,
          "User-imported parameter table; source applicability is unverified.",
        ]),
      ],
    };
  }
  return out;
}
export function validateScenario(v: unknown): Scenario {
  if (!v || typeof v !== "object") throw Error("Invalid scenario");
  const s = v as Scenario;
  for (const [k, min, max] of [
    ["rainFactor", 0, 1.5],
    ["tempDelta", -3, 5],
    ["waterFactor", 0, 1.5],
    ["kcFactor", 0.7, 1.3],
  ] as const)
    if (!Number.isFinite(s[k]) || s[k] < min || s[k] > max)
      throw Error(`Invalid ${k}`);
  if (
    !s.weights ||
    ["water", "cover", "diversity", "exposure"].some((k) => {
      const n = s.weights[k as keyof Scenario["weights"]];
      return !Number.isFinite(n) || n < 0 || n > 100;
    })
  )
    throw Error("Invalid priorities");
  return s;
}
export function parseWeather(text: string): Day[] {
  const rows: unknown = JSON.parse(text);
  const a = Array.isArray(rows)
    ? rows
    : rows && typeof rows === "object" && "days" in rows
      ? (rows as { days: unknown }).days
      : null;
  if (!Array.isArray(a) || a.length > 10000 || !a.length)
    throw Error("Expected 1–10,000 daily rows or {days:[…]}.");
  const seen = new Set<string>();
  return a
    .map((r) => {
      if (typeof r !== "object" || r === null)
        throw Error("Invalid weather row");
      const v = r as Record<string, unknown>;
      if (typeof v.date !== "string") throw Error("Date missing");
      date(v.date);
      if (seen.has(v.date)) throw Error("Duplicate weather date");
      seen.add(v.date);
      for (const k of ["min", "max", "rain"])
        if (
          v[k] !== null &&
          (typeof v[k] !== "number" || !Number.isFinite(v[k]))
        )
          throw Error(`Invalid ${k}`);
      if (v.min === -999 || v.max === -999)
        throw Error("Missing sentinels must be null");
      if (typeof v.rain === "number" && v.rain < 0)
        throw Error("Rain cannot be negative");
      if (
        typeof v.min === "number" &&
        typeof v.max === "number" &&
        v.min > v.max
      )
        throw Error("Minimum exceeds maximum");
      return v as Day;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
export function validateFarm(input: unknown): Farm {
  if (!input || typeof input !== "object") throw Error("Invalid plan");
  const f = input as Farm;
  if (f.cropInterest !== undefined && !isCropInterest(f.cropInterest))
    throw Error("Unknown crop reference interest");
  for (const key of [
    "name",
    "irrigation",
    "polygon",
    "observations",
    "soilTexture",
  ] as const)
    if (typeof f[key] !== "string") throw Error(`Invalid ${key}`);
  if (typeof f.confirmed !== "boolean")
    throw Error("Confirm management status");
  if (
    f.coordinateEvidence &&
    (f.coordinateEvidence.method !== "device-geolocation" ||
      (f.coordinateEvidence.accuracyM !== null &&
        (!Number.isFinite(f.coordinateEvidence.accuracyM) ||
          f.coordinateEvidence.accuracyM < 0)) ||
      typeof f.coordinateEvidence.capturedAt !== "string" ||
      !Number.isFinite(Date.parse(f.coordinateEvidence.capturedAt)))
  )
    throw Error("Invalid device-location provenance");
  if (
    !Number.isFinite(f.lat) ||
    Math.abs(f.lat) > 90 ||
    !Number.isFinite(f.lon) ||
    Math.abs(f.lon) > 180 ||
    !Number.isFinite(f.areaHa) ||
    f.areaHa <= 0 ||
    f.areaHa > 100000
  )
    throw Error("Check coordinates and area.");
  if (
    f.efficiency !== null &&
    (!Number.isFinite(f.efficiency) || f.efficiency <= 0 || f.efficiency > 1)
  )
    throw Error("Efficiency must be >0 and ≤1.");
  if (
    f.waterLimitMm !== null &&
    (!Number.isFinite(f.waterLimitMm) || f.waterLimitMm < 0)
  )
    throw Error("Invalid water limit");
  if (!f.soil || !Array.isArray(f.sequence) || f.sequence.length > 60)
    throw Error("Invalid soil/sequence");
  if (typeof f.soil.date !== "string" || typeof f.soil.source !== "string")
    throw Error("Invalid soil provenance");
  if (f.budget !== null && (!Number.isFinite(f.budget) || f.budget < 0))
    throw Error("Invalid budget");
  for (const p of f.sequence) {
    if (typeof p.residue !== "boolean")
      throw Error("Residue flag must be boolean");
    if (!CROPS[p.crop]) throw Error("Unknown crop");
    date(p.sow);
    date(p.harvest);
  }
  for (const k of ["ph", "ec", "capacityMm", "depthCm"] as const) {
    const v = f.soil[k];
    if (v !== null && (!Number.isFinite(v) || v < 0))
      throw Error(`Invalid soil ${k}`);
  }
  if (f.soil.ph !== null && f.soil.ph > 14) throw Error("pH must be 0–14");
  if (
    !Array.isArray(f.equipment) ||
    !Array.isArray(f.markets) ||
    !Array.isArray(f.exclusions) ||
    f.equipment.some((v) => typeof v !== "string") ||
    f.markets.some((v) => typeof v !== "string") ||
    f.exclusions.some((c) => !CROPS[c])
  )
    throw Error("Invalid constraints");
  if (f.cropTable) f.cropTable = parseCropTable(JSON.stringify(f.cropTable));
  return f;
}
