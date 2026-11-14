# Source registry

Registry started 2026-11-14. Retrieval outcomes and exact subsets are recorded beside cached data.

| Source                                                                                                                           | Purpose                                    | Support and limits                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| [Challenge](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/)                       | Product brief                              | Official URL returned 502 during initial verification; user-supplied brief is the working scope. |
| [NASA POWER daily](https://power.larc.nasa.gov/docs/services/api/temporal/daily/)                                                | T2M_MIN, T2M_MAX, PRECTOTCORR              | Gridded historical weather; not field measurements or forecasts.                                 |
| [HLS access](https://hls.gsfc.nasa.gov/data-access-and-tools/)                                                                   | Preferred vegetation source                | NASA Earthdata login needed for downloads. No credentials in app.                                |
| [ORNL TESViS](https://modis.ornl.gov/data/modis_webservice.html)                                                                 | NASA MOD13Q1 alternative                   | Regional composite vegetation context, not crop identification. DOI 10.3334/ORNLDAAC/1600.       |
| [Punjab maize manual](https://agripunjab.gov.pk/system/files/Maize-Cultivation-with-HEIS.pdf)                                    | Punjab sowing, durations and indicative Kc | Variety and management must be checked locally.                                                  |
| [World Vegetable Center mungbean manual](https://worldveg.tind.io/record/66217/files/English_mungbean%20production%20manual.pdf) | Northern Punjab mungbean calendar          | Local applicability requires variety confirmation.                                               |
| [PMD wheat report](https://namc.pmd.gov.pk/assets/crop-reports/1038294586Model-crop-report-Faisalabad-wheat-2022-23.pdf)         | Wheat calendar                             | Central Punjab reference; pilot adaptation provisional.                                          |
| [FAO 56](https://www.fao.org/4/X0490E/x0490e0a.htm)                                                                              | Crop ET and crop coefficients              | Screening assumptions documented in METHODS.md.                                                  |
| [FAO irrigation](https://www.fao.org/4/s2022e/s2022e08.htm)                                                                      | Rice additional water terms                | ET-only rice demand cannot represent total irrigation.                                           |
| [USGS groundwater](https://www.usgs.gov/water-science-school/science/aquifers-and-groundwater)                                   | Porous-medium groundwater illustration     | Illustrative unconfined aquifer, not a measured pilot water table.                               |
| [Poly Haven](https://polyhaven.com/license)                                                                                      | PBR textures                               | Verify individual asset metadata and CC0.                                                        |

No SMAP/GRACE field-depth inference, economic predictions, fertilizer credits, carbon trajectories or yield estimates are used.

## Completed acquisition

POWER: 2018–2024, 2,557 complete UTC days, raw yearly responses and checksums in public/data/provenance.json. HLS: 43 L30 v2.0 scenes in 2023, 16 with at least 50% valid footprint coverage; no acquisition failures. Exact ids, dates, valid counts, processing hashes and footprint are in vegetation.json. Earthdata credentialed access was avoided through NASA’s documented Microsoft mirror; temporary read signatures were held only in memory. ORNL MODIS returned 503 and is not the shipped sample.

World atlas: Beck et al. (2023), historical 1991–2020 provider 0.5° grid, CC BY 4.0. Exact archive/source/hash and modifications: docs/ATLAS.md. Crop adaptation sources and all provisional fit mappings: src/data/atlas.ts. Soil filtering is a user scenario, not observed global soil.

## Satellite basemap

NASA Earth Observatory, Blue Marble: Next Generation, August 2004 monthly MODIS composite. Creators: Reto Stöckli and Robert Simmon. [Official download page](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/) and [NASA image-use guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/). The original 5400×2700 JPEG is bundled without pixel changes; 1616254 bytes, SHA-256 `2048023ccc62250c677c0f4b03d4362f997b130eb0154a6cad00aa1b27c390b9`. Exact download URL and retrieval date are in public/data/basemap-provenance.json. Rebuild with `node scripts/fetch-basemap.mjs`.

The satellite image is a historical cloud-free composite, not live imagery or field-resolution mapping. The independent 1991–2020 climate/crop layer sits above it with an adjustable opacity (including 0% for satellite-only inspection). The two layers represent different periods. Both are available from the offline cache. Soil filters remain hypothetical; satellite colors do not establish soil type or crop suitability.
