import { describe, expect, it } from "vitest";
import { normalizeCinematicWheelDelta } from "../src/motion/cinematicScroll";

describe("cinematic wheel input", () => {
  it("moves one quarter of pixel input in either direction", () => {
    expect(normalizeCinematicWheelDelta(500, 0, 1000)).toBe(125);
    expect(normalizeCinematicWheelDelta(-500, 0, 1000)).toBe(-125);
  });
  it("normalizes line and page wheels before slowing them", () => {
    expect(normalizeCinematicWheelDelta(3, 1, 1000)).toBe(12);
    expect(normalizeCinematicWheelDelta(1, 2, 844)).toBe(211);
  });
  it("preserves small trackpad inputs and ignores non-finite deltas", () => {
    expect(normalizeCinematicWheelDelta(0.8, 0, 1000)).toBeCloseTo(0.2);
    expect(normalizeCinematicWheelDelta(Infinity, 0, 1000)).toBe(0);
    expect(normalizeCinematicWheelDelta(NaN, 0, 1000)).toBe(0);
  });
});
