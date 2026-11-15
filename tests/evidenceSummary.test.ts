import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NasaEvidencePanel, WeatherDataStrip } from "../src/components/NasaEvidencePanel";
import { NASA_RESULT_ROLES, SOIL_HEALTH_PROXY_NOTE, summarizeNasaEvidence, type VegetationEvidence } from "../src/engine/evidenceSummary";
import type { Day } from "../src/engine/types";

const weather = JSON.parse(readFileSync("public/data/weather.json", "utf8")).days as Day[];
const vegetation = JSON.parse(readFileSync("public/data/vegetation.json", "utf8")) as VegetationEvidence;

describe("visible NASA evidence summary", () => {
  it("derives genuine cache dates and quality counts from the actual records", () => {
    const summary = summarizeNasaEvidence(weather, "NASA POWER · genuine cached observation", vegetation);
    expect(summary.weather).toMatchObject({ start: "2018-01-01", end: "2024-12-31", completeDays: 2557, totalDays: 2557, origin: "nasa", available: true });
    expect(summary.vegetation.scenes).toBe(43);
    expect(summary.vegetation.acceptedScenes).toBe(16);
    expect(summary.vegetation.start).toBe("2023-01-05");
    expect(summary.vegetation.end).toBe("2023-12-31");
    expect(summary.vegetation.acceptedStart).toBe("2023-03-10");
  });
  it("does not relabel imported weather as NASA or fill unavailable observations", () => {
    const summary = summarizeNasaEvidence([{ date: "2024-02-29", min: 3, max: null, rain: 0 }], "User-imported weather · provenance unverified", null);
    expect(summary.weather.origin).toBe("user");
    expect(summary.weather.completeDays).toBe(0);
    expect(summary.weather.available).toBe(false);
    expect(summary.vegetation).toMatchObject({ available: false, scenes: 0, acceptedScenes: 0, start: null, end: null });
  });
  it("does not count duplicate, malformed or incomplete daily records as complete evidence", () => {
    const row = { date: "2024-02-29", min: 3, max: 10, rain: 0 };
    const summary = summarizeNasaEvidence([row, row, { ...row, date: "2023-02-29" }, { ...row, date: "2024-03-01", rain: -999 }], "unknown", null);
    expect(summary.weather.completeDays).toBe(1);
    expect(summary.weather.totalDays).toBe(2);
    expect(summary.weather.origin).toBe("unknown");
  });
  it("requires valid-pixel coverage as well as a finite NDVI", () => {
    const invalid = structuredClone(vegetation);
    invalid.observations = [{ ...invalid.observations.find(row => row.ndvi !== null)!, coverage: .2, validPixels: 16 }];
    expect(summarizeNasaEvidence(weather, "NASA POWER", invalid).vegetation.available).toBe(false);
  });
  it("keeps NDVI interpretation and soil-health proxy limits explicit", () => {
    expect(NASA_RESULT_ROLES.vegetation).toMatch(/does not automatically change the numerical rotation score/);
    expect(SOIL_HEALTH_PROXY_NOTE.limits).toMatch(/do not measure organic carbon/);
    expect(SOIL_HEALTH_PROXY_NOTE.next).toMatch(/not implemented here/);
  });
  it("does not attach NASA grid or UTC metadata to user-imported weather", () => {
    const html = renderToStaticMarkup(createElement(NasaEvidencePanel, { weather, weatherSource: "User-imported weather · test.json · provenance unverified", vegetation: null }));
    expect(html).toContain("source time standard unverified");
    expect(html).toContain("Verify their original units, time standard, publisher and spatial support");
    expect(html).not.toContain("Regional meteorology grid");
    expect(html).not.toContain("POWER / MERRA-2");
    expect(html).toContain("No NASA product or grid is assumed for these rows.");
  });
  it("makes the observed date limits and distinct roles visible in the compact results strip", () => {
    const html = renderToStaticMarkup(createElement(WeatherDataStrip, { weather, weatherSource: "NASA POWER · genuine cached observation", vegetation }));
    expect(html).toContain("2018-01-01 → 2024-12-31");
    expect(html).toContain("2023-01-05 → 2023-12-31");
    expect(html).toContain("16 / 43 scenes pass QA");
    expect(html).toContain("scenario cover remains calendar-based");
    expect(html).toContain("not forecasts");
  });
});
