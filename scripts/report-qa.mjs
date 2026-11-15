import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const base = process.env.REPORT_QA_URL || "http://127.0.0.1:4173/Agrorithm/";
const fixture = process.argv.find(a => a.startsWith("--fixture="))?.slice(10);
const output = fixture ? `.cache/report/final-${fixture}.pdf` : "output/pdf/Agrorithm-sample-report.pdf";
const evidence = fixture ? `.cache/report/final-${fixture}.json` : "docs/design/agrorithm/report-final/results.json";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
const errors = [], failedAssets = [];
page.on("pageerror", e => errors.push(e.message));
page.on("response", r => { if (r.status() >= 400) failedAssets.push({ url: r.url(), status: r.status() }); });
try {
  await page.addInitScript(() => localStorage.setItem("fieldshift-quality", "static"));
  if (fixture) await page.goto(`${base}.cache/report/preview.html?case=${fixture}`);
  else {
    await page.goto(base);
    await page.locator(".boot-overlay").waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Try a sample farm", exact: true }).click();
    await page.goto(`${base}#/studio/export`);
  }
  await page.waitForFunction(() => document.querySelector(".agr-report")?.getAttribute("data-report-ready") === "true");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll(".agr-report img")].map(img => img.decode()));
    window.dispatchEvent(new Event("agrorithm-report-remeasure"));
  });
  await page.waitForTimeout(200);
  const geometry = await page.locator(".agr-report-page:not(.agr-report-cover)").evaluateAll(pages => pages.flatMap((p, i) => {
    const issues = [], body = p.querySelector(".agr-page-body"), b = body.getBoundingClientRect();
    for (const block of body.children) { const r = block.getBoundingClientRect(); if (r.top < b.top - 1 || r.bottom > b.bottom + 1 || r.left < b.left - 1 || r.right > b.right + 1) issues.push("body block overflow"); }
    if (p.querySelector(".agr-page-header > div").getBoundingClientRect().bottom > b.top + 1) issues.push("header overlaps body");
    for (const img of body.querySelectorAll("img")) { const host = img.closest(".agr-crop-image,.agr-model-panel"), r = img.getBoundingClientRect(), h = host?.getBoundingClientRect(); if (h && (r.left < h.left - 1 || r.right > h.right + 1 || r.top < h.top - 1 || r.bottom > h.bottom + 1)) issues.push("image outside figure frame"); }
    for (const svg of body.querySelectorAll("svg.agr-chart")) {
      const { width, height } = svg.viewBox.baseVal;
      for (const el of svg.querySelectorAll("text,path,line,circle,rect")) {
        const r = el.getBBox();
        if (r.width + r.height > 0 && (r.x < 30 || r.y < 30 || r.x + r.width > width - 30 || r.y + r.height > height - 30)) issues.push(`chart safe area: ${el.tagName} ${el.textContent?.slice(0, 35)}`);
      }
    }
    return issues.length ? [{ page: i + 2, issues }] : [];
  }));
  const oversized = await page.locator(".agr-report").getAttribute("data-oversized-blocks");
  const pages = await page.locator(".agr-report-page").count();
  const charts = await page.locator(".agr-report-page svg.agr-chart").count();
  const cropImages = await page.locator(".agr-report-page .agr-crop-image img").count();
  if (geometry.length || oversized || errors.length || failedAssets.length) throw Error(JSON.stringify({ geometry, oversized, errors, failedAssets }));
  if (!fixture && (charts < 7 || cropImages < 4)) throw Error(`Incomplete sample report: ${charts} charts / ${cropImages} crop images`);
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ path: output, preferCSSPageSize: true, printBackground: true, tagged: true });
  const pdfPages = [...pdf.toString("latin1").matchAll(/\/Type\s*\/Page\b/g)].length;
  if (pdfPages !== pages || await page.locator(".agr-report-page").count() !== pages) throw Error(`Print changed the measured snapshot: ${pages} layout pages / ${pdfPages} actual PDF pages`);
  const result = { generated: new Date().toISOString(), base, fixture: fixture || "genuine sample with declared farm assumptions", pages, pdfPages, bytes: fs.statSync(output).size, geometry, oversized, errors, failedAssets, charts, cropImages };
  fs.mkdirSync(path.dirname(evidence), { recursive: true });
  fs.writeFileSync(evidence, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
