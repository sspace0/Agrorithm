# Model camera control regression

The reported frame is the homepage soil illustration. Its Diorama passed
`interactive={false}` whenever the full soil explorer was not open, although
ModelStage displayed Inspect, zoom and reset controls. Inspect returned early;
zoom moved the camera only until the guided camera restored it on the next frame.

Before the fix, actual production WebGL on the homepage retained projected
model bounds of **511.7337 × 396.9675 px** after Inspect, plus and minus. Its camera
mode stayed `scroll`. The same controls in `/soil` worked, showing why earlier
explorer-only checks missed the failure.

Diorama now uses ModelStage's interactive default in every location. Entering
manual mode explicitly enables orbit and pan, captures touch gestures, and
invalidates a demand-rendered frame. Reset restores page touch scrolling.

Run `node scripts/model-controls-qa.mjs` against the preview at port 4173, or set
`MODEL_CONTROLS_URL` to another deployment including its base path. An optional
`--filter=home-phone` restricts the cases. `results.json` records camera position,
target, distance, projected geometry bounds and actual layer offsets. Screenshots
show the initial frame, zoom, orbit and reset for each case.

The checks use actual headless Chromium WebGL and emulated touch input. They do
not establish physical-device rendering performance or FPS.
