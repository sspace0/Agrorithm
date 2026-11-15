# Button audit — 15 November 2026

Update: the reset crash described below was fixed by binding report pagination to its measured section snapshot. Fresh production-preview reset and native PDF regression tests passed after the fix. The current PDF contains 63 verified pages. The original published-build failure is retained below as historical evidence; it is not a claim that the corrected source still crashes.

Target: `https://sspace0.github.io/Agrorithm/?revision=6`, source deployment reported as `2da45713dca26ac69e90afd2f959ad1410a747e9`.

Actual clicks used fresh headless Chromium contexts, static graphics and blocked service workers. No user browser state or real device location was used. `window.print` was stubbed only to confirm the export button invokes it. Native PDF layout was separately validated in `design/agrorithm/report-final/results.json` (52 pages, no geometry/asset/page errors).

## Confirmed controls

- All eight “Plan with” crop actions: wheat, maize, mungbean (`mung` id), chickpea, tomato, potato, citrus and mango. Each reached field setup with the corresponding selected crop.
- All six planning navigation steps in all three concepts; all three actual sensitivity workers completed six scenarios.
- Help: six topic buttons, All questions, unsupported query and Show all questions recovery.
- Weather patterns: four pattern buttons, all 84 month buttons, historical month selector, custom comparison open/valid/invalid/close, methods disclosure, model download (54,026 bytes; 84 observations), forced HTTP 503 and successful Try again recovery.
- Export: actual JSON, CSV, farmer feedback template downloads and Presentation PDF invocation. Save and delete changed device storage as intended before reset.
- In a separate clean page after the crash: invalid plan JSON was rejected and valid exported JSON restored; editable crop registry download/import/bundled restore passed; malformed daily weather JSON was rejected.
- Phone (390 px): settings open/close, motion on/off, graphics selection, global search open/close and result navigation; add/remove crop, demonstration dates, hectares/acres toggle, scenario stress reset; crop search selection and no-result state. All three supplementary groups passed.

## Release-blocking defect found

On the published build, Reset all inputs on the plan export page can crash the React root with `Cannot read properties of undefined (reading 'kind')`. The subsequent empty route inventories and import timeouts are consequences of this crash, not passing inventory evidence.

Reproduction in a fresh static-quality context:

```js
await page.goto(base + '#/studio/setup');
await page.locator('.boot-overlay').waitFor({ state: 'hidden' });
await page.getByRole('button', { name: 'Load sample', exact: true }).click();
await page.getByRole('link', { name: /Your plan/ }).first().click();
await page.getByRole('button', { name: 'Save on this device', exact: true }).click();
await page.getByRole('button', { name: 'Delete saved plan', exact: true }).click();
await page.getByRole('button', { name: 'Reset all inputs', exact: true }).click();
// pageerror; document controls disappear.
```

The observed full sequence also downloaded JSON/CSV/template and clicked Presentation PDF with `window.print` stubbed before save/delete/reset. Source hint: `src/report/AgrorithmReport.tsx`, `BlockGroups`, reads `const b = blocks[i]; if (b.kind...)`; old pagination indices can address undefined entries after report sections change. Root agent owns the fix and regression check.

## Coverage boundaries and evidence

`design/agrorithm/button-audit/results.json` contains the actual published-site workflow outcomes and crash. Its 15 post-crash empty inventory entries must be ignored. `extra-results.json` records three passing phone groups; `inventory-results.json` records isolated restore/import passes and partial fresh route inventories (home, help, weather patterns, crops, atlas, soil, sources and about). `weather-custom.jpg`, `export.jpg` and `phone-controls.jpg` show actual states. `audit.mjs`, `extra.mjs` and `inventory.mjs` are rerunnable audit scripts; the last inventory attempt was stopped to respect the user budget and is not a complete inventory.

Existing executed browser coverage reported by the root agent (source CI `43721081546`, 40 tests) additionally covers opening/skip/loading, keyboard search and skip link, mocked geolocation success/denial/races, atlas zoom/pinch/pan/location/filter/opacity, offline sample, failed NASA request, model missing/context loss/poster/reload, crop group/profile controls, all concept journeys and exports, and responsive routes. Existing model-review evidence exercises inspect/camera/reset/layers/annotations/groundwater depth against rendered models. These earlier executed checks were not repeated in this focused audit.

The focused audit does not establish every possible combination, external source availability, live NASA request success, native geolocation, or final post-fix deployment behavior. Internal linked-asset HTTP coverage was interrupted; successful actual downloads above are verified, but a complete linked-asset status inventory is not claimed.
