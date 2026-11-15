import { describe, expect, it } from "vitest";
import { display, finiteExtent, linePaths, packMeasured, splitTableRow, splitText, summarizeWeather } from "../src/report/reportData";
import { chartNumber, rangeFraction, wrapChartLabel } from "../src/report/chartLayout";

describe("presentation report data and pagination", () => {
  it("preserves all characters when dividing long input or an unbroken polygon", () => {
    for (const text of ["farmer note with spaces. ".repeat(200), "1234567890".repeat(1000)]) expect(splitText(text, 300).join("")).toBe(text);
    const row = ["source", "https://example.test/" + "a".repeat(1800)];
    const split = splitTableRow(row, [50, 300]);
    expect(split.map(r => r[1]).join("")).toBe(row[1]);
  });
  it("reserves a repeated table header when a row moves to a new page", () => {
    const pages = packMeasured([{height:320,table:"a",headerHeight:60},{height:320,table:"a",headerHeight:60},{height:320,table:"a",headerHeight:60},{height:100}], 752, 22);
    expect(pages).toEqual([[0,1],[2,3]]);
    expect(packMeasured([{height:700},{height:10,table:"b",headerHeight:60}],752,22)).toEqual([[0],[1]]);
  });
  it("keeps missing and zero distinct in labels and vector paths", () => {
    expect(display(null," mm")).toBe("Unknown");expect(display(0," mm")).toBe("0 mm");
    expect(linePaths([0,null,.5,1],i=>i*10,v=>v*100)).toEqual(["M0.00,0.00","M20.00,50.00 L30.00,100.00"]);
  });
  it("recognizes a complete leap February and suppresses partial monthly totals", () => {
    const rows=Array.from({length:29},(_,i)=>({date:`2024-02-${String(i+1).padStart(2,"0")}`,min:10,max:20,rain:1}));
    expect(summarizeWeather(rows).months[0]).toMatchObject({complete:true,rain:29,temperature:15,expectedDays:29});
    expect(summarizeWeather(rows.slice(1)).months[0]).toMatchObject({complete:false,rain:null,temperature:null});
    expect(summarizeWeather(rows.map((r,i)=>i===4?{...r,rain:null}:r)).complete).toBe(28);
  });
  it("wraps wide letters and unbroken Unicode labels inside a measured column", () => {
    const measure = (text: string) => Array.from(text).reduce((sum, c) => sum + (c === "W" ? 2 : 1), 0);
    for (const name of ["WWW WWW WWW WWW", "W".repeat(80), "🌾".repeat(50)]) {
      const lines = wrapChartLabel(name, 12, measure, 3);
      expect(lines.length).toBeLessThanOrEqual(3);
      expect(lines.every(line => measure(line) <= 12 && !line.includes("�"))).toBe(true);
      expect(lines.at(-1)).toContain("...");
    }
  });
  it("keeps a large number in scientific notation while preserving zero and missingness", () => {
    const measure = (text: string) => text.length;
    expect(chartNumber(1e24, " mm", 15, measure)).toBe("1.00e+24 mm");
    expect(chartNumber(0, " mm", 15, measure)).toBe("0 mm");
    expect(chartNumber(null, " mm", 15, measure)).toBe("Unknown");
    expect(chartNumber(Infinity, " mm", 15, measure)).toBe("Unknown");
  });
  it("keeps extreme numeric axis geometry finite and ordered", () => {
    expect(rangeFraction(-1e308, -1e308, 1e308)).toBe(0);
    expect(rangeFraction(0, -1e308, 1e308)).toBe(.5);
    expect(rangeFraction(1e308, -1e308, 1e308)).toBe(1);
    const [low, high] = finiteExtent([Number.MAX_VALUE]);
    expect(Number.isFinite(low) && Number.isFinite(high) && high > low).toBe(true);
  });
});
