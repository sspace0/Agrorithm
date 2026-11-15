"""Reduce the genuine Beck et al. historical Köppen classification for web use.
Download the CC BY 4.0 TIFF archive from the exact source in atlas provenance.
Only the 1991–2020 0.5° raster and legend are extracted; no future map is used.
"""
import json,hashlib,zipfile,urllib.request
from pathlib import Path
import rasterio
from rasterio.io import MemoryFile
ROOT=Path(__file__).resolve().parents[1];cache=ROOT/'.cache';cache.mkdir(exist_ok=True)
archive=cache/'koppen.zip';url='https://ndownloader.figshare.com/files/61012822'
if not archive.exists():urllib.request.urlretrieve(url,archive)
member='1991_2020/koppen_geiger_0p5.tif'
with zipfile.ZipFile(archive) as z:
 raw=z.read(member);legend=z.read('legend.txt').decode()
 with MemoryFile(raw) as mem:
  with mem.open() as ds:
   arr=ds.read(1);result={'width':ds.width,'height':ds.height,'bounds':list(ds.bounds),'crs':str(ds.crs),'values':arr.flatten().tolist(),'period':'1991–2020','support':'Provider 0.5° classification; broad global context, not field-resolution suitability.','source':'https://doi.org/10.1038/s41597-023-02549-6','license':'CC BY 4.0','attribution':'Beck et al. (2023), High-resolution (1 km) Köppen-Geiger maps for 1901–2099 based on constrained CMIP6 projections, Scientific Data 10, 724.','archiveUrl':url,'archiveMember':member,'rasterSha256':hashlib.sha256(raw).hexdigest(),'retrieved':'2026-11-14'}
out=ROOT/'public/data';(out/'climate-zones.json').write_text(json.dumps(result,separators=(',',':')));(out/'climate-legend.txt').write_text(legend)
print(result['width'],result['height'],result['bounds'],result['rasterSha256']);print(legend[:4000])
