import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assignWeatherPattern, outsideTrainingRange, parseWeatherPatternModel } from "../src/engine/weatherPatterns";
const source = JSON.parse(readFileSync("public/data/weather-patterns.json", "utf8"));
const model = parseWeatherPatternModel(source);
describe("learned historical weather patterns", () => {
  it("reproduces every serialized training and heldout membership in browser inference", () => {
    for (const row of model.observations) {
      const assignment = assignWeatherPattern(model, row.features)!;
      expect(assignment.nearest.cluster.id).toBe(row.clusterId);
      expect(assignment.nearest.distance).toBeCloseTo(row.standardizedDistance, 9);
      expect(assignment.nearest.contributions.reduce((a,b)=>a+b,0)).toBeCloseTo(row.standardizedDistance**2,8);
    }
  });
  it("keeps missing or invalid inputs unresolved instead of using fewer dimensions", () => {
    const features = model.observations[0].features;
    for (const invalid of [{...features,totalRainMm:undefined},{...features,meanTminC:NaN},{...features,meanTmaxC:-999},{...features,totalRainMm:-1},{...features,dryDayFraction:1.2},{...features,meanTminC:100}]) expect(assignWeatherPattern(model,invalid)).toBeNull();
  });
  it("rejects a corrupt or incomplete scaler and unfamiliar feature order", () => {
    for (const patch of [{standardizer:{...model.standardizer,scale:[0,1,1,1]}},{featureOrder:["totalRainMm","meanTminC","meanTmaxC","dryDayFraction"]},{observations:[{...model.observations[0],coverage:.9}]},{observations:[{...model.observations[0],clusterId:"unknown"}]}]) expect(()=>parseWeatherPatternModel({...source,...patch})).toThrow();
  });
  it("retains chronological holdout and honest complete-month coverage", () => {
    expect(model.observations.filter(r=>r.split==="training")).toHaveLength(60);
    expect(model.observations.filter(r=>r.split==="heldout")).toHaveLength(24);
    expect(model.observations.every(r=>r.split==="training"?r.month<="2022-12":r.month>="2023-01"&&r.month<="2024-12")).toBe(true);
    expect(model.aggregation.excludedMonths).toEqual([]);
  });
  it("flags extrapolation using only training ranges", () => {
    expect(outsideTrainingRange(model, {...model.observations[0].features,totalRainMm:10000})).toContain("totalRainMm");
    const altered={...model,observations:model.observations.map(row=>row.split==="heldout"?{...row,features:{...row.features,totalRainMm:1e6}}:row)};
    expect(outsideTrainingRange(altered, {...model.observations[0].features,totalRainMm:10000})).toContain("totalRainMm");
    expect(outsideTrainingRange(model, {})).toEqual([]);
  });
});
