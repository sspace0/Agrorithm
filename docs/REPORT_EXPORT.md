# Presentation report export

The app's **Your plan / Export** page prepares a complete report in the browser. **Print a field plan** calls `printAgrorithmReport()`, waits for fonts, the cover and measured pagination, then opens native browser print. Select **Save as PDF**, retain the document's page size, and disable browser-added headers and footers. The report uses exact 16:9 landscape sheets: 1920 × 1080 CSS pixels, equivalent to 20 × 11.25 inches or 1440 × 810 PDF points.

There is no PDF service, secret key, screenshot-to-PDF step or canvas rasterization. Charts are inline SVG and table/text content remains searchable. The supplied `Report first page.png` is preserved as the full first page via `public/images/report-cover.png`. All other pages are generated from the current farm, scenario, engine results, evidence and recorded view/filter settings. CSV export remains unchanged.

## Component and print contract

`src/report/AgrorithmReport.tsx` exports the default `AgrorithmReport` component and the named `printAgrorithmReport` helper. Required properties are `farm`, `scenario`, `results`, `weatherSource`, `weather`, `veg` and `modelVersion`. Optional `weatherCoordinates` records the weather point and actual coordinate alignment. `uiSnapshot` accepts a flat record of strings, numbers, booleans and null/undefined; serialize nested state to JSON first. Optional `generatedAt` supplies an ISO timestamp for reproducible review; otherwise printing updates the generation timestamp. `brandName` defaults to the central brand configuration.

The App mounts the report on its export page. The component creates an isolated body portal and adds a final print-page declaration so legacy A4 rules cannot override its 16:9 page size. `preview` is intended only for local design/QA surfaces. Screen measurements are retained when entering print media, because the print stylesheet deliberately removes the offscreen measurement tree.

## Coverage

- Every farm input, optional polygon, farmer observation, existing crop date and residue selection.
- Current scenario perturbations, priority weights and supplied view/filter snapshot.
- Feasibility, unknown evidence, management warnings and individual comparison components before the optional index.
- Common 36-month calendars with staged crop intervals, exact dates, seven-day transitions and stated residue assumptions.
- Crop ET, effective rainfall, initial/final storage, uncropped evaporation, drainage, net and delivered irrigation, volume and weather coverage.
- Historical weather coverage/age, vector monthly weather chart, EO product/version/footprint/quality and scene-level NDVI/coverage ledger with linked granule records.
- Stage-specific exposure, historical replay values, six enumerated rainfall/Kc sensitivity cases, Pareto status, fixed normalization and current index weights.
- Complete current crop registry, provisional flags, methods, sources and local follow-up checks.

Raw daily weather rows are summarized rather than expanded into thousands of report rows. The exact cached/imported data files and the app's machine-readable exports remain the appropriate data exchange artifacts. The report makes no forecast, yield/profit prediction, fertilizer replacement, aquifer simulation or guaranteed soil recovery claim. Orchards and global atlas reference profiles do not silently enter the annual rotation engine.

## Pagination and typography

The renderer measures individual table rows and bounded text/chart blocks at the final 1728-pixel content width. It packs them into fixed page bodies, repeats table headers, reserves a rounding allowance and balances sparse continuation pages. Long observations, polygon strings and source text split into continuation rows without losing characters. Page numbers and total page count are generated after layout. The DOM exposes `data-report-ready` and `data-oversized-blocks` for automated checks.

Century Gothic is the primary font when installed. It is available on the verified Windows workstation and is not redistributed as a webfont. Other devices fall back to the application's bundled DM Sans / Segoe UI. Italic accents use bundled Instrument Serif or Georgia. The supplied cover is a raster asset; the remaining report is vector text, SVG and table content. A physical printer can override custom paper sizing; the verified delivery path is Chromium's Save as PDF.

## Actual verification

Verification on 15 November 2026 used headless Chromium 158 and Poppler page rendering. The actual App export produced **49 pages, 1,597,848 bytes**, with **1440 × 810 pt** page boxes on every page, tagged/searchable content, no page errors, no oversized blocks, and no header/body overlap or page-body overflow. The supplied cover, all page contact sheets and representative detailed pages were visually inspected. The isolated normal, water-constrained, insufficient-data and long-text/polygon cases also passed the measured layout checks (50, 51, 41 and 62 pages respectively; page counts are data-dependent).

The sample PDF is `output/pdf/Agrorithm-sample-report.pdf`. The normal fixture uses genuine cached observations plus the explicitly assumed sample farm. The long-input and request-failure fixtures are test-only and are not published as genuine observations. The final App PDF was generated from a fresh browser context, not a private saved farm.

Meaningful unit checks in `tests/report.test.ts` cover exact long-text preservation, repeated-header pagination costs, zero versus missing values, broken SVG paths at missing observations, partial-month suppression and leap-year February. Report lint, these four tests and TypeScript passed. These are software/layout checks, not agronomic validation.

To reproduce a PDF programmatically, run the app, open the export route with Playwright, wait for `.agr-report[data-report-ready="true"]` and `document.fonts.ready`, emulate print media, then call `page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true })`. Re-render the resulting PDF with `pdftoppm` and inspect it after content, font or layout changes.
