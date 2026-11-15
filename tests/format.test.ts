import { describe, expect, it } from "vitest";
import { formatNumber } from "../src/engine/format";
describe("display precision", () => {
  it("caps fractions at two places without changing the input", () => {
    const value = 1234.56789;
    expect(formatNumber(value, " mm")).toBe("1,234.57 mm");
    expect(value).toBe(1234.56789);
    expect(formatNumber(0.00345)).toBe("0");
    expect(formatNumber(-0)).toBe("0");
  });
  it("keeps unknown and invalid values out of numeric displays", () => {
    [null, undefined, NaN, Infinity, -Infinity].forEach(v => expect(formatNumber(v)).toBe("Unknown"));
    expect(formatNumber(0)).toBe("0");
  });
});
