# Agrorithm product and engineering specification

## Purpose

Explore crop rotations using NASA Earth observations, local soil information, crop characteristics and farmer priorities. The initial configurable Punjab, Pakistan pilot compares the entered rotation with two alternatives over an equal 36-month horizon. It supports a conversation with a local agronomist, not a guaranteed planting recommendation.

Display name, tagline and team are centralized in `src/config.ts`. Deployment base is separately configured by `DEPLOY_BASE`, default `/Agrorithm/`.

## Application

- React, TypeScript and Vite; a static GitHub Pages build without a database, paid service, authentication or secret-bearing browser code.
- Responsive opening menu with an immediately visible poster, interactive Blender diorama, start/sample/soil/sources/team actions, conditional resume, motion and quality controls.
- Field Studio default: editorial, warm, spacious calendars. Agronomist Console: dense evidence rail, quantitative tables, compact inspector. Farmer Companion: guided single-column steps and larger touch controls. One shared state and decision engine.
- Separate `#/design` route with desktop/mobile previews; no development review controls in normal field steps.
- Separate `#/atlas` page: genuine historical global climate zones, crop graphics, hypothetical soil filters, keyboard/touch location selection and provenance. Crop-fit rules remain explicitly provisional.
- Century Gothic primary typography with a licensed bundled DM Sans fallback and Instrument Serif italics. A skippable Earth-in-space opening rotates toward the pilot region and transitions to the historical satellite map. All crop/soil model pages use a shared immersive presentation, bounded-box framing, sticky scroll reveals, manual orbit/pan/cursor-centered zoom, accessible labels and fallback posters.
- Field setup accepts coordinates, optional boundary, area, irrigation, delivered water limit, dates, soil units/depth/date/source, exclusions, equipment, market access, observations and optional budget. Unknown inputs remain visible.
- Evidence includes genuine historical weather and HLS time series, spatial support, dates, quality and missingness, plus farmer confirmation.
- Rotation lab aligns crop/stage calendars, buffers and management assumptions. What-if changes weather, water and priorities. Trade-offs precede optional scores and show Pareto eligibility, historical replays and sensitivity.
- Dynamically paginated16:9 presentation PDF on a1920×1080 canvas, JSON/CSV provenance packets, local persistence, resume, delete/reset and manual JSON imports. Farm details stay local unless deliberately exported or a public weather request is invoked.
- Keyboard/touch, focus indicators and reduced motion. The incomplete Urdu translation control is removed. All core calculations and content work with static graphics.

## Scientific boundaries

- Seven complete POWER years (2018–2024), T2M_MIN, T2M_MAX and PRECTOTCORR, UTC. Regional reanalysis is not measured field weather or a forecast.
- HLS L30 v2.0 regional window for 2023, B04/B05/Fmask with recorded identifiers, spatial footprint, QA filtering and valid counts. No NDVI fabrication or inference of nutrients, carbon, crop identity or absent residue.
- Demo maize–wheat baseline is explicitly assumed, not claimed as a verified farmer case. Rice–wheat is not imposed. Soil and management assumptions are labeled and require confirmation for actual use.
- Crop windows and characteristics have primary regional sources or explicit provisional flags. Unsupported local parameters do not become validated merely because software tests pass.
- Pure engine: dates, durations, sowing windows, seven-day transitions, overlap, provisional soil bounds, water, exclusions and equipment/market constraints. Missing evidence is unresolved. Priorities cannot override constraints.
- FAO radiation and Hargreaves screening ET0 with correct MJ-to-mm conversion, stage Kc and a documented daily storage bucket. Crop ET, effective rainfall, net root-zone irrigation and delivered volume remain distinct. Paddy ET is not total irrigation and is never ranked as a complete paddy calculation.
- Compare individual indicators, input completeness, fixed-normalization optional index, Pareto comparisons, historical windows and enumerated sensitivity. No automatic fertilizer, yield, carbon, erosion or profit benefits.

## Visual assets

Editable `.blend` scenes, reproducible Python, GLBs and rendered posters for root-zone and groundwater cutaways. Named nodes and licensed, bundled PBR maps; natural variation, readable roots and sectional faces. Groundwater occupies pores in solids. An explicit scale break separates demo root depth from deeper groundwater. Layer/exploded/orbit/zoom/reset controls, HTML labels and equivalent text outside the canvas.

Explanatory rainfall, infiltration, uptake and evaporation are not aquifer simulations or measured velocities. User-controlled groundwater depth is illustrative. No SMAP/GRACE water-table inference. Bounded pixel ratio, lazy 3D, simple lighting, offscreen pause and static/context-loss fallback target integrated graphics. Asset sizes and actual checks are recorded; no unmeasured FPS claims.

## Delivery and acceptance

Feature branch and review PR with source, small redistributable caches, editable sources, scripts, credits and reproducible setup. CI installs from lockfile, checks types/lint/tests and produces a static build. Separate manual Pages workflow uses official supported actions, least necessary deployment permissions, concurrency and the github-pages environment. No automatic publication or merge.

Verification covers leap/cross-year dates, constraints, missingness, water units/accounting, rice limitations, scoring, imports and scenario changes; an independent worked reference; normal/constrained/insufficient cases; production `/Agrorithm/` entry/refresh, three concepts, mobile/desktop, removed language control, reduced motion, offline cache, denied requests, failed assets, WebGL loss and exports. Remaining scientific, language, access and deployment limits must remain visible.

The atlas uses bundled NASA Blue Marble satellite imagery (August 2004 composite) beneath independent translucent classification colors. Opacity control, source/date labels, failure fallback and offline imagery are required. The imagery is historical context and does not imply live field mapping.

## Experience and crop reference extension
Persistent searchable navigation, separate map/soil/crop/guide pages, native-scroll motion with static alternatives, eight sourced crop references and four representative category models are required. Crop reference seasons, temperature, pH, water and stress tolerance retain regional applicability and missing evidence. Fruit-tree references do not enter the annual rotation engine. Optional models load individually; mobile automatic quality begins with posters. See EXPERIENCE_UPDATE.md for implementation and measurements.

## Exhibition and report verification

Use the supplied Agrorithm logo, transparent loading mark and report cover. Loading percentages correspond to measurable transfers; unknown totals use an indeterminate indicator. Ordinary scrolling remains on the document; manual camera interaction pauses guided motion until reset or resume. All important annotations have readable panels plus an accessible text alternative. Keep the main model canvas transparent.

Execute production-browser visual checks at desktop, tablet and phone sizes across every route/model and multiple scroll positions. Assert framing, annotation bounds/overlap, control clearance, state continuity, failed assets, context loss and responsive overflow. Export and render the actual PDF; verify page boxes, embedded typography, content preservation and overflow. Retain real results and limits in docs/VISUAL_QA.md and docs/REPORT_EXPORT.md.
