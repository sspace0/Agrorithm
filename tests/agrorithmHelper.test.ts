import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { answerAgrorithmQuestion, historicalMonthFromQuestion } from "../src/engine/agrorithmHelper";
import { parseWeatherPatternModel } from "../src/engine/weatherPatterns";
const model=parseWeatherPatternModel(JSON.parse(readFileSync("public/data/weather-patterns.json","utf8")));
describe("Agrorithm on-device helper",()=>{
  it("parses named and ISO months and requests clarification for ambiguity",()=>{
    expect(historicalMonthFromQuestion("What was July 2023 like?").month).toBe("2023-07");
    expect(historicalMonthFromQuestion("Show 2023-07").month).toBe("2023-07");
    expect(historicalMonthFromQuestion("July and August 2023").ambiguous).toBe(true);
    expect(historicalMonthFromQuestion("rain in 2023").needsDate).toBe(true);
  });
  it("uses the trained centers and genuine observations for a heldout answer",()=>{
    const answer=answerAgrorithmQuestion("What was July 2023 like?",model);
    expect(answer.kind).toBe("learned-pattern");
    expect(answer.text).toContain("held out");
    expect(answer.facts?.some(f=>f.includes("31/31"))).toBe(true);
    expect(answer.links[0].href).toBe("#/weather-patterns");
  });
  it("does not turn a named date into an unsupported forecast or yield prediction",()=>{
    for(const query of ["Predict July 2025 weather", "What crop yield in July 2023?", "Which crop should I plant?", "What is my farm's water table depth?"]) expect(answerAgrorithmQuestion(query,model).kind).toBe("scope");
    expect(answerAgrorithmQuestion("What was July 2025 like?",model).kind).toBe("unavailable");
  });
  it("keeps the source guide working without a model or external service",()=>{
    const answer=answerAgrorithmQuestion("Explain irrigation water accounting",null);
    expect(answer.kind).toBe("source-guide");
    expect(answer.text).toContain("millimetre");
    expect(answer.links.some(l=>l.href.startsWith("https://www.fao.org"))).toBe(true);
    expect(answerAgrorithmQuestion("Explain the trained model",null).kind).toBe("model-required");
    expect(answerAgrorithmQuestion("Who won a football match?",model).kind).toBe("unavailable");
  });
});
