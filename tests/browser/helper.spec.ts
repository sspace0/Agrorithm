import { test, expect } from "@playwright/test";
// Request-failure fixtures must bypass a legitimately precached model response.
test.use({ serviceWorkers: "block" });

test("separate floating botanical O opens a local helper with keyboard focus and navigation continuity",async({page})=>{
  await page.goto("./#/help");
  await page.locator(".boot-overlay").waitFor({state:"hidden"});
  const trigger=page.getByRole("button",{name:"Ask Agrorithm",exact:true});
  const bounds=await trigger.boundingBox();
  expect(bounds!.width).toBeGreaterThanOrEqual(52);expect(bounds!.height).toBeGreaterThanOrEqual(52);
  expect(await trigger.evaluate(el=>!!el.closest(".site-header"))).toBe(false);
  await trigger.click();
  const dialog=page.getByRole("dialog",{name:"Ask Agrorithm",exact:true});
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/#\/help/);
  await expect(page.getByLabel("Your question",{exact:true})).toBeFocused();
  await page.getByLabel("Your question",{exact:true}).fill("What was July 2023 like?");
  await page.getByRole("button",{name:"Send question",exact:true}).click();
  await expect(page.locator(".agr-helper-answer").last()).toContainText("held out");
  await expect(page.locator(".agr-helper-answer").last()).toContainText("31/31");
  await page.keyboard.press("Escape");await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
  await page.getByRole("link",{name:"Map",exact:true}).click();
  await trigger.click();await expect(page.locator(".agr-helper-user")).toHaveCount(1);
  await page.getByLabel("Your question",{exact:true}).fill("Predict crop yield for July 2025");
  await page.getByRole("button",{name:"Send question",exact:true}).click();
  await expect(page.locator(".agr-helper-answer").last()).toContainText("cannot forecast");
});

test("source answers remain available when the learned-model file fails",async({page})=>{
  let rejectedModelRequests = 0;
  await page.setViewportSize({width:390,height:844});
  await page.route("**/data/weather-patterns.json",route=>{rejectedModelRequests++;return route.fulfill({status:404,body:"Not found"});});
  await page.goto("./#/help");await page.locator(".boot-overlay").waitFor({state:"hidden"});
  await page.getByRole("button",{name:"Ask Agrorithm",exact:true}).click();
  await page.getByLabel("Your question",{exact:true}).fill("Explain irrigation water accounting");
  await page.getByRole("button",{name:"Send question",exact:true}).click();
  await expect(page.locator(".agr-helper-answer").last()).toContainText("millimetre");
  await page.getByLabel("Your question",{exact:true}).fill("What was July 2023 like?");
  await page.getByRole("button",{name:"Send question",exact:true}).click();
  await expect(page.locator(".agr-helper-answer").last()).toContainText("could not load");
  expect(rejectedModelRequests).toBeGreaterThan(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);
});
