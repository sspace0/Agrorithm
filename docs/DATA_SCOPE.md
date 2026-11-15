# NASA data scope

Checked against the implemented source code, bundled provenance and NASA documentation on **15 November 2026**. This inventory describes this release; it is not a claim that every potentially useful NASA product has been integrated. The official challenge page was not independently retrieved during this audit, so the additional dataset names below are not presented as a verified list from that page.

## Implemented decision evidence

| Data integration | Bundled observations | Actual use | Important boundary |
| --- | --- | --- | --- |
| NASA POWER daily, MERRA-2 meteorology | 2018-01-01–2024-12-31; 2,557 complete UTC days; regional example at 32.1° N, 73° E. `T2M_MIN`, `T2M_MAX` in °C; `PRECTOTCORR` in mm/day. | Hargreaves reference ET, stage-specific crop ET, daily root-zone screening bucket, net/delivered irrigation, historical heat/frost/rainfall-deficit exposure and replay. | Reanalysis combines model and observation information. Native meteorological support is 0.5° latitude × 0.625° longitude; it is not a field sensor or forecast. |
| NASA/USGS HLS **L30 v2.0** | Acquisitions 2023-01-05–2023-12-31; retrieved 2026-11-14. 43 scenes, 16 passing the 50% valid-footprint threshold in a 9 × 9 window of 30 m pixels. | Quality-filtered NDVI time series and farmer confirmation of live-cover context. | It does not automatically change the numerical rotation ranking or establish crop identity, residue absence, nutrients or soil carbon. Proposed live cover comes from the entered crop calendar. |

The actual requested/available weather period and HLS record are separately shown in the evidence and results panels. A successful optional weather retrieval can replace the current session record; a failed request preserves the loaded record. Imported rows remain user-imported/unverified and are not relabeled NASA data. Missing satellite observations remain missing. The static sample can be used offline after caching, with manual JSON input available.

NASA Blue Marble: Next Generation, **August 2004**, is separately used as Earth/atlas imagery. This visual basemap does not enter crop suitability or water calculations. Its asset provenance is in `public/data/basemap-provenance.json` and `docs/DATA_REGISTRY.md`.

Primary references: [POWER daily service](https://power.larc.nasa.gov/docs/services/api/temporal/daily/), [POWER meteorological source methodology](https://power.larc.nasa.gov/docs/methodology/data/sources_meteorology/), [HLS product descriptions](https://hls.gsfc.nasa.gov/data-products/). Local observation and request provenance: `public/data/weather.json`, `public/data/provenance.json` and `public/data/vegetation.json`.

## Not used in this release

| Dataset / product | Current implementation status |
| --- | --- |
| SMAP | No SMAP observations, derived moisture estimates or assimilated SMAP series are loaded into the app. No field-depth inference. |
| GPM / IMERG | No IMERG rainfall series is used; the implemented rainfall input is POWER corrected precipitation. |
| ECOSTRESS | No ECOSTRESS ET or thermal-stress product is used. |
| GRACE / GRACE-FO | No regional total-water-storage series is used. The illustrative groundwater slider is not a GRACE-derived field water table. |
| SRTM | No SRTM terrain, slope or runoff calculation is used. |
| HLS S30 | No S30 reflectance observations are included. Any future L30/S30 combination would need explicit sensor/product, QA, footprint and temporal treatment. |

These entries are disclosure of absent integrations, not promises of validation, suitable pilot coverage, successful access or a future implementation date.

## POWER humidity and soil wetness: metadata verified, not implemented

The current [NASA POWER parameter dictionary](https://power.larc.nasa.gov/parameters/) was inspected, including its actual read-only metadata requests. A selected-field snapshot is recorded in `docs/data/power-future-parameter-metadata.json` (SHA-256 `21e3d02244c23dd2a3134074c335a20751032955e794549e29e6aea57e84eb15`); no new humidity/wetness observation series was downloaded or added to the application. The daily Agroclimatology metadata confirms:

| Parameter | Meaning | Verified unit | Use in current release |
| --- | --- | --- | --- |
| `RH2M` | Relative humidity at 2 m | % | Not fetched or calculated with |
| `QV2M` | Specific humidity at 2 m | g/kg | Not fetched or calculated with |
| `GWETTOP` | Surface soil wetness; provider description refers to the upper 5 cm | `1`, dimensionless fraction, 0–1 | Not fetched or calculated with |
| `GWETROOT` | Root-zone soil wetness; provider describes approximately the upper metre | `1`, dimensionless fraction, 0–1 | Not fetched or calculated with |
| `GWETPROF` | Full model-profile wetness | `1`, dimensionless fraction, 0–1 | Not fetched or calculated with |

The metadata lists a primary **MERRA-2** daily path at 0.5° × 0.625° and separate optional source paths, including GEOS-IT and SMAP for wetness. A future acquisition must inspect and record the actual returned source, quality, spatial support, depth and time standard. Generic POWER wetness must not be assumed to be SMAP. Dimensionless wetness is not interchangeable with volumetric moisture (m³/m³), available root-zone storage (mm) or groundwater depth (m). No wetness-to-storage conversion is implemented.

NASA's [hydrology methodology](https://power.larc.nasa.gov/docs/methodology/data/sources_hydrology/) describes distinct standard and higher-resolution soil-moisture pathways. Metadata availability does not prove that a particular location/date has a valid observation. Some provider catalog source end bounds extend beyond the current date; those are catalog fields, **not observed future data**, and are not displayed as an observation record in Agrorithm.

Verified per-parameter metadata endpoints:

- [RH2M metadata](https://power.larc.nasa.gov/api/website/metadata/parameters/RH2M)
- [QV2M metadata](https://power.larc.nasa.gov/api/website/metadata/parameters/QV2M)
- [GWETTOP metadata](https://power.larc.nasa.gov/api/website/metadata/parameters/GWETTOP)
- [GWETROOT metadata](https://power.larc.nasa.gov/api/website/metadata/parameters/GWETROOT)
- [GWETPROF metadata](https://power.larc.nasa.gov/api/website/metadata/parameters/GWETPROF)

## Retrieval limits recorded

NASA's current daily-service, meteorological-source and hydrology documentation were retrievable during this audit. The dictionary shell and its metadata endpoints returned successfully through native HTTPS requests. The browsing extractor could not read the metadata JSON endpoints; the saved snapshot was obtained from the same official HTTPS URLs without a proxy or TLS bypass. The older `/docs/methodology/meteorology/` landing URL and linked relative-humidity validation URL returned 404. Parameter names and units above therefore rely on the successful dictionary metadata rather than those unavailable validation pages.

No additional NASA data integration, local soil validation, forecast, field water table, yield/profit prediction or aquifer model is claimed by this scope review.
