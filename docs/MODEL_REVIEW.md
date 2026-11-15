# Model review and groundwater detail

Review date: 15 November 2026. This is software and visual verification, not botanical, soil-profile or aquifer validation.

## Groundwater revision

The previous model used a nearly uniform mineral section and small, evenly sized blue markers. The revised section adds varied gravel and aggregates, enlarged pore openings with mineral rims, fine fractures, and discontinuous laminae in the lower-permeability material. Detail continues across both exposed faces. Restrained opaque blue-grey water occupies selected pore openings and fine fractures rather than a free underground cavity. The existing layer, root and surface nodes remain available to the shared annotation system.

The default poster retains the explicitly illustrative 7 m water table and a separate conceptual 0–20 m vertical scale. Pore openings are enlarged teaching geometry. Their count, size, appearance and connectivity are not measurements of porosity, permeability or water storage. The sediment arrangement is not a measured Punjab profile. No well or capillary-fringe claim has been added.

In the browser, detailed water materials have a clipping plane transformed from model space on every rendered frame. Changing the user-controlled table removes detailed water above that selected depth. The same plane gives all groundwater mineral layers and section details darker blue wet shading below the table, retaining photographic grain, normal maps, aggregates, pores and fractures. Blue is an illustrative saturation legend; it is not a claim that natural groundwater-bearing rock is blue. A bounded roughness adjustment reinforces the wet appearance without a translucent water volume. The existing dynamic boundary and pore markers still cover the entire 3–15 m control range; the extra modeled pore-water detail is concentrated in the lower section, so this is not a quantitative saturation simulation. Changing table depth does not simulate aquifer dynamics, recharge or a future field-depth measurement. NASA SMAP/GRACE are not used to establish depth.

