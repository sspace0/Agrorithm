import { CROPS } from "../data/crops";
import type { Day, Farm, Planting, Result, Rotation, Scenario } from "./types";
export const DAY = 86400000;
export function date(s: string) {
  const d = new Date(`${s}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    !Number.isFinite(+d) ||
    d.toISOString().slice(0, 10) !== s
  )
    throw Error(`Invalid date: ${s}`);
  return d;
}
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) =>
  (+date(b) - +date(a)) / DAY;
export function addDays(s: string, n: number) {
  return iso(new Date(+date(s) + n * DAY));
}
export function shiftYear(s: string, n: number) {
  const d = date(s);
  const year = d.getUTCFullYear() + n;
  const mm = d.getUTCMonth() + 1;
  const day = Math.min(
    d.getUTCDate(),
    new Date(Date.UTC(year, mm, 0)).getUTCDate(),
  );
  return `${year}-${String(mm).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function dayOfYear(s: string) {
  const d = date(s);
  return Math.floor((+d - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAY) + 1;
}
// FAO 56 eqs 21, 23–25 and 52. Ra is MJ m−2 day−1; 0.408 converts to mm.
export function extraterrestrialRadiation(lat: number, doy: number) {
  const p = (lat * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * doy) / 365);
  const dec = 0.409 * Math.sin((2 * Math.PI * doy) / 365 - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(p) * Math.tan(dec))));
  return (
    ((24 * 60) / Math.PI) *
    0.082 *
    dr *
    (ws * Math.sin(p) * Math.sin(dec) +
      Math.cos(p) * Math.cos(dec) * Math.sin(ws))
  );
}
export function et0(lat: number, s: string, min: number, max: number) {
  if (max < min) throw Error("Maximum temperature below minimum");
  return Math.max(
    0,
    0.0023 *
      ((min + max) / 2 + 17.8) *
      Math.sqrt(max - min) *
      extraterrestrialRadiation(lat, dayOfYear(s)) *
      0.408,
  );
}
export const mmToM3 = (mm: number, ha: number) => mm * ha * 10;
export function stage(p: Planting, s: string, crops = CROPS) {
  const progress =
    daysBetween(p.sow, s) / Math.max(1, daysBetween(p.sow, p.harvest));
  let sum = 0;
  return crops[p.crop].stages.findIndex((v) => (sum += v) > progress);
}
export const DEFAULT_SCENARIO: Scenario = {
  rainFactor: 1,
  tempDelta: 0,
  waterFactor: 1,
  kcFactor: 1,
  weights: { water: 40, cover: 30, diversity: 20, exposure: 10 },
};
export function sequence(
  kind: "baseline" | "pulse" | "cover",
  year = 2021,
): Planting[] {
  const a: Planting[] = [];
  for (let y = year; y < year + 3; y++) {
    if (kind === "pulse")
      a.push({
        crop: "mung",
        sow: `${y}-07-01`,
        harvest: `${y}-09-25`,
        residue: true,
      });
    else
      a.push({
        crop: "maize",
        sow: `${y}-07-20`,
        harvest: `${y}-10-28`,
        residue: true,
      });
    a.push({
      crop: "wheat",
      sow: `${y}-11-05`,
      harvest: `${y + 1}-04-04`,
      residue: true,
    });
    if (kind === "cover")
      a.push({
        crop: "cover",
        sow: `${y + 1}-04-12`,
        harvest: `${y + 1}-06-15`,
        residue: true,
      });
  }
  return a;
}
export function rotations(f: Farm): Rotation[] {
  return [
    {
      id: "baseline",
      name: "Your current sequence",
      description: "Entered baseline · same 36-month horizon",
      sequence: f.sequence,
    },
    {
      id: "pulse",
      name: "Make room for a pulse",
      description: "Kharif mungbean → wheat · retained residue assumed",
      sequence: sequence("pulse"),
    },
    {
      id: "cover",
      name: "Keep a living bridge",
      description: "Maize → wheat → spring mung cover · terminate 15 June",
      sequence: sequence("cover"),
    },
  ];
}
export function checkSequence(
  seq: Planting[],
  start = "2021-07-01",
  end = "2024-07-01",
  crops = CROPS,
) {
  const errors: string[] = [];
  const sorted = [...seq].sort((a, b) => a.sow.localeCompare(b.sow));
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    try {
      const duration = daysBetween(p.sow, p.harvest);
      const crop = crops[p.crop];
      const md = p.sow.slice(5);
      if (md < crop.window[0] || md > crop.window[1])
        errors.push(`${crop.name}: sowing outside ${crop.window.join("–")}.`);
      if (duration < crop.duration[0] || duration > crop.duration[1])
        errors.push(
          `${crop.name}: duration ${duration} d outside ${crop.duration.join("–")} d.`,
        );
      if (p.sow < start || p.harvest >= end)
        errors.push(`${crop.name}: outside the common horizon.`);
      if (i && daysBetween(sorted[i - 1].harvest, p.sow) < 7)
        errors.push(`${crop.name}: overlap or transition buffer below 7 days.`);
    } catch {
      errors.push("Invalid sequence date.");
    }
  }
  if (!seq.length) errors.push("Enter at least one crop.");
  return errors;
}
function waterMetrics(
  f: Farm,
  seq: Planting[],
  weather: Day[],
  s: Scenario,
  start: string,
  end: string,
  crops = CROPS,
) {
  const map = new Map(weather.map((d) => [d.date, d]));
  let valid = 0,
    total = 0,
    etc = 0,
    effectiveRain = 0,
    net = 0,
    heat = 0,
    frost = 0,
    deficit = 0,
    evap = 0,
    drainage = 0;
  const initial = (f.soil.capacityMm ?? 100) * 0.5;
  let store = initial;
  let activeValid = 0,
    activeTotal = 0;
  const stageCounts = new Map<
    string,
    {
      crop: string;
      stage: string;
      heat: number;
      frost: number;
      deficit: number;
      days: number;
    }
  >();
  for (let dt = start; dt < end; dt = addDays(dt, 1)) {
    total++;
    const p = seq.find((x) => x.sow <= dt && x.harvest > dt);
    if (p) activeTotal++;
    const d = map.get(dt);
    if (!d || d.min === null || d.max === null || d.rain === null) continue;
    valid++;
    if (p) activeValid++;
    const e = et0(f.lat, dt, d.min + s.tempDelta, d.max + s.tempDelta);
    const rain = Math.max(0, d.rain * s.rainFactor) * 0.8;
    effectiveRain += rain;
    store += rain;
    const cap = f.soil.capacityMm ?? 100;
    drainage += Math.max(0, store - cap);
    store = Math.min(cap, store);
    if (p) {
      const c = crops[p.crop];
      const stageName = ["initial", "development", "mid", "late"][
        Math.max(0, stage(p, dt, crops))
      ];
      const key = p.crop + "-" + stageName;
      const count = stageCounts.get(key) || {
        crop: c.name,
        stage: stageName,
        heat: 0,
        frost: 0,
        deficit: 0,
        days: 0,
      };
      count.days++;
      if (d.max + s.tempDelta > c.heat) count.heat++;
      if (d.min + s.tempDelta < c.frost) count.frost++;
      const kc = c.kc[Math.max(0, stage(p, dt))] * s.kcFactor;
      const demand = e * kc;
      etc += demand;
      if (d.max + s.tempDelta > c.heat) heat++;
      if (d.min + s.tempDelta < c.frost) frost++;
      if (demand > rain) {
        deficit++;
        count.deficit++;
      }
      stageCounts.set(key, count);
      const needed = Math.max(0, demand - store);
      net += needed;
      store = Math.max(0, store - demand);
    } else {
      const actual = Math.min(store, 0.25 * e);
      store -= actual;
      evap += actual;
    }
  }
  return {
    coverage: valid / total,
    activeCoverage: activeTotal ? activeValid / activeTotal : 0,
    etc,
    effectiveRain,
    net,
    heat,
    frost,
    deficit,
    initial,
    final: store,
    evap,
    drainage,
    stageExposure: [...stageCounts.values()],
  };
}
export function evaluate(
  f: Farm,
  r: Rotation,
  weather: Day[],
  s: Scenario,
  replay = true,
): Result {
  const crops = f.cropTable ?? CROPS;
  const constraints = checkSequence(
    r.sequence,
    "2021-07-01",
    "2024-07-01",
    crops,
  ).filter((message) => message !== "Enter at least one crop.");
  const unknowns: string[] = [];
  if (!r.sequence.length)
    unknowns.push("The existing crop sequence has not been supplied.");
  const warnings = [
    "Historical replay is a screening exercise, not yield validation.",
    "Crop thresholds, effective rainfall (80%), initial storage (50%) and Kc need local calibration.",
  ];
  for (const p of r.sequence) {
    const c = crops[p.crop];
    if (f.exclusions.includes(p.crop))
      constraints.push(`${c.name} is excluded.`);
    if (!f.equipment.includes(c.equipment))
      (f.confirmed ? constraints : unknowns).push(
        `${c.name} needs ${c.equipment}; equipment access is not selected.`,
      );
    if (c.market !== "none" && !f.markets.includes(c.market))
      (f.confirmed ? constraints : unknowns).push(
        `${c.name} needs ${c.market} market access; ${f.confirmed ? "unavailable in confirmed inputs" : "not yet confirmed"}.`,
      );
  }
  if (!f.confirmed)
    unknowns.push(
      "Confirm the existing rotation and demonstration management inputs with the farmer.",
    );
  if (f.soil.ph === null || f.soil.ec === null)
    unknowns.push(
      "Soil pH / EC missing; provisional soil suitability cannot be checked.",
    );
  else {
    if (f.soil.ph < 6 || f.soil.ph > 8.5)
      constraints.push(
        "Soil pH outside the provisional 6–8.5 screen; obtain local crop-specific advice.",
      );
    if (f.soil.ec > 4)
      constraints.push(
        "Soil EC exceeds provisional 4 dS/m screen; salinity-specific advice needed.",
      );
  }
  if (f.soil.capacityMm === null)
    unknowns.push(
      "Root-zone available water storage missing; displayed bucket uses provisional 100 mm.",
    );
  if (f.efficiency === null) unknowns.push("Delivery efficiency unknown.");
  if (f.waterLimitMm === null) unknowns.push("Delivered water limit unknown.");
  if (r.sequence.some((p) => p.crop === "rice"))
    unknowns.push(
      "Paddy preparation, ponding, seepage and percolation not supplied: ET-only rice is not total irrigation.",
    );
  if (r.sequence.some((p) => p.crop === "cover"))
    warnings.push(
      "Cover uses water and needs paid seed/labor/termination. Costs unknown; no profit or nitrogen credit calculated.",
    );
  const m = waterMetrics(
    f,
    r.sequence,
    weather,
    s,
    "2021-07-01",
    "2024-07-01",
    crops,
  );
  const complete = m.coverage === 1 && m.activeCoverage === 1;
  if (!complete)
    unknowns.push(
      `Weather coverage ${(m.coverage * 100).toFixed(1)}%; incomplete windows are not ranked.`,
    );
  const delivered =
    complete && f.efficiency !== null ? m.net / f.efficiency : null;
  if (
    delivered !== null &&
    f.waterLimitMm !== null &&
    delivered > f.waterLimitMm * s.waterFactor
  )
    constraints.push(
      `Delivered irrigation exceeds the horizon limit by ${Math.round(delivered - f.waterLimitMm * s.waterFactor)} mm. Increase verified supply, improve verified efficiency, or change crops.`,
    );
  const horizon = daysBetween("2021-07-01", "2024-07-01");
  let live = 0,
    residue = 0;
  for (let dt = "2021-07-01"; dt < "2024-07-01"; dt = addDays(dt, 1)) {
    if (r.sequence.some((p) => p.sow <= dt && dt < p.harvest)) live++;
    else if (
      r.sequence.some(
        (p) => p.residue && p.harvest <= dt && daysBetween(p.harvest, dt) <= 45,
      )
    )
      residue++;
  }
  const families = new Set(r.sequence.map((p) => crops[p.crop].family)).size;
  const status = constraints.length
    ? "infeasible"
    : unknowns.length
      ? "unresolved"
      : "feasible";
  const dimensions = [
    complete,
    f.soil.ph !== null,
    f.soil.ec !== null,
    f.soil.capacityMm !== null,
    f.efficiency !== null,
    f.waterLimitMm !== null,
    f.confirmed,
  ];
  const weights = s.weights,
    weightSum = Object.values(weights).reduce((a, b) => a + b, 0);
  const components = {
    water: delivered === null ? null : Math.max(0, 1 - delivered / 6000),
    cover: live / horizon,
    diversity: Math.min(1, families / 3),
    exposure: complete ? Math.max(0, 1 - (m.heat + m.frost) / horizon) : null,
  };
  const score =
    status === "feasible" &&
    weightSum > 0 &&
    components.water !== null &&
    components.exposure !== null
      ? (100 *
          (weights.water * components.water +
            weights.cover * components.cover +
            weights.diversity * components.diversity +
            weights.exposure * components.exposure)) /
        weightSum
      : null;
  const replayValues: number[] = [];
  if (replay && complete && f.efficiency !== null) {
    for (const year of [2018, 2019, 2020, 2021]) {
      const offset = year - 2021;
      const seq = r.sequence.map((p) => ({
        ...p,
        sow: shiftYear(p.sow, offset),
        harvest: shiftYear(p.harvest, offset),
      }));
      const rm = waterMetrics(
        f,
        seq,
        weather,
        s,
        `${year}-07-01`,
        `${year + 3}-07-01`,
        crops,
      );
      if (rm.coverage === 1) replayValues.push(rm.net / f.efficiency);
    }
  }
  return {
    ...r,
    status,
    constraints: [...new Set(constraints)],
    unknowns: [...new Set(unknowns)],
    warnings,
    etc: complete ? m.etc : null,
    effectiveRain: complete ? m.effectiveRain : null,
    netIrrigation: complete ? m.net : null,
    delivered,
    volume: delivered === null ? null : mmToM3(delivered, f.areaHa),
    coverage: m.coverage,
    liveCover: live / horizon,
    residueCover: residue / horizon,
    families,
    legume: r.sequence.some((p) => crops[p.crop].legume),
    heatDays: complete ? m.heat : null,
    frostDays: complete ? m.frost : null,
    deficitDays: complete ? m.deficit : null,
    completeness: dimensions.filter(Boolean).length / dimensions.length,
    score,
    pareto: false,
    initialStorage: f.soil.capacityMm === null ? null : m.initial,
    finalStorage: complete ? m.final : null,
    soilEvaporation: complete ? m.evap : null,
    drainage: complete ? m.drainage : null,
    replay: replayValues,
    stageExposure: complete ? m.stageExposure : [],
  };
}
export function compare(f: Farm, w: Day[], s: Scenario) {
  const rs = rotations(f).map((r) => evaluate(f, r, w, s));
  for (const a of rs) {
    a.pareto =
      a.status === "feasible" &&
      !rs.some(
        (b) =>
          b.id !== a.id &&
          b.status === "feasible" &&
          b.delivered !== null &&
          a.delivered !== null &&
          b.delivered <= a.delivered &&
          b.liveCover >= a.liveCover &&
          b.families >= a.families &&
          (b.heatDays ?? Infinity) + (b.frostDays ?? Infinity) <=
            (a.heatDays ?? Infinity) + (a.frostDays ?? Infinity) &&
          (b.delivered < a.delivered ||
            b.liveCover > a.liveCover ||
            b.families > a.families ||
            (b.heatDays ?? 0) + (b.frostDays ?? 0) <
              (a.heatDays ?? 0) + (a.frostDays ?? 0)),
      );
  }
  return rs;
}
export function sensitivity(f: Farm, w: Day[], s: Scenario) {
  return [-0.2, 0, 0.2].flatMap((rain) =>
    [0.9, 1.1].map((kc) => ({
      rainFactor: Math.max(0, s.rainFactor + rain),
      kcFactor: kc,
      results: compare(f, w, {
        ...s,
        rainFactor: Math.max(0, s.rainFactor + rain),
        kcFactor: kc,
      }),
    })),
  );
}
