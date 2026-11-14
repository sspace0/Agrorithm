# Source registry

Registry started 2026-11-14. Retrieval outcomes and exact subsets are recorded beside cached data.

| Source | Purpose | Support and limits |
|---|---|---|
| [Challenge](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/) | Product brief | Official URL returned 502 during initial verification; user-supplied brief is the working scope. |
| [NASA POWER daily](https://power.larc.nasa.gov/docs/services/api/temporal/daily/) | T2M_MIN, T2M_MAX, PRECTOTCORR | Gridded historical weather; not field measurements or forecasts. |
| [HLS access](https://hls.gsfc.nasa.gov/data-access-and-tools/) | Preferred vegetation source | NASA Earthdata login needed for downloads. No credentials in app. |
| [ORNL TESViS](https://modis.ornl.gov/data/modis_webservice.html) | NASA MOD13Q1 alternative | Regional composite vegetation context, not crop identification. DOI 10.3334/ORNLDAAC/1600. |
| [Punjab maize manual](https://agripunjab.gov.pk/system/files/Maize-Cultivation-with-HEIS.pdf) | Punjab sowing, durations and indicative Kc | Variety and management must be checked locally. |
| [World Vegetable Center mungbean manual](https://worldveg.tind.io/record/66217/files/English_mungbean%20production%20manual.pdf) | Northern Punjab mungbean calendar | Local applicability requires variety confirmation. |
| [PMD wheat report](https://namc.pmd.gov.pk/assets/crop-reports/1038294586Model-crop-report-Faisalabad-wheat-2022-23.pdf) | Wheat calendar | Central Punjab reference; pilot adaptation provisional. |
| [FAO 56](https://www.fao.org/4/X0490E/x0490e0a.htm) | Crop ET and crop coefficients | Screening assumptions documented in METHODS.md. |
| [FAO irrigation](https://www.fao.org/4/s2022e/s2022e08.htm) | Rice additional water terms | ET-only rice demand cannot represent total irrigation. |
| [USGS groundwater](https://www.usgs.gov/water-science-school/science/aquifers-and-groundwater) | Porous-medium groundwater illustration | Illustrative unconfined aquifer, not a measured pilot water table. |
| [Poly Haven](https://polyhaven.com/license) | PBR textures | Verify individual asset metadata and CC0. |

No SMAP/GRACE field-depth inference, economic predictions, fertilizer credits, carbon trajectories or yield estimates are used.
