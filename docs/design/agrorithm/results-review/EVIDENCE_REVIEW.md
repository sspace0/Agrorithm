# NASA evidence presentation review

Executed 15 November 2026 against the running Vite app at `http://127.0.0.1:5188/Agrorithm/` using headless Chromium. This review uses the real rendered application; it is not a mockup or a physical-device performance test.

Reproduce with `node docs/design/agrorithm/results-review/review-evidence.mjs`. Set `EVIDENCE_REVIEW_URL` to inspect another running build at its configured base path. Service workers are blocked to avoid stale artifacts. Graphics are set to poster-only and reduced motion for these evidence and layout checks.

## Executed cases

At both 1440 × 1000 and 390 × 844:

- Genuine bundled sample: POWER dates **2018-01-01–2024-12-31**, 2,557 complete daily records; HLS L30 v2.0 acquisition span **2023-01-05–2023-12-31**, **16 of 43** scenes passing the 50% valid-footprint threshold.
- Satellite request forced to HTTP 503: orange unavailable-evidence block, no invented NDVI, visible results-strip warning, and working navigation to manual data import.
- Coordinates moved away from the observation footprint: orange mismatch notice explaining that moving the marker does not move the observations.
- Weather imported through the actual JSON file control: explicitly user-imported/unverified source; original units, time standard and spatial support require checking. No NASA grid or UTC metadata is attached to imported rows.

The automated assertions check viewport overflow, dataset/text framing, minimum displayed text size, touch-button height, four evidence-origin categories, category overlap, dates/coverage, fallback styling, and fallback navigation. Native details controls expose calculation and interpretation limits. The soil-health note names the proxies and their limits; future SMAP work is explicitly unimplemented.

## Inspection and fixes

Raster inspection found the fixed helper trigger could cover results content. The root implementation changed results-page helper placement to the document flow; the latest screenshots were captured after that change. Settled helper/footer intersection is **0 px²** at both widths. The initial tall element-capture method also placed the fixed header through the captured section; the harness now captures actual viewport positions beneath the header instead.

The final run records **8 scenario passes plus 2 helper-clearance passes**, **0 page errors**, **0 layout issues**, and **0 failures** in [evidence-results.json](evidence-results.json). Selected screenshots:

- [Desktop results evidence window](evidence-1440-sample-strip.png)
- [Desktop dataset panel](evidence-1440-sample-panel.png)
- [Desktop origin categories and soil-health note](evidence-1440-sample-origins.png)
- [Phone evidence window](evidence-390-sample-strip.png)
- [Phone origin categories](evidence-390-sample-origins.png)
- [Phone soil-health note](evidence-390-sample-soil-note.png)
- [Phone satellite fallback](evidence-390-missing-satellite-fallback.png)

This review verifies evidence presentation and software behavior. It does not provide agronomic validation or imply that NDVI numerically controls rotation ranking. The historical weather directly drives water and exposure estimates; NDVI currently supplies observed vegetation context for farmer confirmation.

## Sources-page scope audit

The new `NASA data in this tool` panel was also executed and visually inspected at 1440 × 1000 and 390 × 844. `review-source-scope.mjs` checks exactly two implemented decision-evidence integrations, six explicit absent integrations, metadata-only future parameter details, minimum 12 px text, layout bounds, and the working manual-import link. Both viewport cases passed with no page errors or overflow; results are in [source-scope-results.json](source-scope-results.json).

The panel separately identifies Blue Marble as a visual basemap. POWER humidity and wetness metadata are explicitly unimplemented; [DATA_SCOPE.md](../../../DATA_SCOPE.md) records the official parameter endpoints, actual units, source distinctions and retrieval limitations. The phone's global floating helper can touch prose near the lower viewport edge on the Sources page; this residual global placement issue was reported to the root implementation for the same treatment as the results pages.
