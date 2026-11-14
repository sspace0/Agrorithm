import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Script } from "node:vm";
const base = process.env.DEPLOY_BASE || "/FieldShift/";
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
const urls = paths.map((p) => base + p.slice(5));
const source = `
const CACHE='fieldshift-${version.digest("hex").slice(0, 12)}';
const URLS=${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('fieldshift-')&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith((async () => {
    const cached=await caches.match(request,{ignoreVary:true});
    if(cached)return cached;
    try{return await fetch(request);}
    catch{
      if(request.mode==='navigate')return (await caches.match('${base}index.html'))||Response.error();
      return Response.error();
    }
  })());
});`;
new Script(source);
await writeFile("dist/sw.js", source);
console.log(`Offline cache: ${urls.length} static files, scope ${base}`);
