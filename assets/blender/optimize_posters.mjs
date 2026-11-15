// Resize the rendered source PNGs and encode portable WebP runtime derivatives.
// Run after both Blender generators: node assets/blender/optimize_posters.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const root = process.cwd();
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) { res.statusCode = 403; res.end(); return; }
  try { res.setHeader('Content-Type', 'image/png'); res.end(fs.readFileSync(file)); }
  catch { res.statusCode = 404; res.end(); }
}).listen(5190, '127.0.0.1');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5190/public/images/root-zone-v2.png');

async function encode(source, width, target) {
  const base64 = await page.evaluate(async ({ source, width }) => {
    const response = await fetch('/' + source);
    if (!response.ok) throw new Error('Missing source ' + source);
    const image = await createImageBitmap(await response.blob());
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(width, image.width);
    canvas.height = Math.round(image.height * canvas.width / image.width);
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/webp', .82).split(',')[1];
  }, { source, width });
  const bytes = Buffer.from(base64, 'base64'); fs.writeFileSync(target, bytes);
  return bytes.length;
}

try {
  const soilPath = 'assets/blender/validation-v2.json';
  const soil = JSON.parse(fs.readFileSync(soilPath, 'utf8'));
  for (const item of soil.scenes) item.runtimePosterWebpBytes = await encode(`public/images/${item.scene}.png`, 1200, `public/images/${item.scene}.webp`);
  soil.posterProcessing = { encoder: 'Chromium canvas WebP', browser: await browser.version(), quality: .82, maxWidth: 1200 };
  fs.writeFileSync(soilPath, JSON.stringify(soil, null, 2));
  const cropsPath = 'assets/blender/validation-crops.json';
  const crops = JSON.parse(fs.readFileSync(cropsPath, 'utf8'));
  for (const item of crops.crops) {
    item.runtimePosterWebpBytes = await encode(`public/images/crops/${item.crop}.png`, 640, `public/images/crops/${item.crop}.webp`);
    item.selectorThumbnailWebpBytes = await encode(`public/images/crops/${item.crop}.png`, 128, `public/images/crops/${item.crop}-thumb.webp`);
  }
  crops.posterProcessing = { encoder: 'Chromium canvas WebP', browser: await browser.version(), quality: .82, maxWidth: 640, thumbnailWidth: 128 };
  fs.writeFileSync(cropsPath, JSON.stringify(crops, null, 2));
  console.log(JSON.stringify({ soil: soil.scenes.map(x => ({ scene: x.scene, webpBytes: x.runtimePosterWebpBytes })), crops: crops.crops.map(x => ({ crop: x.crop, webpBytes: x.runtimePosterWebpBytes, thumbnailBytes: x.selectorThumbnailWebpBytes })) }));
} finally { await browser.close(); server.close(); }
