import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Script } from "node:vm";
const deployment = JSON.parse(await readFile(new URL("../deployment.config.json", import.meta.url), "utf8"));
const base = process.env.DEPLOY_BASE || deployment.base;
if (!base.startsWith("/") || !base.endsWith("/"))
  throw Error("DEPLOY_BASE must start and end with /");
async function files(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? files(`${dir}/${e.name}`) : `${dir}/${e.name}`,
      ),
    )
  ).flat();
}
const paths = (await files("dist")).filter((p) => !p.endsWith("sw.js"));
const version = createHash("sha256");
for (const p of paths) version.update(await readFile(p));
// Keep the complete planning sample offline without downloading optional 3D assets.
// Models and large source posters enter the runtime cache only after an explicit visit.
const urls = paths
  .filter(
    (p) =>
      !p.includes("/models/") &&
      !p.includes("/nasa-helper-model/") &&
      !/generative-|ort-wasm-/.test(p) &&
      !/social-preview\./.test(p) &&
      (!p.endsWith(".png") ||
        /images\/(agrorithm-logo|report-cover)\.png$/.test(p)) &&
      !/images\/(root-zone|groundwater)\.webp$/.test(p),
  )
  .map((p) => base + p.slice(5));
const source = `
const PREFIX='agrorithm-v2-${base.replace(/[^a-z0-9]/gi, "_")}-';
const CACHE=PREFIX+'${version.digest("hex").slice(0, 12)}';
const URLS=${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE&&(key.startsWith(PREFIX)||key.startsWith('fieldshift-'))).map(async key=>{
      const cache=await caches.open(key);
      const requests=await cache.keys();
      if(requests.some(request=>new URL(request.url).pathname.startsWith('${base}')))await caches.delete(key);
    }));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith((async () => {
    const cache=await caches.open(CACHE);
    if(request.mode==='navigate'){
      try{const response=await fetch(request,{cache:'no-cache'});if(response.ok){await cache.put('${base}index.html',response.clone());return response;}return (await cache.match('${base}index.html'))||response;}
      catch{return (await cache.match('${base}index.html'))||Response.error();}
    }
    const cached=await cache.match(request,{ignoreVary:true});
    if(cached)return cached;
    try{const response=await fetch(request);if(response.ok && new URL(request.url).pathname.startsWith('${base}')){const cache=await caches.open(CACHE);await cache.put(request,response.clone());}return response;}
    catch{
      if(request.mode==='navigate')return (await caches.match('${base}index.html'))||Response.error();
      return Response.error();
    }
  })());
});`;
new Script(source);
await writeFile("dist/sw.js", source);
console.log(`Offline cache: ${urls.length} static files, scope ${base}`);
