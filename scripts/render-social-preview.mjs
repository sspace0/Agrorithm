import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const output = new URL("public/images/", root);
const sourceFiles = {
  logo: ["public/images/agrorithm-logo.png", "image/png"],
  earth: ["public/images/earth-poster.webp", "image/webp"],
  soil: ["public/images/root-zone-v2.webp", "image/webp"],
  sans: ["public/fonts/dm-sans-normal.woff2", "font/woff2"],
  serif: ["public/fonts/instrument-serif-italic.ttf", "font/ttf"],
};
const sources = {};
const manifest = {
  width: 1200,
  height: 630,
  renderer: "Playwright Chromium",
  sources: [],
  outputs: [],
  notes: "Original SVG composition using existing project assets. NASA Earth imagery is historical presentation material; soil and roots are illustrative. Existing asset and font terms remain applicable; see docs/ASSET_CREDITS.md.",
};
const digest = data => createHash("sha256").update(data).digest("hex");
for (const [key, [file, mime]] of Object.entries(sourceFiles)) {
  const bytes = await readFile(new URL(file, root));
  sources[key] = `data:${mime};base64,${bytes.toString("base64")}`;
  manifest.sources.push({ file, bytes: bytes.length, sha256: digest(bytes) });
}

// Self-contained SVG retains editable layout and renders without network requests.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title description">
<title id="title">Agrorithm — A different season starts here</title>
<desc id="description">Historical Earth observations connect with an illustrative crop-and-root cutaway in a scientific farm-planning experience.</desc>
<defs>
  <style>@font-face{font-family:PreviewSans;src:url('${sources.sans}') format('woff2')}@font-face{font-family:PreviewSerif;src:url('${sources.serif}') format('truetype');font-style:italic}text{font-family:'Century Gothic',PreviewSans,sans-serif}.serif{font-family:PreviewSerif,serif;font-style:italic}</style>
  <radialGradient id="space"><stop stop-color="#203e38"/><stop offset="1" stop-color="#071713"/></radialGradient>
  <linearGradient id="shade"><stop stop-color="#071713" stop-opacity="0"/><stop offset="1" stop-color="#071713" stop-opacity=".8"/></linearGradient>
  <filter id="wordmark"><feColorMatrix type="matrix" values="0 0 0 0 .88 0 0 0 0 .92 0 0 0 0 .79 0 0 0 1 0"/></filter>
