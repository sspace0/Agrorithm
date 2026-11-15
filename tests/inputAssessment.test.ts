import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { assessInputs, distanceOutsideRange } from "../src/engine/inputAssessment";
import { compare, DEFAULT_SCENARIO } from "../src/engine/engine";
import { SAMPLE, EMPTY } from "../src/data/sample";
import { parseWeather } from "../src/engine/import";

const weather = parseWeather(readFileSync("public/data/weather.json", "utf8"));
const sample = () => structuredClone(SAMPLE);
const results = compare(SAMPLE, weather, DEFAULT_SCENARIO);

describe("comparable input and reference assessment", () => {
  it("keeps range deviations in original units without percentage pH arithmetic", () => {
    expect(distanceOutsideRange(8, 5.5, 7)).toBe(1);
    expect(distanceOutsideRange(5, 5.5, 7)).toBe(-0.5);
    expect(distanceOutsideRange(6, 5.5, 7)).toBe(0);
    expect(distanceOutsideRange(null, 5.5, 7)).toBeNull();
    expect(distanceOutsideRange(Number.NaN, 5.5, 7)).toBeNull();
  });

  it("compares delivered-water estimate with scenario supply, never with crop ET", () => {
    const farm = sample();
    farm.waterLimitMm = 100;
    const stressed = { ...DEFAULT_SCENARIO, waterFactor: 0.5 };
    const actual = compare(farm, weather, stressed);
    const assessed = assessInputs(farm, stressed, actual, weather);
    expect(assessed.water[0].referenceMax).toBe(50);
    expect(assessed.water[0].value).toBe(actual[0].delivered);
    expect(assessed.water[0].value).not.toBe(actual[0].etc);
    expect(assessed.water[0].difference).toBe(actual[0].delivered! - 50);
    expect(assessed.water[0].status).toBe("exceeds");
    expect(assessed.water[0].unit).toBe("mm / 36 months");
  });

  it("never colors missing inputs or incomplete weather as reassuring", () => {
    const empty = structuredClone(EMPTY);
    const incomplete = weather.filter((day) => day.date !== "2021-08-01");
    const assessed = assessInputs(empty, DEFAULT_SCENARIO, compare(empty, incomplete, DEFAULT_SCENARIO), incomplete);
    expect(assessed.water.every((row) => row.status === "unknown")).toBe(true);
    expect(assessed.soil.every((row) => row.status === "unknown")).toBe(true);
    const maizeHeat = assessed.temperature.find((row) => row.id === "temperature-maize-heat")!;
    expect(maizeHeat.status).toBe("unknown");
    expect(maizeHeat.value).toBeNull();
  });

  it("flags cross-region soil guidance for review rather than a calibrated injury claim", () => {
    const farm = sample();
    farm.cropInterest = "tomato";
    farm.soil.ph = 9;
    const rows = assessInputs(farm, DEFAULT_SCENARIO, results, weather).soil;
    const tomato = rows.find((row) => row.id === "ph-tomato")!;
    expect(tomato.referenceText).toBe("5.5–7");
    expect(tomato.difference).toBe(2);
    expect(tomato.status).toBe("review");
    expect(tomato.referenceBasis).toMatch(/provisional/);
    expect(tomato.sources[0].url).toContain("umn.edu");
    expect(tomato.basis).toBe("Assumed soil input");
  });

  it("recomputes scenario temperatures with explicit modeled provenance", () => {
    const observed = assessInputs(SAMPLE, DEFAULT_SCENARIO, results, weather).temperature;
    const perturbed = assessInputs(SAMPLE, { ...DEFAULT_SCENARIO, tempDelta: 2 }, results, weather).temperature;
    expect(perturbed[0].value).toBeCloseTo(observed[0].value! + 2, 8);
    expect(observed[0].basis).toMatch(/Historical weather input/);
    expect(perturbed[0].basis).toMatch(/Hypothetical modeled/);
    expect(perturbed[0].referenceBasis).toMatch(/not a crop optimum/);
    expect(perturbed.every((row) => row.status !== "exceeds")).toBe(true);
  });

  it("does not relabel imported weather or assumed soil as NASA observations or measurements", () => {
    const farm = sample();
    const assessed = assessInputs(farm, DEFAULT_SCENARIO, results, weather);
    expect([...assessed.water, ...assessed.temperature].every((row) => !row.basis.includes("NASA") && !row.basis.includes("POWER"))).toBe(true);
    expect(assessed.soil.every((row) => row.basis === "Assumed soil input")).toBe(true);
  });

  it("keeps the comparison inside dated crop windows and tolerates invalid entered dates", () => {
    const newer = [...weather, { date: "2030-07-20", min: -100, max: 100, rain: 0 }];
    const original = assessInputs(SAMPLE, DEFAULT_SCENARIO, results, weather).temperature;
    const extra = assessInputs(SAMPLE, DEFAULT_SCENARIO, results, newer).temperature;
    expect(extra.map((row) => row.value)).toEqual(original.map((row) => row.value));
    const invalid = structuredClone(results);
    invalid.forEach((result) => result.sequence.forEach((planting) => {
      planting.sow = "invalid";
    }));
    expect(() => assessInputs(SAMPLE, DEFAULT_SCENARIO, invalid, weather)).not.toThrow();
    expect(assessInputs(SAMPLE, DEFAULT_SCENARIO, invalid, weather).temperature.every((row) => row.status === "unknown")).toBe(true);
  });
});
