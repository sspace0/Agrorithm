import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const base = process.env.VISUAL_QA_URL || "http://127.0.0.1:4173/Agrorithm/";
const out = path.resolve("docs/design/agrorithm/release");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch(), results = [];
for (const [name, width, height] of [["desktop",1440,1000],["tablet",768,1024],["phone",390,844]]) {
  const context = await browser.newContext({ viewport: {width,height}, serviceWorkers: "block" });
  const page = await context.newPage(), errors = [];
  page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/data/weather.json", async route=>{await new Promise(r=>setTimeout(r,1200));await route.continue();});
  await page.goto(base,{waitUntil:"domcontentloaded"});
  await page.locator(".boot-overlay").waitFor({state:"visible"});
  await page.screenshot({path:path.join(out,`${name}-loading.jpg`),quality:85});
  await page.locator(".boot-overlay").waitFor({state:"hidden",timeout:12000});
  for (const [phase,p] of [["space",0],["turn",.5],["map",.98]]) {
    await page.locator(".orbit-opening").evaluate((el,p)=>{const r=el.getBoundingClientRect(),pin=el.firstElementChild.getBoundingClientRect();scrollTo(0,scrollY+r.top-106+p*(r.height-pin.height));},p);
    await page.waitForTimeout(700);
    await page.screenshot({path:path.join(out,`${name}-${phase}.jpg`),quality:86});
    const bounds=await page.locator(".orbit-canvas").boundingBox();
    results.push({name,phase,width:bounds.width,viewport:width,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),errors:[...errors]});
  }
  await page.goto(`${base}#/about`);await page.locator(".boot-overlay").waitFor({state:"hidden"});
  await page.getByRole("heading", { name: "Team jt_1", exact: true }).waitFor();
  await page.waitForTimeout(650);
  const logo=page.locator(".about-hero img");
  if(!(await logo.getAttribute("src")).endsWith("agrorithm-logo.png")) throw Error("About logo mismatch");
  await page.screenshot({path:path.join(out,`${name}-about.jpg`),quality:85});
  await context.close();
}
await browser.close();fs.writeFileSync(path.join(out,"results.json"),JSON.stringify({date:new Date().toISOString(),base,results},null,2));
if(results.some(r=>r.overflow||r.errors.length||Math.abs(r.width-r.viewport)>1))throw Error("Release visual bounds failed");
console.log(`${results.length} opening frames checked; desktop/tablet/phone loading and About captured.`);
