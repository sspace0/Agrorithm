import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
const deployment=JSON.parse(await fs.readFile(new URL("../../deployment.config.json",import.meta.url),"utf8"));
const base=process.env.VISUAL_QA_URL||`http://127.0.0.1:4173${deployment.base}`;
const output=new URL("../../docs/design/agrorithm/learning/",import.meta.url);
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[];
try{
  for(const[name,width,height]of[["desktop",1440,1000],["tablet",768,1024],["phone",390,844]]){
    const context=await browser.newContext({viewport:{width,height},serviceWorkers:"block"});
    await context.addInitScript(()=>localStorage.setItem("fieldshift-quality","static"));
    const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.goto(`${base}#/weather-patterns`);await page.locator(".boot-overlay").waitFor({state:"hidden"});
    await page.getByRole("heading",{name:"Every month has a pattern."}).waitFor();await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:fileURLToPath(new URL(`${name}-page.jpg`,output)),quality:84});
    const trigger=page.getByRole("button",{name:"Ask Agrorithm",exact:true}),bounds=await trigger.boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(44);expect(bounds.height).toBeGreaterThanOrEqual(44);
    await trigger.click();const dialog=page.getByRole("dialog",{name:"Ask Agrorithm",exact:true});
    await expect(dialog).toBeVisible();await expect(page.getByLabel("Your question",{exact:true})).toBeFocused();
    await page.getByLabel("Your question",{exact:true}).fill("What was July 2023 like?");await page.getByRole("button",{name:"Send question",exact:true}).click();
    const answer=page.locator(".agr-helper-answer").last();await expect(answer).toContainText("held out");await expect(answer).toContainText("31/31");
    const visibleHeading=await answer.locator("h3").evaluate(el=>{const r=el.getBoundingClientRect(),log=document.querySelector(".agr-helper-log").getBoundingClientRect();return r.top>=log.top-1&&r.bottom<=log.bottom+1;});
    expect(visibleHeading).toBe(true);
    await page.screenshot({path:fileURLToPath(new URL(`${name}-helper.jpg`,output)),quality:86});
    await page.keyboard.press("Escape");await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
    await page.getByRole("link",{name:"Help",exact:true}).click();await page.waitForTimeout(650);await trigger.click();await expect(page.locator(".agr-helper-user")).toHaveCount(1);
    await page.getByLabel("Your question",{exact:true}).fill("Predict crop yield for July 2025");await page.getByRole("button",{name:"Send question",exact:true}).click();await expect(page.locator(".agr-helper-answer").last()).toContainText("cannot forecast");
    await page.screenshot({path:fileURLToPath(new URL(`${name}-scope.jpg`,output)),quality:85});
    await context.setOffline(true);await page.getByLabel("Your question",{exact:true}).fill("Explain irrigation water accounting");await page.getByRole("button",{name:"Send question",exact:true}).click();await expect(page.locator(".agr-helper-answer").last()).toContainText("millimetre");
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    expect(overflow).toBe(false);expect(errors).toEqual([]);results.push({name,trigger:bounds,errors,visibleHeading,offlineGuide:true,preservedAcrossNavigation:true,overflow});await context.close();
  }
}finally{await browser.close();}
await fs.writeFile(new URL("helper-qa.json",output),JSON.stringify({date:new Date().toISOString(),base,results},null,2));
console.log(`${results.length} actual helper viewports passed: O target, learned answer, visible title, keyboard/focus, navigation continuity, scope, offline guide and overflow.`);
