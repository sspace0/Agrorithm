# Model downloads on a throttled connection

Executed on 15 November 2026 with Chromium CDP network emulation: 150 ms latency, 200,000 B/s download and 93,750 B/s upload. Fresh contexts, HTTP cache disabled, service workers blocked. This is browser/viewport emulation with SwiftShader, not a physical-phone, integrated-GPU or FPS benchmark.

Four cases passed. A 390 px phone requested no GLB before explicit 3D opt-in. Its first poster appeared after 11.29 s and planning navigation was usable after 11.27 s. Root-zone download body: 7,705,588 bytes; 41.19 s on phone and 40.95 s on desktop. Groundwater body: 6,029,336 bytes; 31.89 s. Full render readiness includes page/runtime/decoding work: 64.36 s from phone navigation, 62.62 s for desktop roots and 57.49 s for desktop groundwater. Phone root readiness was 51.86 s after opt-in.

A deliberately held model request did not prevent editing the planning form. A failed request retained the poster and explanatory fallback. Its expected failed-fetch error is recorded separately from successful loads, which had no page errors. The initial poster/runtime delay and large cutaway downloads remain real limitations; this test does not establish acceptable performance on every device.

Reproduce with `node scripts/model-network-qa.mjs`. Exact measurements, model bounds, network responses and screenshots are in `docs/design/agrorithm/results-review/network/`. Models remain lazy and optional. Meshopt compression and decoder integration are future work and are not claimed in this release.
