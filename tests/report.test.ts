import { describe, expect, it } from "vitest";
import { display, linePaths, packMeasured, splitTableRow, splitText, summarizeWeather } from "../src/report/reportData";

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
});
