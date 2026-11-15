# Presentation report export

The app's **Your plan / Export** page prepares a complete report in the browser. **Print a field plan** calls `printAgrorithmReport()`, waits for fonts, the cover and measured pagination, then opens native browser print. Select **Save as PDF**, retain the document's page size, and disable browser-added headers and footers. The report uses exact 16:9 landscape sheets: 1920 × 1080 CSS pixels, equivalent to 20 × 11.25 inches or 1440 × 810 PDF points.

There is no PDF service, secret key, screenshot-to-PDF step or canvas rasterization. Charts are inline SVG and table/text content remains searchable. The supplied `Report first page.png` is preserved as the full first page via `public/images/report-cover.png`. All other pages are generated from the current farm, scenario, engine results, evidence and recorded view/filter settings. CSV export remains unchanged.

## Component and print contract

`src/report/AgrorithmReport.tsx` exports the default `AgrorithmReport` component and the named `printAgrorithmReport` helper. Required properties are `farm`, `scenario`, `results`, `weatherSource`, `weather`, `veg` and `modelVersion`. Optional `weatherCoordinates` records the weather point and actual coordinate alignment. `uiSnapshot` accepts a flat record of strings, numbers, booleans and null/undefined; serialize nested state to JSON first. Optional `generatedAt` supplies an ISO timestamp for reproducible review; otherwise printing updates the generation timestamp. `brandName` defaults to the central brand configuration.

The App mounts the report on its export page. The component creates an isolated body portal and adds a final print-page declaration so legacy A4 rules cannot override its 16:9 page size. `preview` is intended only for local design/QA surfaces. Screen measurements are retained when entering print media, because the print stylesheet deliberately removes the offscreen measurement tree.

## Coverage

- Every farm input, optional polygon, farmer observation, existing crop date and residue selection. Device-geolocation metadata, when present, adds its reported accuracy in metres and capture date plus the requirement to confirm that the estimate actually identifies the farm. Default farms without that metadata add no provenance rows.
- Current scenario perturbations, priority weights and supplied view/filter snapshot.
- Feasibility, unknown evidence, management warnings and individual comparison components before the optional index.
- Common 36-month calendars with staged crop intervals, exact dates, seven-day transitions and stated residue assumptions.
- Crop ET, effective rainfall, initial/final storage, uncropped evaporation, drainage, net and delivered irrigation, volume and weather coverage.
- Historical weather coverage/age, vector monthly weather chart, EO product/version/footprint/quality and scene-level NDVI/coverage ledger with linked granule records.
- A paired root-zone/groundwater model preview using the actual bundled Blender poster renders, with explicit approximately 0-2 m versus 0-20 m depth contexts, the groundwater scale break, a demo 7 m water table, pore-water legend and separate observed/measured, modeled and illustrative disclosures.
- Stage-specific exposure, historical replay values, six enumerated rainfall/Kc sensitivity cases, Pareto status, fixed normalization and current index weights.
- Complete current crop registry, provisional flags, methods, sources and local follow-up checks.

Raw daily weather rows are summarized rather than expanded into thousands of report rows. The exact cached/imported data files and the app's machine-readable exports remain the appropriate data exchange artifacts. The report makes no forecast, yield/profit prediction, fertilizer replacement, aquifer simulation or guaranteed soil recovery claim. Orchards and global atlas reference profiles do not silently enter the annual rotation engine.

## Pagination and typography

The renderer measures individual table rows and bounded text/chart blocks at the final 1728-pixel content width. It packs them into fixed page bodies, repeats table headers, reserves a rounding allowance and balances sparse continuation pages. Long observations, polygon strings and source text split into continuation rows without losing characters. The model figure is a fixed 720-pixel block; images have fixed display frames so decoding cannot change pagination. It uses `images/root-zone-v2.webp` and `images/groundwater-v2.webp`, already in the small offline precache, rather than the larger PNG source renders. Page numbers and total page count are generated after layout. The DOM exposes `data-report-ready` and `data-oversized-blocks` for automated checks.

