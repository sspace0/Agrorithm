import { describe, expect, it } from "vitest";
import {
  atlasPointAt,
  boundAtlasView,
  centerAtlasAt,
  zoomAtlasAt,
} from "../src/engine/atlasView";
describe("geographic atlas camera", () => {
  it("keeps the geographic point beneath the cursor while zooming beyond the former4x cap", () => {
    const view = { zoom: 4, x: -1.2, y: -1.7 },
      anchor = { x: 0.4, y: 0.6 };
    const before = atlasPointAt(view, anchor),
      next = zoomAtlasAt(view, 18, anchor);
    expect(next.zoom).toBe(18);
    expect(atlasPointAt(next, anchor).x).toBeCloseTo(before.x, 12);
    expect(atlasPointAt(next, anchor).y).toBeCloseTo(before.y, 12);
  });
  it("clamps pan and zoom without exposing empty background", () => {
    expect(boundAtlasView({ zoom: 99, x: -100, y: 100 })).toEqual({
      zoom: 24,
      x: -23,
      y: 0,
    });
    expect(boundAtlasView({ zoom: 0.1, x: -9, y: -4 })).toEqual({
      zoom: 1,
      x: 0,
      y: 0,
    });
    expect(boundAtlasView({ zoom: NaN, x: NaN, y: Infinity })).toEqual({
      zoom: 1,
      x: 0,
      y: 0,
    });
  });
  it("centers a selected Punjab point and returns exactly to a whole-world view", () => {
    const point = { x: (73 + 180) / 360, y: (90 - 32.1) / 180 },
      view = centerAtlasAt({ zoom: 12, x: 0, y: 0 }, point);
    expect(view.x + point.x * view.zoom).toBeCloseTo(0.5, 12);
    expect(view.y + point.y * view.zoom).toBeCloseTo(0.5, 12);
    expect(zoomAtlasAt(view, 1, { x: 0.5, y: 0.5 })).toEqual({
      zoom: 1,
      x: 0,
      y: 0,
    });
  });
});
