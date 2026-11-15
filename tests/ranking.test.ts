import { describe, expect, it } from "vitest";
import { rankingReasons } from "../src/engine/ranking";
import { DEFAULT_SCENARIO, evaluate } from "../src/engine/engine";
import { EMPTY } from "../src/data/sample";

describe("withheld ranking explanations", () => {
  const result = evaluate(EMPTY, { id: "baseline", name: "Current", description: "", sequence: [] }, [], DEFAULT_SCENARIO, false);
  it("retains actual missing evidence and never invents a favorable score", () => {
    expect(rankingReasons(result, DEFAULT_SCENARIO)).toContain("The existing crop sequence has not been supplied.");
    expect(rankingReasons(result, DEFAULT_SCENARIO).some(reason => reason.includes("Missing dimensions"))).toBe(true);
    expect(result.score).toBeNull();
  });
  it("explains zero priorities and known hard constraints independently", () => {
    const reasons = rankingReasons({ ...result, constraints: ["Water budget exceeded"] }, { ...DEFAULT_SCENARIO, weights: { water: 0, cover: 0, diversity: 0, exposure: 0 } });
    expect(reasons).toContain("Water budget exceeded");
    expect(reasons.some(reason => reason.includes("All priority weights are zero"))).toBe(true);
  });
  it("does not claim ranked options are withheld", () => {
    expect(rankingReasons({ ...result, score: 50 }, DEFAULT_SCENARIO)).toEqual([]);
  });
});