Century Gothic is the primary font when installed. It is available on the verified Windows workstation and is not redistributed as a webfont. Other devices fall back to the application's bundled DM Sans / Segoe UI. Italic accents use bundled Instrument Serif or Georgia. The supplied cover and two model posters are raster assets; captions, disclosures, other text, charts and tables remain vector/searchable content. A physical printer can override custom paper sizing; the verified delivery path is Chromium's Save as PDF.

## Chart and text safe areas

The 96-pixel outer page margin remains fixed. Every SVG chart additionally reserves 32 pixels inside its own frame for titles, labels and legends. Water charts use separate name, plot and right-aligned value columns; values cannot run beyond a bar into the page margin. Axis/value strings use measured scientific notation when ordinary digits would exceed their column. Numeric results in tables and JSON/CSV are unchanged.

Labels wrap using the actual configured browser font rather than a fixed character count. Calendar rows grow for two-line crop labels, and water labels allow three lines without reducing their 22-pixel type size. Extremely long chart labels end visibly with an ellipsis; the full sequence/crop names remain in the tables and SVG accessible titles. Long running page headings also ellipsize within their explicit header column while the complete values remain in the body tables. Captions and ordinary report text wrap within the safe page width. Nonfinite/out-of-range NDVI is not plotted outside the fixed -1 to 1 axis; a cross and line break preserve its invalid/missing state, with supplied values retained in the scene ledger.

The chart frame's overflow guard is secondary protection. Verification checks the actual text/path/rectangle/circle/line bounds inside the SVG, not merely whether overflowing paint is clipped. It also checks horizontal text margins, header/body separation and measured pagination before exporting.

## Actual verification

Verification on 15 November 2026 used headless Chromium 158 and Poppler page rendering. The final actual App export, generated from a fresh 390 × 844 browser context, produced **50 pages, 3,590,567 bytes**, with **1440 × 810 pt** page boxes verified on every page, tagged/searchable content, no page/asset errors, no oversized blocks, and no header/body overlap, horizontal text overflow, page-body overflow or chart/figure overflow. All seven SVG charts passed the 32-pixel safe-area geometry checks. The paired scientific illustration remains **page 19**. Both actual 1200 × 938 WebP renders decoded successfully. All five updated page contact sheets and the full-size water/weather/NDVI/calendar pages were visually inspected after the margin corrections. Embedded Century Gothic regular/bold and Instrument Serif italic were verified in the PDF font resources.

An additional fresh-context check first visited Help, waited for the service-worker precache, then switched offline before visiting the report for the first time. The complete 50-page report prepared successfully and both model figures decoded from the offline cache. No model GLB visit or prior report visit was needed.

A separate synthetic geolocation software fixture exercised the optional provenance branch through the actual setup action and report route. It displayed the device-estimate method, 25 m reported accuracy, capture ISO date and farm-point confirmation text. The fixture was not exported over the sample PDF; the delivered sample contains no device-location metadata.

Five current synthetic layout variants passed the same actual SVG geometry, page-body and horizontal text-bound checks: normal (50 pages), very long crop/sequence labels including unbroken wide letters (81), very large numerical values (52), extreme weather/water/Kc scenario settings (51), and insufficient data (42). Their chart pages were rendered/inspected, and their PDFs remain test-only cache artifacts. Report length is data-dependent; pagination grows instead of shrinking text to force a fixed page count. The supplied private PDF was inspected read-only; neither it nor its private renders are project deliverables.

The sample PDF is `output/pdf/Agrorithm-sample-report.pdf`. The normal fixture uses genuine cached observations plus the explicitly assumed sample farm. The long-input and request-failure fixtures are test-only and are not published as genuine observations. The final App PDF was generated from a fresh browser context, not a private saved farm.

Meaningful unit checks in `tests/report.test.ts` cover exact long-text preservation, repeated-header pagination costs, zero versus missing values, broken SVG paths at missing observations, partial-month suppression, leap-year February, measured wide-letter/Unicode wrapping, scientific notation and finite geometry at extreme numeric ranges. Report lint, all seven tests and TypeScript passed. These are software/layout checks, not agronomic validation.

To reproduce a PDF programmatically, run the app, open the export route with Playwright, wait for `.agr-report[data-report-ready="true"]` and `document.fonts.ready`, emulate print media, then call `page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true })`. Re-render the resulting PDF with `pdftoppm` and inspect it after content, font or layout changes.