</defs>
<rect width="1200" height="630" fill="#071713"/>
<ellipse cx="990" cy="190" rx="570" ry="420" fill="url(#space)"/>
<g fill="#d2e4bf" opacity=".48"><circle cx="671" cy="55" r="1.2"/><circle cx="1161" cy="144" r="1"/><circle cx="721" cy="122" r="1.2"/><circle cx="1058" cy="33" r=".9"/><circle cx="604" cy="197" r=".8"/><circle cx="119" cy="140" r=".9"/><circle cx="439" cy="57" r=".7"/></g>
<g fill="none" stroke="#8aa785" stroke-width="1" opacity=".17"><ellipse cx="995" cy="174" rx="218" ry="158" transform="rotate(-23 995 174)"/><ellipse cx="995" cy="174" rx="236" ry="173" transform="rotate(-23 995 174)"/></g>
<image href="${sources.earth}" x="832" y="10" width="330" height="330"/>
<path d="M690 329 C818 259 992 267 1117 332" stroke="#a9c38e" opacity=".34" fill="none" stroke-dasharray="3 8"/>
<image href="${sources.soil}" x="703" y="232" width="491" height="378"/>
<rect x="0" y="0" width="760" height="630" fill="url(#shade)" transform="rotate(180 380 315)"/>
<image href="${sources.logo}" x="64" y="37" width="250" height="100" filter="url(#wordmark)"/>
<text x="66" y="185" fill="#b9d09c" font-size="12" letter-spacing="3.8">FROM EARTH OBSERVATIONS TO YOUR FIELD</text>
<text x="59" y="280" fill="#e5ebd6" font-size="70" font-weight="400" letter-spacing="-3">A different</text>
<text x="62" y="352" fill="#e5ebd6" font-size="66" class="serif" letter-spacing="-1.6">season starts here.</text>
<text x="66" y="415" fill="#bacab7" font-size="20">Explore crop rotations, water and soil</text>
<text x="66" y="447" fill="#bacab7" font-size="20">with historical NASA observations.</text>
<g transform="translate(64 497)"><rect width="325" height="47" rx="23.5" fill="#ccddb0"/><text x="23" y="30" fill="#15392c" font-size="15">Explore the Punjab pilot</text><path d="M278 18h10v10m-10 0 10-10" fill="none" stroke="#15392c" stroke-width="1.6"/></g>
<rect x="0" y="575" width="1200" height="55" fill="#071713" fill-opacity=".96"/>
<path d="M65 575h1070" stroke="#8aa785" opacity=".25"/>
<text x="66" y="603" fill="#91a58b" font-size="12" letter-spacing=".4">NASA POWER / MERRA-2 · HLS vegetation · transparent screening</text>
<text x="1134" y="603" fill="#91a58b" font-size="11" text-anchor="end">NASA Earth imagery · illustrative soil geometry</text>
</svg>`;

await writeFile(new URL("social-preview.svg", output), svg);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>html,body{margin:0;width:1200px;height:630px;overflow:hidden}svg{display:block}</style></head><body>${svg}</body></html>`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.querySelectorAll("image")].map(image => new Promise((resolve, reject) => {
      const test = new Image(); test.onload = resolve; test.onerror = reject;
      test.src = image.getAttribute("href");
    })));
  });
  const bounds = await page.locator("svg").evaluate(element => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
    text: [...element.querySelectorAll("text")].map(text => ({
      text: text.textContent,
      bounds: { x: text.getBBox().x, y: text.getBBox().y, width: text.getBBox().width, height: text.getBBox().height },
    })),
  }));
  const clipped = bounds.text.filter(({ bounds: box }) => box.x < 0 || box.y < 0 || box.x + box.width > 1200 || box.y + box.height > 630);
  if (clipped.length) throw Error(`Social-preview text outside canvas: ${clipped.map(item => item.text).join("; ")}`);
  await page.screenshot({ path: fileURLToPath(new URL("social-preview.png", output)) });
  manifest.layout = { width: bounds.width, height: bounds.height, textElements: bounds.text.length, clippedText: clipped.length };
  const index = await readFile(new URL("index.html", root), "utf8");
  await page.setContent(index.match(/<head>([\s\S]*?)<\/head>/i)?.[0] ?? "");
  const metadata = await page.evaluate(() => ({
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    title: document.querySelector('meta[property="og:title"]')?.getAttribute("content"),
    description: document.querySelector('meta[property="og:description"]')?.getAttribute("content"),
    url: document.querySelector('meta[property="og:url"]')?.getAttribute("content"),
    image: document.querySelector('meta[property="og:image"]')?.getAttribute("content"),
    width: document.querySelector('meta[property="og:image:width"]')?.getAttribute("content"),
    height: document.querySelector('meta[property="og:image:height"]')?.getAttribute("content"),
    twitterCard: document.querySelector('meta[name="twitter:card"]')?.getAttribute("content"),
    twitterImage: document.querySelector('meta[name="twitter:image"]')?.getAttribute("content"),
  }));
  if (metadata.canonical !== "https://sspace0.github.io/Agrorithm/" || metadata.url !== metadata.canonical || metadata.width !== "1200" || metadata.height !== "630" || metadata.twitterCard !== "summary_large_image" || metadata.twitterImage !== metadata.image || !metadata.title?.includes("Agrorithm") || !metadata.description?.includes("historical NASA")) {
    throw Error("Social metadata is incomplete or inconsistent");
  }
  manifest.metadata = metadata;
  if (process.env.SOCIAL_PREVIEW_URL) {
    const base = new URL(process.env.SOCIAL_PREVIEW_URL);
    const response = await page.request.get(new URL("images/social-preview.png", base).href);
    const image = await response.body();
    if (!response.ok() || image.readUInt32BE(16) !== 1200 || image.readUInt32BE(20) !== 630) throw Error("Served social image failed HTTP/dimension checks");
    const html = await (await page.request.get(base.href)).text();
    if (!html.includes('property="og:image"') || !html.includes('name="twitter:card"')) throw Error("Served HTML lacks crawler-visible social metadata");
    manifest.servedCheck = { base: base.href, imageStatus: response.status(), width: image.readUInt32BE(16), height: image.readUInt32BE(20), crawlerVisibleMetadata: true };
  }
} finally { await browser.close(); }
for (const file of ["social-preview.svg", "social-preview.png"]) {
  const bytes = await readFile(new URL(file, output));
  manifest.outputs.push({ file: `public/images/${file}`, bytes: bytes.length, sha256: digest(bytes) });
}
await writeFile(new URL("social-preview.json", output), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ dimensions: "1200×630", outputs: manifest.outputs, layout: manifest.layout, metadata: manifest.metadata, servedCheck: manifest.servedCheck }, null, 2));
