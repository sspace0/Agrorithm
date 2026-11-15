import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { compare, DEFAULT_SCENARIO } from "../src/engine/engine";
import { parseWeather } from "../src/engine/import";
import { rotationWaterHeadline } from "../src/engine/rotationHeadline";
import { SAMPLE } from "../src/data/sample";
import RotationHeadline from "../src/components/RotationHeadline";

const weather = parseWeather(readFileSync("public/data/weather.json", "utf8"));
const actual = compare(SAMPLE, weather, DEFAULT_SCENARIO);
const option = (id: string, delivered: number | null, status: "feasible" | "unresolved" | "infeasible" = "feasible") => ({ ...actual[0], id, name: id, delivered, status });

describe("calculated water headline", () => {
  it("uses the real engine result and excludes unresolved or infeasible apparent savings", () => {
    const summary = rotationWaterHeadline(actual, DEFAULT_SCENARIO);
    const eligible = actual.filter(result => result.id !== "baseline" && result.status === "feasible");
    expect(summary.alternative!.delivered).toBe(Math.min(...eligible.map(result => result.delivered!)));
    expect(summary.percentDifference).toBe(100 * (summary.alternative!.delivered! - summary.baseline!.delivered!) / summary.baseline!.delivered!);
    const gated = rotationWaterHeadline([option("baseline", 100), option("blocked", 1, "infeasible"), option("unknown", 0, "unresolved"), option("valid", 120)], DEFAULT_SCENARIO);
    expect(gated).toMatchObject({ kind: "more", alternative: { id: "valid" }, percentDifference: 20 });
  });
  it("reports increased and equal irrigation without manufacturing a saving", () => {
    expect(rotationWaterHeadline([option("baseline", 100), option("a", 125)], DEFAULT_SCENARIO)).toMatchObject({ kind: "more", differenceMm: 25, percentDifference: 25 });
    expect(rotationWaterHeadline([option("baseline", 100), option("a", 100)], DEFAULT_SCENARIO)).toMatchObject({ kind: "same", differenceMm: 0 });
  });
  it("keeps zero-baseline percentages unknown and excludes invalid numerical estimates", () => {
    expect(rotationWaterHeadline([option("baseline", 0), option("a", 10)], DEFAULT_SCENARIO)).toMatchObject({ kind: "more", percentDifference: null, differenceMm: 10 });
    expect(rotationWaterHeadline([option("baseline", 100), option("a", null), option("b", NaN), option("c", -1)], DEFAULT_SCENARIO).kind).toBe("no-feasible-alternative");
    expect(rotationWaterHeadline([option("baseline", null), option("a", 10)], DEFAULT_SCENARIO).kind).toBe("missing-baseline");
  });
  it("marks perturbed weather or supply as hypothetical regardless of priority weights", () => {
    expect(rotationWaterHeadline(actual, { ...DEFAULT_SCENARIO, tempDelta: 2 }).hypothetical).toBe(true);
    expect(rotationWaterHeadline(actual, { ...DEFAULT_SCENARIO, weights: { water: 0, cover: 100, diversity: 0, exposure: 0 } }).hypothetical).toBe(false);
  });
  it("renders actual amounts, the method link and a conditional bridge-water explanation", () => {
    const html = renderToStaticMarkup(createElement(RotationHeadline, { results: actual, farm: SAMPLE, scenario: DEFAULT_SCENARIO, onOpenEvidence: () => {} }));
    expect(html).toContain("1,517.93 mm baseline");
    expect(html).toContain("not an overall recommendation");
    expect(html).toContain("Data &amp; method");
    expect(html).toContain("cover-crop evapotranspiration");
    const increased = renderToStaticMarkup(createElement(RotationHeadline, { results: [option("baseline", 100), option("a", 120)], farm: SAMPLE, scenario: DEFAULT_SCENARIO }));
    expect(increased).toContain("20% more modeled irrigation");
    expect(increased).not.toContain("cover-crop evapotranspiration");
  });
});
