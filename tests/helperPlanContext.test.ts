import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SAMPLE, EMPTY } from "../src/data/sample";
import { compare, DEFAULT_SCENARIO } from "../src/engine/engine";
import { parseWeather } from "../src/engine/import";
import { answerAgrorithmQuestion } from "../src/engine/agrorithmHelper";
import { createHelperPlanContext, rankingReasons } from "../src/engine/helperPlanContext";
import { formatNumber } from "../src/engine/format";

const weather = parseWeather(readFileSync("public/data/weather.json", "utf8"));
const scenario = structuredClone(DEFAULT_SCENARIO);
const results = compare(SAMPLE, weather, scenario);
const context = createHelperPlanContext(SAMPLE, scenario, results, weather, "NASA POWER · genuine cached observation", true);

describe("local result explanations", () => {
  it("reads actual computed values without a language model or historical model file", () => {
    const answer = answerAgrorithmQuestion("Explain my results", null, {plan:context});
    expect(answer.kind).toBe("plan-results");
    expect(answer.sections).toHaveLength(results.length + 1);
    expect(answer.text).toContain("2018-01-01–2024-12-31");
    expect(answer.text).toContain("not direct observations");
    for (const result of results) {
      const section = answer.sections!.find(section => section.title === result.name)!;
      expect(section.text).toContain(`${formatNumber(result.delivered)} mm`);
      expect(section.text).toContain(`${formatNumber(result.volume)} m³`);
      expect(section.text).toContain("July 2021–June 2024");
      expect(section.text).toContain("These proxies do not measure soil health");
    }
  });
  it("explains exact unresolved inputs and never invents a score", () => {
    const unresolved = compare(EMPTY, [], scenario);
    const missing = createHelperPlanContext(EMPTY, scenario, unresolved, [], "Weather unavailable", false);
    const answer = answerAgrorithmQuestion("Why is my current sequence not ranked?", null, {plan:missing});
    expect(answer.sections).toHaveLength(2);
    expect(answer.sections![0].text).toContain("Not ranked");
    expect(answer.sections![0].text).toContain("existing crop sequence has not been supplied");
    expect(answer.sections![0].text).toContain("Delivery efficiency unknown");
    expect(answer.sections![0].text).toContain("Delivered irrigation estimate: Unknown");
    expect(answer.sections!.at(-1)!.text).toContain("does not match");
  });
  it("includes hard constraints independently of priorities", () => {
    const constrained = structuredClone(SAMPLE);
    constrained.waterLimitMm = 1;
    const calculated = compare(constrained, weather, scenario);
    expect(calculated[0].status).toBe("infeasible");
    const snapshot = createHelperPlanContext(constrained, scenario, calculated, weather, "NASA POWER cached", true);
    const answer = answerAgrorithmQuestion("Explain these results", null, {plan:snapshot});
    expect(answer.sections![0].text).toContain(calculated[0].constraints[0]);
    expect(answer.sections![0].text).toContain("scenario water limit: 1 mm");
  });
  it("distinguishes zero priorities from missing evidence and screening failures", () => {
    const zero = {...scenario,weights:{water:0,cover:0,diversity:0,exposure:0}};
    const calculated = compare(SAMPLE,weather,zero);
    expect(calculated[0].status).toBe("feasible");
    expect(calculated[0].score).toBeNull();
    expect(rankingReasons(calculated[0],zero)).toEqual(["All priority weights are zero. Set at least one priority to calculate the optional index."]);
    expect(rankingReasons(results[0],scenario)).toEqual([]);
  });
  it("takes a detached snapshot, preserves question scope and requests missing context", () => {
    const copy = createHelperPlanContext(SAMPLE, scenario, results, weather, "NASA POWER cached", true);
    copy.results[0].constraints.push("Synthetic test constraint");
    expect(results[0].constraints).not.toContain("Synthetic test constraint");
    expect(answerAgrorithmQuestion("Predict the best crop yield from my results",null,{plan:context}).kind).toBe("scope");
    expect(answerAgrorithmQuestion("Explain my results",null).text).toContain("will not guess");
    expect(answerAgrorithmQuestion("Explain ranking",null).kind).toBe("source-guide");
  });
});
