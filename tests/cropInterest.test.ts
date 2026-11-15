import { describe, expect, it } from "vitest";
import { SAMPLE } from "../src/data/sample";
import { cropInterestScope, isCropInterest, withCropInterest } from "../src/engine/cropInterest";
import { validateFarm } from "../src/engine/import";

describe("crop-library planning handoff", () => {
  it("records an annual interest without replacing field inputs or its baseline", () => {
    const farm = structuredClone(SAMPLE), original = structuredClone(farm);
    const result = withCropInterest(farm, "mung");
    expect(result).toEqual({ ...original, cropInterest: "mung" });
    expect(result.sequence).toBe(farm.sequence);
    expect(farm).toEqual(original);
  });
  it("round-trips a fruit interest through plan import and allows clearing it", () => {
    const farm = withCropInterest(structuredClone(SAMPLE), "citrus");
    expect(validateFarm(JSON.parse(JSON.stringify(farm))).cropInterest).toBe("citrus");
    expect(withCropInterest(farm, "").cropInterest).toBeUndefined();
  });
  it("rejects unknown imported preferences rather than silently substituting a crop", () => {
    expect(() => withCropInterest(SAMPLE, "unknown crop")).toThrow("Unknown crop");
    expect(() => validateFarm({ ...SAMPLE, cropInterest: "unknown crop" })).toThrow("Unknown crop");
    expect(isCropInterest(null)).toBe(false);
    expect(isCropInterest("mango")).toBe(true);
  });
  it("keeps reference and perennial scope separate from supported annual crops", () => {
    expect(cropInterestScope("maize")).toBe("annual");
    expect(cropInterestScope("wheat")).toBe("annual");
    expect(cropInterestScope("mung")).toBe("annual");
    expect(cropInterestScope("citrus")).toBe("perennial");
    expect(cropInterestScope("mango")).toBe("perennial");
    expect(cropInterestScope("tomato")).toBe("reference");
    expect(cropInterestScope("chickpea")).toBe("reference");
  });
});
