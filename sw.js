
const CACHE='fieldshift-d46c87df6b78';
const URLS=["/Agrorithm/assets/EarthCanvas-PwSUBDp3.js","/Agrorithm/assets/GLTFLoader-D5EWu5ZP.js","/Agrorithm/assets/index-BGgWyou1.css","/Agrorithm/assets/index-B_LGhW4T.js","/Agrorithm/assets/ModelScene-BvEi_kt5.js","/Agrorithm/assets/sensitivity.worker-CwWHgDgN.js","/Agrorithm/data/basemap-provenance.json","/Agrorithm/data/climate-legend.txt","/Agrorithm/data/climate-zones.json","/Agrorithm/data/feedback-template.md","/Agrorithm/data/hls-items.json","/Agrorithm/data/places.json","/Agrorithm/data/power-2018.json","/Agrorithm/data/power-2019.json","/Agrorithm/data/power-2020.json","/Agrorithm/data/power-2021.json","/Agrorithm/data/power-2022.json","/Agrorithm/data/power-2023.json","/Agrorithm/data/power-2024.json","/Agrorithm/data/provenance.json","/Agrorithm/data/vegetation.json","/Agrorithm/data/weather-patterns.json","/Agrorithm/data/weather.json","/Agrorithm/fonts/dm-sans-italic.woff2","/Agrorithm/fonts/dm-sans-normal.woff2","/Agrorithm/fonts/instrument-serif-italic.ttf","/Agrorithm/fonts/Instrument-Serif-OFL.txt","/Agrorithm/fonts/manifest.json","/Agrorithm/fonts/OFL.txt","/Agrorithm/fonts/serif-source.json","/Agrorithm/images/agrorithm-logo.png","/Agrorithm/images/agrorithm-mark.svg","/Agrorithm/images/blue-marble-2004-08.jpg","/Agrorithm/images/crop-landscape.webp","/Agrorithm/images/crops/citrus-thumb.webp","/Agrorithm/images/crops/citrus.webp","/Agrorithm/images/crops/maize-thumb.webp","/Agrorithm/images/crops/maize.webp","/Agrorithm/images/crops/mungbean-thumb.webp","/Agrorithm/images/crops/mungbean.webp","/Agrorithm/images/crops/rice-thumb.webp","/Agrorithm/images/crops/rice.webp","/Agrorithm/images/crops/sorghum-thumb.webp","/Agrorithm/images/crops/sorghum.webp","/Agrorithm/images/crops/tomato-thumb.webp","/Agrorithm/images/crops/tomato.webp","/Agrorithm/images/crops/wheat-thumb.webp","/Agrorithm/images/crops/wheat.webp","/Agrorithm/images/earth-2004.webp","/Agrorithm/images/earth-poster.webp","/Agrorithm/images/field-horizon.svg","/Agrorithm/images/groundwater-v2.webp","/Agrorithm/images/project-background.webp","/Agrorithm/images/report-cover.png","/Agrorithm/images/root-zone-v2.webp","/Agrorithm/index.html"];
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
    try{const response=await fetch(request);if(response.ok && new URL(request.url).pathname.startsWith('/Agrorithm/')){const cache=await caches.open(CACHE);await cache.put(request,response.clone());}return response;}
    catch{
      if(request.mode==='navigate')return (await caches.match('/Agrorithm/index.html'))||Response.error();
      return Response.error();
    }
  })());
});