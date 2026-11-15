import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NasaScopePanel } from "../src/components/NasaScopePanel";

describe("public NASA integration scope", () => {
  it("marks exactly the two implemented decision-evidence integrations", () => {
    const html = renderToStaticMarkup(createElement(NasaScopePanel));
    expect((html.match(/data-status="implemented"/g) ?? []).length).toBe(2);
    expect(html).toContain('data-nasa-source="power" data-status="implemented"');
    expect(html).toContain('data-nasa-source="hls-l30" data-status="implemented"');
    expect((html.match(/data-status="not-used"/g) ?? []).length).toBe(6);
    expect(html).toContain("No SMAP moisture product is loaded");
    expect(html).toContain("no Sentinel-derived S30 observations");
    expect(html).toContain("does not automatically change numerical rotation scores");
  });
  it("keeps observed date windows and manual fallback visible", () => {
    const html = renderToStaticMarkup(createElement(NasaScopePanel, { evidenceHref: "#/console/evidence" }));
    const weather = JSON.parse(readFileSync("public/data/weather.json", "utf8"));
    expect(html).toContain(weather.dates.join(" → "));
    expect(html).toContain("2023-01-05 → 2023-12-31");
    expect(html).toContain('href="#/console/evidence"');
    expect(html).toContain("Missing or poor-quality satellite observations remain gaps");
  });
  it("documents humidity and modeled wetness as metadata-only, not SMAP integration", () => {
    const records = JSON.parse(readFileSync("docs/data/power-future-parameter-metadata.json", "utf8"));
    const parameters = new Map<string, { dailyAGUnits: string }>(records.map((row: { id: string; dailyAGUnits: string }) => [row.id, row]));
    expect(parameters.get("RH2M")?.dailyAGUnits).toBe("%");
    expect(parameters.get("QV2M")?.dailyAGUnits).toBe("g/kg");
    for (const id of ["GWETTOP", "GWETROOT", "GWETPROF"]) expect(parameters.get(id)?.dailyAGUnits).toBe("1");
    const html = renderToStaticMarkup(createElement(NasaScopePanel));
    expect(html).toContain("not downloaded, displayed as observations or used in calculations");
    expect(html).toContain("must not be relabeled as SMAP");
  });
});
