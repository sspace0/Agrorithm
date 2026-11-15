import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { SAMPLE } from "../../src/data/sample";
import { compare, DEFAULT_SCENARIO } from "../../src/engine/engine";
import { parseWeather } from "../../src/engine/import";
import { createHelperPlanContext } from "../../src/engine/helperPlanContext";
import { formatNumber } from "../../src/engine/format";

test.use({serviceWorkers:"block"});
const weather = parseWeather(readFileSync("public/data/weather.json", "utf8"));
// A constrained test field exercises the real engine; it is not part of public sample data.
const farm = {...structuredClone(SAMPLE),waterLimitMm:1};
const scenario = structuredClone(DEFAULT_SCENARIO);
const results = compare(farm,weather,scenario);
const snapshot = createHelperPlanContext(farm,scenario,results,weather,"NASA POWER · genuine cached observation",true);

for(const viewport of [{width:1440,height:1000},{width:390,height:844}]) {
  test(`helper opens exact computed results and ranking reasons at ${viewport.width}px`,async({page})=>{
    await page.setViewportSize(viewport);
    await page.goto("./#/help");
    await page.locator(".boot-overlay").waitFor({state:"hidden"});
    await page.evaluate(context=>window.dispatchEvent(new CustomEvent("agrorithm-request-help",{detail:{context,question:"Explain my results"}})),snapshot);
    const dialog=page.getByRole("dialog",{name:"Ask Agrorithm"});
    await expect(dialog).toBeVisible();
    const answer=page.locator(".agr-helper-answer").last();
    await expect(answer).toContainText("YOUR COMPUTED PLAN SNAPSHOT");
    await expect(answer).toContainText("2018-01-01–2024-12-31");
    await expect(answer).toContainText(`${formatNumber(results[0].delivered)} mm`);
    await expect(answer).toContainText(results[0].constraints[0]);
    await expect(answer).toContainText("scenario water limit: 1 mm");
    await page.screenshot({path:`test-results/helper-results-${viewport.width}.png`});
    const input=page.getByLabel("Your question",{exact:true});
    await input.fill("Why is my current sequence not ranked?");
    await page.getByRole("button",{name:"Send question",exact:true}).click();
    const why=page.locator(".agr-helper-answer").last();
    await expect(why.locator(".agr-helper-section")).toHaveCount(2);
    await expect(why).toContainText(results[0].constraints[0]);
    await expect(why).toContainText("Not ranked");
    await page.getByRole("button",{name:"Clear conversation",exact:true}).click();
    await input.fill("Explain my results");
    await page.getByRole("button",{name:"Send question",exact:true}).click();
    await expect(page.locator(".agr-helper-answer").last()).toContainText("scenario water limit: 1 mm");
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
    const rect=await dialog.boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.x+rect!.width).toBeLessThanOrEqual(viewport.width+1);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
  test(`inline result helper restores its own opener without jumping at ${viewport.width}px`,async({page})=>{
    await page.setViewportSize(viewport);
    await page.goto("./#/studio/setup");
    await page.locator(".boot-overlay").waitFor({state:"hidden"});
    await page.getByRole("button",{name:"Load sample",exact:true}).click();
    await expect(page.locator(".comparison-option")).toHaveCount(3);
    const opener=page.getByRole("button",{name:"Explain my results",exact:true});
    await opener.scrollIntoViewIfNeeded();
    await opener.evaluate(element=>element.addEventListener("click",()=>{element.dataset.helperOpenScroll=String(scrollY);},{capture:true,once:true}));
    await opener.click();
    const before=Number(await opener.getAttribute("data-helper-open-scroll"));
    const dialog=page.getByRole("dialog",{name:"Ask Agrorithm"});
    await expect(dialog).toBeVisible();
    await expect(page.locator(".agr-helper-answer").last()).toContainText("YOUR COMPUTED PLAN SNAPSHOT");
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
    expect(Math.abs(await page.evaluate(()=>scrollY)-before)).toBeLessThan(3);
  });
}
