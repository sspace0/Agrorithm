# Verification record

Checked on Windows, 2026-11-14, against the static production build at `http://127.0.0.1:4173/FieldShift/`. Node 24.22.1, Blender 5.2.1 LTS, Playwright Chromium 158. Browser automation ran in the background; these results are not a field trial or integrated-GPU FPS benchmark.

## Recorded software results

- Locked dependency installation completed. TypeScript and ESLint pass. Production Vite build and offline-cache generation pass; the generator syntax-checks the service worker before writing it.
- 20 engine tests pass: leap/cross-year dates, buffers, sowing/duration constraints, exclusions/equipment/markets, provisional soil screens, missingness, imported crop parameters, malformed scenarios, radiation reference, mm/ha/m³ units, bucket conservation, paddy limitations, scenario recomputation, complete historical replays, zero weights and six-case sensitivity. Unsupplied dates/access remain unresolved.
- Complete 15-test production-browser suite passed in 47.8 seconds, including the final keyboard skip-link regression check. It covered atlas controls/keyboard/location transfer; scroll progression and reduced motion; menu actions; all three complete sample journeys; rainfall/water recomputation; sensitivity worker; JSON/CSV downloads; save/resume/delete; Urdu RTL; offline reload; denied live weather; missing weather/models; actual WebGL context loss; direct hash entry/refresh; 390/768/1440 px layouts without document overflow; separate design previews.
- The full committed suite includes keyboard skip-link focus without route changes. CI repeats the checks; remote CI status is observed independently from local results.
- NASA POWER was requested directly from the production browser: HTTP 200, response type `cors`, API v2.10.3, min/max temperature units C and PRECTOTCORR mm/day. A simulated denied request preserved the cached series. No public CORS proxy or browser token is used.

## Visual inspection

Rendered and inspected both Blender PNGs, then loaded both exported GLBs in the actual browser. Captured desktop/mobile concept previews, opening menu, atlas climate/crop overlays, root-zone and groundwater views. Inspected the print stylesheet in browser print-media emulation. No independently paginated PDF file is delivered or claimed as verified; the app opens browser print/Save as PDF.

The original team artwork's SHA-256 matches the copied team-page asset. `.blend` scenes are real editable files, not placeholders. Root-zone uses nine mesh objects; groundwater uses five. GLB binary headers and embedded PBR images are present; no LFS pointer files are involved.

## Actual asset measurements

| Asset                          | Raw bytes | Locally computed gzip bytes |
| ------------------------------ | --------: | --------------------------: |
| Root-zone GLB                  | 1,758,684 |                     690,592 |
| Groundwater GLB                | 1,057,208 |                     496,594 |
| Root-zone poster               | 1,758,039 |                   1,756,580 |
| Groundwater poster             | 1,298,324 |                   1,296,131 |
| Global historical climate grid |   583,759 |                      19,681 |

Blender scene triangle counts: root-zone 17,848; groundwater 6,232. Both GLBs are comfortably below the initial 150,000-triangle target. The lazy Three.js chunk is about 1.00 MB raw / 268 KB gzip; the main JS chunk about 736 KB raw / 219 KB gzip; CSS about 45 KB raw / 10 KB gzip. Runtime font files total 76,644 bytes. Whole static output is approximately 11.10 MB raw after the satellite basemap revision including both models, all posters and offline data. Gzip numbers are computed file compression measurements, not claimed transfer sizes from an undeployed host.

No integrated-graphics laptop/phone FPS, touch hardware latency, battery use or calibrated agronomic performance was measured. Pixel ratio is bounded at 1–1.5 (low quality 1), heavy 3D is lazy, offscreen/hidden rendering pauses, no environment HDRI is downloaded, and a static mode preserves all planning functionality.

## Data and scientific limits

POWER: 2,557 complete UTC days, 2018–2024, regional reanalysis. HLS: 43 real acquisitions in 2023; 16 retain at least 50% valid pixels after filtering, with all counts/gaps recorded. Global climate: genuine 1991–2020 provider 0.5° classification; qualitative crop-fit overlays are provisional assumptions. Soil filters are scenarios, not mapped observations.

The sample soil, baseline and management are demonstration inputs. No local soil test, surveyed farm, farmer interview, water right verification, cultivar validation, price/cost/yield dataset or agronomist endorsement is supplied. General pH/EC bounds, stage Kc, thresholds, effective rainfall/storage and residue persistence need local review. Rice lacks additional paddy water terms and cannot receive a complete ranking. The model does not simulate aquifers, soil-carbon recovery, fertilizer replacement or future yield/profit. Urdu requires fluent agricultural review. A blank feedback form is provided for real validation.

## Access and publishing state

Repository was explicitly created private under sspace0. Source/assets are synchronized with authenticated GitHub tools after the local Git credential became unavailable; no credentials were printed or committed. Local milestone history remains preserved. No force push, merge, visibility change or Pages deployment is authorized or performed. Source history and final PR/CI status are reported at handoff.

Private-repository Pages requires an eligible GitHub plan and owner Pages/environment settings. Deployment is manually dispatched only after review; there is no observed live website URL yet. The supplied official challenge URL returned 502 during verification and remains an external reference blocker. HLS Earthdata credentials were not needed for the documented Microsoft-mirror preprocessing; ORNL's alternative service returned 503 and was not used as sample data.

Review PR: https://github.com/sspace0/FieldShift/pull/1. The initial complete source snapshot is commit 1345c3eeeb8b808b7a06770bb3680cd9747180e6; final documentation refinements are subsequent commits on the same feature branch.

Satellite-map revision: genuine NASA August 2004 Blue Marble imagery is bundled beneath the climate/crop overlays. The atlas/opacity, offline satellite-image reload and responsive checks passed locally after this revision. The prior complete source snapshot cd9dfe95022a5bcf98236cd246e42c1185c8d306 also passed all GitHub CI steps (run 43618923030); the final satellite revision is checked by a subsequent run.

## Subsequent public publication

On 2026-11-14 the user requested the shareable HTTPS link. Sites version 1 deployed successfully at https://fieldshift-jt1.spacetime24.chatgpt.site with public URL access, while the GitHub repository remains private and PR #1 unmerged. Anonymous live HTTP, sample-planner, satellite/opacity and mobile checks passed without page errors. Details and exact hosting source/deployment identifiers are in PUBLIC_DEPLOYMENT.md. Earlier no-deployment statements above describe the initial PR handoff; GitHub Pages itself is still not deployed.

## Experience revision verification
The later experience revision passes 23 unit tests and the complete 20-test production-browser suite; TypeScript/ESLint/build pass. New asset sizes, screenshots, source applicability and phone poster defaults supersede the earlier visual asset measurements above; see EXPERIENCE_UPDATE.md. Current publication details are maintained in PUBLIC_DEPLOYMENT.md.

Remote CI run43626894174 passed for experience commit5758712d6eb31790751e8f70b45d2d8699fedfc9. Anonymous live checks of Sites version2 passed, including all four GLBs and390px mobile. A later crop-quality regression check ensures switching to Static unloads an already opened plant canvas and switching back requires another explicit3D request.

The active crop viewer now distinguishes renderer teardown from a genuine WebGL context loss. Reopen/poster/static-quality regression and all five experience tests passed after the cleanup fix.
