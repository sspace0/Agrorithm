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

## Actual verification

Verification on 15 November 2026 used headless Chromium 158 and Poppler page rendering. The final actual App export produced **50 pages, 3,580,199 bytes**, with **1440 × 810 pt** page boxes verified on every page, tagged/searchable content, no page/asset errors, no oversized blocks, and no header/body overlap, page-body overflow or inner-figure overflow. The paired scientific illustration is **page 19**. Both actual 1200 × 938 WebP renders decoded successfully. The supplied cover, all five updated page contact sheets and the full-size illustration page were visually inspected. Embedded Century Gothic regular/bold and Instrument Serif italic were verified in the PDF font resources.

An additional fresh-context check first visited Help, waited for the service-worker precache, then switched offline before visiting the report for the first time. The complete 50-page report prepared successfully and both model figures decoded from the offline cache. No model GLB visit or prior report visit was needed.

A separate synthetic geolocation software fixture exercised the optional provenance branch through the actual setup action and report route. It displayed the device-estimate method, 25 m reported accuracy, capture ISO date and farm-point confirmation text. The fixture was not exported over the sample PDF; the delivered sample contains no device-location metadata.

Before adding the fixed-size illustration page, the isolated normal, water-constrained, insufficient-data and long-text/polygon fixtures also passed measured layout checks (50, 51, 41 and 62 pages respectively). Those fixture counts describe that earlier pagination check; the final 50-page actual App export was regenerated and fully checked after the illustration was added. Report length remains data-dependent.

The sample PDF is `output/pdf/Agrorithm-sample-report.pdf`. The normal fixture uses genuine cached observations plus the explicitly assumed sample farm. The long-input and request-failure fixtures are test-only and are not published as genuine observations. The final App PDF was generated from a fresh browser context, not a private saved farm.

Meaningful unit checks in `tests/report.test.ts` cover exact long-text preservation, repeated-header pagination costs, zero versus missing values, broken SVG paths at missing observations, partial-month suppression and leap-year February. Report lint, these four tests and TypeScript passed. These are software/layout checks, not agronomic validation.

To reproduce a PDF programmatically, run the app, open the export route with Playwright, wait for `.agr-report[data-report-ready="true"]` and `document.fonts.ready`, emulate print media, then call `page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true })`. Re-render the resulting PDF with `pdftoppm` and inspect it after content, font or layout changes.
