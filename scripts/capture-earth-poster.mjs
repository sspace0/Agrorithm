import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const base = process.env.VISUAL_QA_URL || "http://127.0.0.1:4173/FieldShift/";
await mkdir(".cache", { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  await page.goto(base);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForSelector(".orbit-canvas canvas");
  await page.waitForFunction(() => !document.querySelector(".earth-poster"));
  await page.waitForTimeout(500);
  await page.addStyleTag({ content: ".orbit-title,.orbit-meta,.orbit-bottom,.orbit-progress,.site-header,.orbit-atlas-copy,.orbit-backdrop{visibility:hidden!important}html,body,.app,.experience-home,.orbit-opening,.orbit-pinned{background:transparent!important}" });
  await page.locator(".orbit-canvas").screenshot({ path: ".cache/earth-transparent.png", omitBackground: true });
} finally {
  await browser.close();
}
console.log("Captured the actual transparent Earth renderer. Run scripts/prepare-exhibition-assets.py for the runtime WebP.");
