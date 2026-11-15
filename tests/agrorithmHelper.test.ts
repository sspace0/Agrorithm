import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { answerAgrorithmQuestion, historicalMonthFromQuestion } from "../src/engine/agrorithmHelper";
import { parseWeatherPatternModel } from "../src/engine/weatherPatterns";
const model=parseWeatherPatternModel(JSON.parse(readFileSync("public/data/weather-patterns.json","utf8")));
describe("Agrorithm on-device helper",()=>{
  it("answers exact greetings while preserving compound farming questions",()=>{
    for(const query of ["Hi","Hi, How are you?"])expect(answerAgrorithmQuestion(query,null).text).toContain("Hi!");
    expect(answerAgrorithmQuestion("Hi, explain irrigation water accounting",null).kind).toBe("source-guide");
  });
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
  it("answers both parts of the exact multiline tomato question with method limits and sources",()=>{
    const answer=answerAgrorithmQuestion("Explain irrigation water accounting\nbest water method for tomato",null);
    expect(answer.kind).toBe("source-guide");
    const sections=answer.sections!;
    expect(sections.some(s=>s.text.includes("millimetre"))).toBe(true);
    const method=sections.find(s=>s.title.includes("irrigation method"))!;
    expect(method.text).toContain("no universal best");
    expect(method.text).toContain("filtration");
    expect(method.text).toContain("NASA");
    expect(method.links[0].href).toBe("https://www.fao.org/4/s8684e/s8684e07.htm");
    expect(sections.some(s=>s.title.includes("Tomato")&&s.text.includes("400–800 mm"))).toBe(true);
  });
  it("keeps a resolved year for follow-up months and computes a real prior-year comparison",()=>{
    const july=answerAgrorithmQuestion("What was July 2023 like?",model);
    const august=answerAgrorithmQuestion("what about August?",model,july.context);
    expect(august.title).toContain("August 2023");
    expect(august.text).toContain("Assuming 2023");
    const comparison=answerAgrorithmQuestion("compare with last year",model,july.context);
    expect(comparison.title).toContain("July 2022");
    const current=model.observations.find(r=>r.month==="2023-07")!;
    const prior=model.observations.find(r=>r.month==="2022-07")!;
    expect(comparison.facts?.join(" ")).toContain((current.features.totalRainMm-prior.features.totalRainMm).toFixed(2));
    expect(comparison.text).toContain("cannot forecast");
    expect(answerAgrorithmQuestion("compare with last year",null,july.context).kind).toBe("model-required");
  });
  it("asks for dates when context is missing or the question is ambiguous",()=>{
    expect(answerAgrorithmQuestion("what about August?",model).kind).toBe("clarification");
    expect(answerAgrorithmQuestion("compare with last year",model).kind).toBe("clarification");
    expect(answerAgrorithmQuestion("July and August 2023",model,{month:"2023-07"}).kind).toBe("clarification");
    expect(answerAgrorithmQuestion("compare with last year",model,{month:"2018-07"}).kind).toBe("unavailable");
  });
  it("composes separate guide topics, carries topic follow-ups and compares crop references",()=>{
    const answer=answerAgrorithmQuestion("Explain NDVI and groundwater",null);
    expect(answer.sections).toHaveLength(2);
    expect(answer.sections?.every(s=>s.links.some(l=>l.href.startsWith("https:")))).toBe(true);
    expect(answerAgrorithmQuestion("tell me more",null,answer.context).sections).toHaveLength(2);
    const crops=answerAgrorithmQuestion("Compare corn and wheat water requirements",null);
    expect(crops.sections?.some(s=>s.title.includes("Maize")&&s.text.includes("500–800 mm"))).toBe(true);
    expect(crops.sections?.some(s=>s.title.includes("Wheat")&&s.text.includes("450–650 mm"))).toBe(true);
    expect(crops.sections?.every(s=>s.links.length>0)).toBe(true);
    expect(answerAgrorithmQuestion("Predict tomato yield",model).kind).toBe("scope");
  });
});
