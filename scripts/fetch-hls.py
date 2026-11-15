"""Acquire small HLS L30 v2.0 windows through NASA's Microsoft mirror.
Requires Python 3.12+, numpy and rasterio. No Earthdata key; temporary mirror
read signatures stay in process memory and are never written to project files.
"""
import json,urllib.request,urllib.parse,hashlib,time
from pathlib import Path
import numpy as np
import rasterio
from rasterio.warp import transform
from rasterio.windows import Window
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/data';OUT.mkdir(parents=True,exist_ok=True)
def get(url):
 for attempt in range(3):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'FieldShift-research/0.1'}),timeout=90) as r:return json.load(r)
  except urllib.error.HTTPError as e:
   if e.code in [429,503] and attempt<2:time.sleep(min(60,int(e.headers.get('Retry-After','30'))));continue
   raise
search='https://planetarycomputer.microsoft.com/api/stac/v1/search?collections=hls2-l30&bbox=72.998,32.098,73.002,32.102&datetime=2023-01-01T00:00:00Z/2024-01-01T00:00:00Z&limit=100'
stac=get(search)
if any(x['rel']=='next' for x in stac['links']):raise RuntimeError('Pagination required; refusing truncated acquisition')
observations=[];footprint=None;failures=[]
first_href=stac['features'][0]['assets']['B04']['href']
signed=get('https://planetarycomputer.microsoft.com/api/sas/v1/sign?href='+urllib.parse.quote(first_href,safe=''))['href']
sas=urllib.parse.urlsplit(signed).query
if urllib.parse.parse_qs(sas).get('sr')!=['c']:raise RuntimeError('Expected mirror container-scoped read signature')
for item in sorted(stac['features'],key=lambda x:x['properties']['datetime']):
 try:
  bands={};geo=None
  for band in ['B04','B05','Fmask']:
   href=item['assets'][band]['href']
   signed=href+'?'+sas
   with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',GDAL_HTTP_TIMEOUT='60'):
    with rasterio.open(signed) as ds:
     x,y=transform('EPSG:4326',ds.crs,[73],[32.1]);row,col=ds.index(x[0],y[0]);window=Window(col-4,row-4,9,9)
     bands[band]=ds.read(1,window=window)
     bounds=rasterio.windows.bounds(window,ds.transform)
     xs,ys=transform(ds.crs,'EPSG:4326',[bounds[0],bounds[2],bounds[2],bounds[0]],[bounds[1],bounds[1],bounds[3],bounds[3]])
     footprint={'type':'Polygon','coordinates':[[[a,b] for a,b in zip(xs+[xs[0]],ys+[ys[0]])]],'crs':'EPSG:4326','nativeCRS':str(ds.crs),'nativeBounds':list(bounds),'pixelSizeM':30,'shape':[9,9]}
  red=bands['B04'].astype(float);nir=bands['B05'].astype(float);qa=bands['Fmask']
  # Bits 0..5: cirrus/cloud/adjacency/shadow/snow/water. Bits 6..7 aerosol.
  mask=(qa!=255)&((qa&63)==0)&((qa>>6)<3)&(red>=0)&(nir>=0)&(red<12000)&(nir<12000)&((nir+red)>0)
  valid=int(mask.sum());values=(nir[mask]-red[mask])/(nir[mask]+red[mask]);minimum_coverage=.5
  observations.append({'date':item['properties']['datetime'][:10],'ndvi':float(values.mean()) if valid/81>=minimum_coverage else None,'validPixels':valid,'totalPixels':81,'coverage':valid/81,'item':item['id'],'tile':'T43SCR','version':'2.0','cloudCoverTilePercent':item['properties'].get('eo:cloud_cover'),'source':next(x['href'] for x in item['links'] if x['rel']=='self'),'windowHash':hashlib.sha256(b''.join(bands[b].tobytes() for b in ['B04','B05','Fmask'])).hexdigest()})
  print(item['id'],valid,flush=True)
 except Exception as e:
  # Do not include URLs: they may contain temporary read signatures.
  code=getattr(e,'code',None);failures.append({'item':item['id'],'reason':type(e).__name__,'httpStatus':code});print(item['id'],'failed',type(e).__name__,code,flush=True)
if not observations or not any(x['ndvi'] is not None for x in observations):raise RuntimeError('No valid genuine observations obtained')
result={'publisher':'NASA / USGS HLS, hosted by Microsoft Planetary Computer','product':'HLS L30','version':'2.0','doi':'10.5067/HLS/HLSL30.002','retrieved':'2026-11-14','latitude':32.1,'longitude':73,'period':'2023-01-01 / 2023-12-31','status':'genuine cached observation','search':search,'spatialSupport':footprint,'quality':'Reject Fmask fill=255, bits 0–5 (cirrus, cloud, adjacent cloud, shadow, snow, water), high aerosol (bits 6–7 = 3), negative/saturated reflectance and zero denominator. Mean pixel NDVI for 9×9 pixels at 30 m (270×270 m). B04 red / B05 NIR; reflectance scale 0.0001 cancels in ratio. Coverage is valid count / 81, not cloud probability. Mean NDVI suppressed below 50% valid footprint coverage.','note':'Regional demonstration footprint, not a surveyed farm boundary. NDVI cannot identify crop, residue, nutrients, soil carbon or prove bare soil.','failures':failures,'observations':observations}
(OUT/'vegetation.json').write_text(json.dumps(result,indent=2))
(OUT/'hls-items.json').write_text(json.dumps({'search':search,'ids':[x['id'] for x in stac['features']],'retrieved':'2026-11-14'},indent=2))
print('Saved',len(observations),'observations;',len(failures),'failures')
