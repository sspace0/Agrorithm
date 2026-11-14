import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  et0,
  extraterrestrialRadiation,
  dayOfYear,
  daysBetween,
  shiftYear,
  checkSequence,
  sequence,
  compare,
  DEFAULT_SCENARIO,
  mmToM3,
  evaluate,
  sensitivity,
} from "../src/engine/engine";
import {
  parseCropTable,
  parseWeather,
  validateFarm,
  validateScenario,
} from "../src/engine/import";
import { CROPS } from "../src/data/crops";
import { broadFit, zoneAt } from "../src/data/atlas";
import { SAMPLE, EMPTY } from "../src/data/sample";
import type { Day } from "../src/engine/types";
const weather = parseWeather(readFileSync("public/data/weather.json", "utf8"));
const copy = <T>(v: T): T => structuredClone(v);
describe("dates and constraints", () => {
  it("counts leap days, winter crossings, and clamps shifted Feb 29", () => {
    expect(daysBetween("2020-02-28", "2020-03-01")).toBe(2);
    expect(daysBetween("2021-11-05", "2022-04-04")).toBe(150);
    expect(shiftYear("2020-02-29", 1)).toBe("2021-02-28");
    expect(dayOfYear("2020-12-31")).toBe(366);
  });
  it("accepts all demonstration calendars", () => {
    for (const k of ["baseline", "pulse", "cover"] as const)
      expect(checkSequence(sequence(k))).toEqual([]);
  });
  it("rejects overlap, short buffers, wrong windows, duration and invalid dates", () => {
    const seq = sequence("baseline");
    seq[1].sow = "2021-10-29";
    expect(checkSequence(seq).join()).toMatch(/buffer/);
    expect(checkSequence(seq).join()).toMatch(/sowing/);
    seq[0].harvest = "2021-07-25";
    expect(checkSequence(seq).join()).toMatch(/duration/);
    seq[0].sow = "2021-02-29";
    expect(checkSequence(seq).join()).toMatch(/Invalid/);
  });
  it("priority weights cannot remove hard constraints", () => {
    const f = copy(SAMPLE);
    f.exclusions = ["mung"];
    const r = compare(f, weather, {
      ...DEFAULT_SCENARIO,
      weights: { water: 0, cover: 0, exposure: 0, diversity: 100 },
    });
    expect(r[1].status).toBe("infeasible");
    expect(r[1].score).toBeNull();
  });
  it("requires selected equipment/markets and provisional soil bounds", () => {
    const f = copy(SAMPLE);
    f.equipment = [];
    f.markets = [];
    f.soil.ec = 5;
    const r = compare(f, weather, DEFAULT_SCENARIO)[0];
    expect(r.constraints.join()).toMatch(/equipment|planter/);
    expect(r.constraints.join()).toMatch(/market/);
    expect(r.constraints.join()).toMatch(/EC/);
  });
});
describe("independent units and water checks", () => {
  it("matches a separately worked FAO radiation and Hargreaves reference", () => {
    expect(extraterrestrialRadiation(0, 80)).toBeCloseTo(37.824, 2);
    expect(et0(0, "2023-03-21", 20, 30)).toBeCloseTo(4.804, 2);
  });
  it("converts mm × hectares into cubic metres", () => {
    expect(mmToM3(1, 1)).toBe(10);
    expect(mmToM3(50, 2.5)).toBe(1250);
  });
  it("conserves the simplified daily bucket and separates delivered from net", () => {
    const r = compare(SAMPLE, weather, DEFAULT_SCENARIO)[0];
    expect(
      r.initialStorage! +
        r.effectiveRain! +
        r.netIrrigation! -
        (r.etc! + r.soilEvaporation! + r.drainage! + r.finalStorage!),
    ).toBeCloseTo(0, 6);
    expect(r.delivered).toBeCloseTo(r.netIrrigation! / 0.65, 6);
    expect(r.volume).toBeCloseTo(r.delivered! * 20, 6);
  });
  it("does not call rice ET total paddy demand", () => {
    const f = copy(SAMPLE);
    f.equipment.push("paddy");
    f.markets.push("rice");
    const r = evaluate(
      f,
      {
        id: "rice",
        name: "Rice test",
        description: "Synthetic test fixture",
        sequence: [
          {
            crop: "rice",
            sow: "2021-06-10",
            harvest: "2021-10-10",
            residue: false,
          },
        ],
      },
      weather,
      DEFAULT_SCENARIO,
    );
    expect(r.unknowns.join()).toMatch(/Paddy/);
    expect(r.score).toBeNull();
  });
  it("changes water and exposure for genuine weather perturbations without forcing ranks", () => {
    const a = compare(SAMPLE, weather, DEFAULT_SCENARIO);
    const b = compare(SAMPLE, weather, {
      ...DEFAULT_SCENARIO,
      rainFactor: 0.5,
      tempDelta: 3,
    });
    expect(b[0].delivered!).toBeGreaterThan(a[0].delivered!);
    expect(b[0].heatDays!).toBeGreaterThanOrEqual(a[0].heatDays!);
    expect(a[2].delivered!).toBeGreaterThan(a[0].delivered!);
  });
  it("water limit changes feasibility, not crop demand", () => {
    const a = compare(SAMPLE, weather, DEFAULT_SCENARIO);
    const b = compare(SAMPLE, weather, {
      ...DEFAULT_SCENARIO,
      waterFactor: 0.1,
    });
    expect(b[0].etc).toBe(a[0].etc);
    expect(b[0].status).toBe("infeasible");
    expect(b[0].constraints.join()).toMatch(/limit/);
  });
});
describe("missingness and imports", () => {
  it("keeps unsupplied crop dates and unconfirmed access unresolved", () => {
    const rs = compare(EMPTY, weather, DEFAULT_SCENARIO);
    expect(rs.every((r) => r.status === "unresolved")).toBe(true);
    expect(rs[0].unknowns.join()).toMatch(/sequence/);
  });
  it("checks imported parameter provenance and uses it in calculations", () => {
    const table = copy(CROPS);
    for (const c of Object.values(table))
      c.applicability = "Punjab demo cultivar, unverified";
    table.maize.kc = table.maize.kc.map((x) => x * 0.8);
    const parsed = parseCropTable(JSON.stringify(table));
    const a = compare(SAMPLE, weather, DEFAULT_SCENARIO)[0];
    const b = compare(
      { ...SAMPLE, cropTable: parsed },
      weather,
      DEFAULT_SCENARIO,
    )[0];
    expect(b.etc!).toBeLessThan(a.etc!);
    expect(() =>
      parseCropTable(JSON.stringify({ maize: { ...table.maize, source: "" } })),
    ).toThrow(/source/);
    expect(() =>
      validateScenario({ ...DEFAULT_SCENARIO, rainFactor: -1 }),
    ).toThrow();
  });
  it("does not infer soil from climate and handles map boundaries", () => {
    expect(zoneAt([1, 2, 3, 4], 2, 2, 90, -180)).toBe(1);
    expect(zoneAt([1, 2, 3, 4], 2, 2, -90, 180)).toBe(4);
    expect(broadFit("maize", 4, "unknown", false).label).toMatch(/unresolved/);
    expect(broadFit("maize", 14, "waterlogged", true).level).toBe(1);
    expect(broadFit("mung", 14, "loam", true).level).toBe(2);
    expect(broadFit("wheat", 30, "loam", true).level).toBe(1);
  });
  it("does not reward missing weather or soil", () => {
    const a = compare(SAMPLE, weather, DEFAULT_SCENARIO)[0];
    const f = copy(SAMPLE);
    f.soil.ph = null;
    f.soil.capacityMm = null;
    const b = compare(
      f,
      weather.filter((d) => d.date > "2022-01-01"),
      DEFAULT_SCENARIO,
    )[0];
    expect(b.completeness).toBeLessThan(a.completeness);
    expect(b.score).toBeNull();
    expect(b.status).toBe("unresolved");
    expect(b.replay).toHaveLength(0);
  });
  it("marks insufficient evidence unresolved and suppresses partial totals", () => {
    const r = compare(EMPTY, [], DEFAULT_SCENARIO)[1];
    expect(r.unknowns.length).toBeGreaterThan(0);
    expect(r.delivered).toBeNull();
    expect(r.coverage).toBe(0);
  });
  it("parses nulls, sorts dates, rejects duplicates, sentinels and malformed values", () => {
    const good: Day[] = [
      { date: "2020-02-29", min: null, max: 20, rain: 0 },
      { date: "2020-02-28", min: 8, max: 18, rain: 2 },
    ];
    expect(parseWeather(JSON.stringify(good))[0].date).toBe("2020-02-28");
    expect(() => parseWeather(JSON.stringify([good[0], good[0]]))).toThrow(
      /Duplicate/,
    );
    expect(() =>
      parseWeather('[{"date":"2021-02-29","min":0,"max":1,"rain":0}]'),
    ).toThrow(/Invalid date/);
    expect(() =>
      parseWeather('[{"date":"2021-02-28","min":0,"max":1,"rain":-999}]'),
    ).toThrow(/negative/);
  });
  it("validates area, coordinates, delivery efficiency and soil", () => {
    expect(validateFarm(SAMPLE)).toEqual(SAMPLE);
    expect(() => validateFarm({ ...SAMPLE, lat: 100 })).toThrow();
    expect(() => validateFarm({ ...SAMPLE, efficiency: 0 })).toThrow();
    expect(() => validateFarm({ ...SAMPLE, areaHa: -2 })).toThrow();
  });
  it("keeps four complete three-year replay windows", () => {
    const r = compare(SAMPLE, weather, DEFAULT_SCENARIO);
    expect(weather).toHaveLength(2557);
    r.forEach((v) => expect(v.replay).toHaveLength(4));
  });
  it("uses zero-weight handling and six enumerated sensitivity cases", () => {
    const s = {
      ...DEFAULT_SCENARIO,
      weights: { water: 0, cover: 0, diversity: 0, exposure: 0 },
    };
    expect(compare(SAMPLE, weather, s)[0].score).toBeNull();
    const rr = sensitivity(SAMPLE, weather, DEFAULT_SCENARIO);
    expect(rr).toHaveLength(6);
    expect(new Set(rr.map((r) => r.results[0].delivered)).size).toBeGreaterThan(
      1,
    );
  });
});
