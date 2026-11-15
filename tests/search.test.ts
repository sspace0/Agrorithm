import { describe, expect, it } from "vitest";
import { parseCoordinates, parsePlaces } from "../src/engine/locations";
import { GUIDE, searchText } from "../src/data/guide";
describe("location entry and provider boundaries", () => {
  it("accepts signed decimal coordinates and rejects out-of-range or incomplete values", () => {
    expect(parseCoordinates(" -33.9, 151.2 ")).toMatchObject({
      latitude: -33.9,
      longitude: 151.2,
    });
    expect(parseCoordinates("0,0")).toMatchObject({
      latitude: 0,
      longitude: 0,
    });
    for (const value of [
      "91,10",
      "32,181",
      "32.1",
      "Lahore",
      "NaN,0",
      "32,73 extra",
    ])
      expect(parseCoordinates(value)).toBeNull();
  });
  it("drops malformed provider rows without inventing coordinates", () => {
    expect(
      parsePlaces({
        results: [
          { name: "A", latitude: 32, longitude: 73 },
          { name: "B", latitude: null, longitude: 3 },
          { name: "C", latitude: 91, longitude: 1 },
          { name: "D", latitude: "1", longitude: 2 },
        ],
      }),
    ).toEqual([{ name: "A", latitude: 32, longitude: 73 }]);
    expect(parsePlaces({ error: true })).toEqual([]);
  });
});
describe("curated question search", () => {
  it("finds a natural-language water question and a corn synonym, while leaving unsupported subjects unmatched", () => {
    const water = GUIDE.filter((g) =>
      searchText(
        "How much water does my crop need?",
        `${g.title} ${g.answer} ${g.tags}`,
      ),
    );
    expect(water.some((g) => g.id === "water")).toBe(true);
    expect(searchText("corn", "maize crop reference")).toBe(true);
    expect(
      GUIDE.filter((g) =>
        searchText("quasars", `${g.title} ${g.answer} ${g.tags}`),
      ),
    ).toHaveLength(0);
  });
});
