# Orbital opening and atlas review

Reviewed on 15 November 2026 in the actual static production build. The design reference was [Lusion's interactive studio](https://lusion.co/), inspected in a browser: a restrained masthead, large rounded 3D stage and generous editorial sections. `lusion.ai` is a separate AI-products website. The implementation adapts presentation principles; no reference artwork, models, shaders or branding were copied.

## Opening

The orbital exhibition now occupies the full viewport from the top edge. Navigation is removed from layout, hidden and `inert` during the opening; it appears after the Earth-to-map stage completes at approximately 94% of the guided sequence. Start planning, the sample, Skip intro and Skip to map remain available immediately. Reduced motion, static quality and WebGL failure bypass the hidden navigation. Completion and bypass latch for the current home visit, while route cleanup restores normal navigation elsewhere. The pinned-progress calculation reads the actual CSS top rather than assuming a 106-pixel header.

The desktop sequence spans 390 viewport heights, and the phone sequence 340. The globe has a slow damped turn, historical NASA cloud artwork, illustrative sunlight, restrained pointer parallax and orbital guide lines. A shaped text backplate preserves contrast. The rounded stage expands into a full-width historical map. Portrait camera distance accounts for horizontal field of view, so the complete sphere fits a narrow phone; the desktop globe is shifted inward to avoid edge clipping. A large editorial section links observations, underground explanation and crop options before the existing soil story.

## Map interaction

The atlas now zooms from 1× to 24× using the wheel, buttons, keyboard or two-finger pinch. Wheel zoom preserves the geographic point beneath the cursor. Dragging pans within bounded map edges; panning does not change selected coordinates. One-finger touch remains page scrolling. The marker stays the same screen size at high zoom. `+` / `−` zoom, `0` resets the view and Escape releases wheel zoom; an explicit Scroll zoom toggle remains available. Reset view preserves the selected farm point. View pan/zoom persist separately from farm inputs.

NASA Blue Marble remains the August 2004 historical basemap. The climate overlay retains its genuine 1991–2020 classification and 0.5° support. Magnifying existing pixels does not create field detail; the interface says so. Soil filtering and global crop-family screening remain hypothetical/provisional. Shared category plant images now identify their representative scope explicitly.

## Actual checks and fixes

- TypeScript, scoped ESLint and production build passed.
- Three independent camera-math tests passed: cursor anchoring to numerical precision beyond the former 4× cap, pan/zoom bounds and centering/reset.
- Six production-browser regressions passed: desktop wheel/anchor/pan/24×/reset, native Chromium phone pinch and single-finger page scroll, full-screen opening/header inertness and reveal, phone Skip-to-Setup, reduced-motion bypass and static bypass.
- A complete three-size sweep produced 29 rendered/layout observations at 1440×1000, 768×1024 and 390×844. The subsequently corrected phone projection passed an affected 10-observation run. The latest structured `results.json` is that phone run; the full sweep's screenshots remain beside it.
- Actual screenshots were inspected at initial/middle/final orbital positions, editorial content, joined/open/rejoined home soil stages, world/24× atlas views, tablet scenario charts and reduced motion.
- The final desktop/phone footer check measured the floating helper and Skip-to-map bounds, confirmed no overlap, and clicked both Skip-to-map links successfully. Evidence: `footer-check.json` and the opening/skip-map screenshots.

Inspection found real issues and led to fixes: a globe edge clipped after the stage became taller; portrait projection-aware fitting and an inward desktop offset fixed it. The floating helper covered the footer shortcut; reserved space fixed the overlap. Narrow tablet What-if columns suppressed a chart label; the quantitative chart now has a full-width row. Native view transitions and asynchronous wheel delivery initially made the screenshot harness dispatch input before its target was actionable; it now waits for the map target and each observed zoom update. The standalone cursor-anchor and native-touch regressions passed independently.

Reproduce with `pnpm exec playwright test tests/browser/atlasZoom.spec.ts tests/browser/landing.spec.ts`, and `VISUAL_QA_URL=<production-preview-base> node scripts/scroll-map-qa.mjs`. The latter writes actual screenshots into `docs/design/agrorithm/lusion-polish/`; `VISUAL_QA_FILTER=phone` runs an affected phone check. Background preview was isolated on port 5201 to preserve the main release build.

No hardware frame rate or physical-phone result is claimed. Touch events were exercised through Chromium's native input protocol in a touch-enabled context. Software screenshots and bounds are not agronomic validation. Camera display units, orbital paths and sunlight placement are illustrative; the rotation engine and data calculations were preserved.
