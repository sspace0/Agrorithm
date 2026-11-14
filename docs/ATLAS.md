# World crop atlas

Separate page: `/FieldShift/#/atlas`. This is a global educational overview feeding location into the Punjab planner, not a global agronomic recommendation engine.

## Genuine geographic layer

Beck et al. (2023), _High-resolution (1 km) Köppen-Geiger maps for 1901–2099 based on constrained CMIP6 projections_, Scientific Data 10, 724. DOI: https://doi.org/10.1038/s41597-023-02549-6. Data: https://doi.org/10.6084/m9.figshare.21789074. License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Exact archive retrieved 2026-11-14: `https://ndownloader.figshare.com/files/61012822`. Only `1991_2020/koppen_geiger_0p5.tif` is converted. No future scenario is used. Native provider 0.5° grid: 720×360, EPSG:4326, world bounds −180,−90,180,90. Original raster SHA-256: `d48c432dd4556963b25bda2405885d70eae899096c62e46b5e3ce8833e09c6f0`.

The map recolors/groups 30 subclasses into five families for overview. Exact subclasses remain visible at selected points. `public/data/climate-legend.txt` preserves the provider legend; `climate-zones.json` retains provenance. The 130 MB archive stays outside Git in .cache. Rebuild: `python scripts/build-atlas.py` with the data requirements installed.

An equal-angle display shows climate/coast shapes without political boundaries. Click/tap, arrows, coordinates, zoom/reset and preset contexts work without paid tiles or WebGL. Moving a location invalidates the planner's weather match. No soil properties are inferred from climate pixels.

## Crop and soil graphics

Wheat, maize, paddy rice, mungbean and sorghum have adaptation descriptions and primary references in `src/data/atlas.ts`. Crop glyphs are original SVG geometry. Climate-fit colors are **provisional qualitative rules**, not measured suitability, GAEZ, crop productivity or validated global ranking.

“Promising broad climate fit” means an adaptation context worth investigating. “Season / water check” requires more evidence. “Outside broad preference” does not establish field infeasibility. Mungbean beyond the cited Pakistan calendar receives no strong-fit claim. Desert pixels require water-source review. The soil dropdown is an explicitly hypothetical filter, not a global soil map. Persistent waterlogging flags non-paddy drainage concerns; sand flags paddy seepage concerns.

References: Canada's CFIA maize biology, African Organisation for Standardisation wheat outreach, FAO rice irrigation systems, World Vegetable Center mungbean manual and ICRISAT sorghum. The FAO crop-information URLs initially returned 404, so the shipped registry uses verified alternative primary references. No numerical global yield, profit or “best crop” claim is derived from climate alone.

Real suitability assessment additionally needs local soil/depth/pH/salinity, seasonal weather, cultivar, water rights, protected land, topography, equipment and markets. These unknowns remain visible.