The scientific distinction follows [USGS, Aquifers and Groundwater](https://www.usgs.gov/water-science-school/science/aquifers-and-groundwater), [USGS, Groundwater Basics](https://www.usgs.gov/mission-areas/water-resources/science/groundwater-basics) and [USGS, How Ground Water Occurs](https://pubs.usgs.gov/gip/gw/how_a.html): groundwater occupies pore/crack space, with a saturated zone below the water table. The site's existing sources and geometry disclosures remain available outside the canvas.

## Rebuild

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --factory-startup --background --threads 6 --python assets/blender/enhance_groundwater.py
node assets/blender/optimize_groundwater_poster.mjs
```

Blender 5.2.1 LTS was actually executed. The detail script imports the reusable generation helpers from `generate_v2.py` and deterministically creates only the groundwater scene. When rebuilding every source scene, run the regular v2 generator first and this detail pass afterward. Its fixed seed is 20261115. No extra texture downloads are needed: the source CC0 maps, creators, licenses and checksums remain in `assets/textures/manifest.json` and `docs/ASSET_CREDITS.md`. Runtime maps are packed into the editable scene and GLB. New geometry and plain PBR materials are reproducible in the script; no Blender-only procedural shader is required by the web export.

| Deliverable | Location |
| --- | --- |
| Editable source | `assets/blender/groundwater-v2.blend` |
| Reproducible detail script | `assets/blender/enhance_groundwater.py` |
| Runtime export | `public/models/groundwater-v2.glb` |
| Full transparent poster | `public/images/groundwater-v2.png` |
| Runtime transparent poster | `public/images/groundwater-v2.webp` |
| Asset measurements | `assets/blender/validation-v2.json` |
| Repeatable browser review | `scripts/model-review-qa.mjs` |
| Actual rendered screenshots and results | `docs/design/agrorithm/model-review/` |

## Measurements

The revised groundwater export has 73,660 triangles across 14 mesh nodes. Its uncompressed GLB is 6,029,336 bytes; a local gzip measurement is 4,869,866 bytes. The editable packed `.blend` is 9,045,051 bytes. The 1600 × 1250 transparent PNG is 2,014,139 bytes and its 1200 px WebP derivative is 77,858 bytes. The GLB SHA-256 is `f8b5bfe32eda3e3468755b7f377b75204f71a7a5758b30d2350a69533df1d7f6`. The GLB retains ordinary exportable PBR mineral materials; the dynamic saturation appearance is applied by the shared browser material shader. The editable `.blend` contains the equivalent default7 m poster material nodes.

These are file and geometry measurements. They are not a network-delivery guarantee or integrated-graphics/mobile frame-rate benchmark. The scene stays under the 150,000 triangle / 8 MB compressed initial-model targets. Lazy loading, bounded pixel ratio, mobile opt-in, static posters, reduced motion and WebGL failure handling remain in the shared presentation system.

## Visual review

The actual before and after Blender posters were inspected. The revised poster shows continuous granular material rather than an underground pool; layer boundaries, grass, shallow roots and water-filled pore detail remain visible. The full PNG is transparent.

The fresh core review screenshots were also inspected for maize, mungbean, tomato, citrus, root-zone and phone groundwater. The crop categories remain recognizable representative studies, with leaves and reproductive structures visible. The arrows point to actual mesh surfaces rather than the empty centers of combined mesh bounds. Panel backgrounds and padding keep labels readable. On phones, phase-dependent labels avoid crowding while all essential descriptions remain in accessible HTML details. The 20-case core label/layout run at desktop and phone sizes completed 198 assertions with zero failures after the Recharts sizing regression was repaired.

The new groundwater and all six model views are checked in a separate production build at the configured `/Agrorithm/` base. `scripts/model-review-qa.mjs` records desktop1440 × 1000 and phone390 × 844 screenshots, model framing, transparent clear alpha, annotation/arrow bounds, manual zoom/reset, HTML alternatives and unhandled errors. Groundwater additionally has screenshots at scroll positions8%, 50% and95%, and at the12 m depth setting. Its instrumentation observes actual WebGL clipping-plane uniforms before/after changing the control from7 to12 to3 m. It does not alter the render logic.

The completed detail-pass run passed **12 cases / 102 checks / zero failures**, producing **18 actual browser screenshots**. The water clipping uniform's distance term changed by exactly0.5 display units when the table moved from7 to12 m, and by0.9 units from12 to3 m, within floating-point precision. Desktop and phone depth12 screenshots were inspected: the detailed blue pore fill disappeared from the newly unsaturated upper band, while the dynamic boundary/markers moved correctly. All six model views kept fitted geometry inside the transparent canvas and retained working manual zoom/reset and HTML descriptions.

Screenshot inspection found crossing leader lines when collision placement followed annotation declaration order. Annotation placement now follows projected feature height. The final default7 m and depth12 m screenshots show distinct, uncrossed leaders with both backed labels readable.

The final affected-view review passed **4 desktop/phone cases / 68 checks / zero unresolved failures**, aggregated in `model-review/final-results.json` from `layers-results.json` and `results-verified.json`. Root-zone before/middle/after screenshots show the layers opening into bounded gaps and assembling again. Actual parent-layer offsets at mid-scroll were about−0.40 display units, returning to about0 at the start/end. Selecting Separate layers kept the section open after scrolling back; Follow scroll restored the guided profile. These gaps are illustrative display separation, not changes to measured horizon depths. Reduced motion leaves the automatic separation off; the existing explicit layer control remains available.

The final wet-blue material preserves texture and geometry in both the browser and re-rendered Blender poster. Actual stage screenshot pixels changed as expected: desktop blue-area counts were108,832 at7 m,65,221 at12 m and144,242 at3 m; phone counts were15,161,9,216 and20,046. This color-mask check verifies rendering response, not water storage. The wet shader uploads its plane in world coordinates while Three.js uploads its built-in clipping plane in camera/view coordinates. The first harness assertion incorrectly compared their absolute constants. The corrected assertion verifies normalized planes and matching0.5-display-unit depth changes, using the captured real WebGL values; `results-verified.json` explicitly records this numerical re-evaluation without claiming another browser run. The actual screenshots and unchanged application source were independently inspected. No shader, console or page errors remained in those final captures.

## Remaining limits

The crop studies are illustrative procedural geometry, not photogrammetric scans or cultivar verification. All plant categories use a normalized presentation height; their apparent size does not compare natural species heights. The groundwater material is deliberately simplified and its enlarged pores should be interpreted with the visible scale/geometry disclosure. Real-device GPU measurements, local agronomist review and measured field geology remain outstanding. Essential descriptions and the planning workflow remain usable without WebGL.
