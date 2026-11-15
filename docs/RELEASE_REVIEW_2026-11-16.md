# Release review — 16 November 2026, Pakistan time

## User-facing refinements

- An **Our Project** action is visible in the opening. The homepage introduction explains Agrorithm and links to About and jt_1. Both links were exercised at 1440 and 390 pixels, without horizontal overflow.
- Cards, evidence strips, buttons and model annotation panels use a consistent, restrained shadow system.
- Wheel and trackpad page travel is scaled to 25%, with a bounded 110 ms smoothing response. Manual model/map zoom, nested scrolling, keyboard interruption and reduced motion retain their native behavior. The Earth retains its full guided sweep across the longer physical scroll distance.
- Homepage Inspect/zoom controls now enter and retain manual camera mode. Reset and Resume scroll restore the guided view. The equivalent root/groundwater controls use the same implementation.
- Named scientific subscripts, including maximum/minimum labels, render as actual small lowered text.

## Executed checks

- TypeScript and ESLint passed. The current unit suite passed **94 tests across 17 files**.
- The production build completed with the `/Agrorithm/` base and a generated scoped offline cache.
- A full local 52-case browser run passed 48 cases. One console sensitivity assertion timed out under concurrent rendering, and three results-review assertions addressed information inside closed disclosures. Instrumentation confirmed the worker completed correctly. The focused calculation budget was adjusted, and the evidence tests now open the disclosure and also check the visible summary. **All four affected cases passed on focused rerun**. This is not a claim that the initial full run passed.
- Actual WebGL camera regression: **84 checks** across homepage/explorer, normal/reduced motion and emulated phone interaction. Separate wheel-controller regression: **19 browser checks**; small wheel ticks, native exemptions, interruption and idle-frame behavior were exercised.
- Homepage project links passed desktop/phone layout and navigation checks. Evidence: `docs/design/agrorithm/our-project-checks.json` and adjacent screenshots.
- The public Sites version 9 helper was exercised anonymously. Model/runtime responses were HTTP 200; no model weights downloaded before consent. The trained source reading returned the verified **259.09 mm** July 2023 precipitation value. Cold loading took **35.56 s**, followed by **3.17 s** generation on the development computer. A 390-pixel accepted response and an intentionally blocked download both remained usable. No JavaScript page errors were observed. Evidence: `docs/design/agrorithm/helper-results/live-reader-v9/`.

## Model integrity correction

Version 8 correctly rejected corrupted model parts. Git had expanded line endings inside JSON-containing binary parts, changing the tokenizer from 2,422,332 to 2,551,759 bytes. Binary Git attributes now preserve every model part. All 30 parts, eight assembled files and 97,894,525 bytes were checked against size, SHA-256 and committed blob identities. Runtime integrity checks remain enabled. The successful version 9 public browser test verified the exact tokenizer checksum again.

## Publication and limits

The public Sites preview is `https://fieldshift-jt1.spacetime24.chatgpt.site/?revision=9`. GitHub Pages has its own artifact/release record; a successful source push or Sites publication does not establish that Pages is updated. The release workflow verifies pinned model parts, runs the complete checks and prepares the `gh-pages` artifact without merging PR #1. A separate authenticated publication trigger is needed after a workflow-token artifact push.

Viewport emulation and headless WebGL do not establish physical-phone performance or integrated-GPU frame rates. The optional trained reader is a narrow, guarded source-verbalization experiment, not a general agronomist. Its retained training audits show broader generalization failures. Software checks do not establish agronomic validity. Historical observations retain their true dates; the regional sample and illustrative soil geometry are not field measurements or forecasts.
