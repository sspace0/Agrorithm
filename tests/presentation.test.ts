import { describe, expect, it } from "vitest";
import {
  equirectangularPoint,
  fitModelDistance,
  coverMapPoint,
} from "../src/engine/presentation";
import { observationDates } from "../src/state/observationDates";

describe("presentation geometry and observation coverage", () => {
  it("keeps the pilot point tied to a centered cover crop", () => {
    expect(coverMapPoint(1800, 600, 32.1, 73)).toEqual({ x: 1265, y: 139.5 });
    const phone = coverMapPoint(390, 195, 32.1, 73);
    expect(phone.x).toBeCloseTo(274.0833333333);
    expect(phone.y).toBeCloseTo(62.725);
  });
  it("places geographic coordinates on a 2:1 equirectangular image", () => {
    expect(equirectangularPoint(0, 0)).toEqual({ x: 0.5, y: 0.5 });
    expect(equirectangularPoint(90, -180)).toEqual({ x: 0, y: 0 });
    expect(equirectangularPoint(-90, 180)).toEqual({ x: 1, y: 1 });
    const pilot = equirectangularPoint(32.1, 73);
    expect(pilot.x * 5400).toBeCloseTo(3795, 6);
    expect(pilot.y * 2700).toBeCloseTo(868.5, 6);
  });
  it("frames a tall plant and broad cutaway more conservatively on narrow screens", () => {
    for (const size of [
      [1, 4, 1],
      [7, 2, 4],
    ] as [number, number, number][]) {
      const wide = fitModelDistance(size, 1.8);
      const narrow = fitModelDistance(size, 0.55);
      expect(narrow).toBeGreaterThanOrEqual(wide);
      expect(
        fitModelDistance(
          size.map((v) => v * 2) as [number, number, number],
          1.8,
        ),
      ).toBeCloseTo(wide * 2);
      expect(wide).toBeGreaterThan(Math.hypot(...size) / 2);
    }
  });
  it("clamps stale future filters to genuine coverage and preserves valid selections", () => {
    expect(
      observationDates("2026-01-01", "2026-11-01", "2018-01-01", "2024-12-31"),
    ).toEqual({ from: "2024-12-31", to: "2024-12-31" });
    expect(
      observationDates("2023-02-01", "2023-03-31", "2018-01-01", "2024-12-31"),
    ).toEqual({ from: "2023-02-01", to: "2023-03-31" });
    expect(observationDates("", "", "", "")).toEqual({ from: "", to: "" });
    expect(
      observationDates("2024-12-01", "2024-01-01", "2018-01-01", "2024-12-31"),
    ).toEqual({ from: "2024-01-01", to: "2024-01-01" });
  });
});
