# Setup, rebuild and deployment

Requirements: Node 24 LTS and pnpm 11.25.0. Dependencies are locked in pnpm-lock.yaml. Versions were checked against official Vite and React Three Fiber documentation; Fiber 9 pairs with React 19. Current peer requirements were checked before installation. Windows development used Node 24.22.1 and Blender 5.2.1 LTS.

```sh
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm preview --port 4173
pnpm exec playwright install chromium
pnpm test:e2e
```

Open http://127.0.0.1:4173/Agrorithm/ for the production preview. Vite's development/preview servers are local development tools; deployment serves only `dist/`. Hash navigation supports refresh and direct entry. Set `DEPLOY_BASE=/another-path/` before build to change all runtime asset and service-worker URLs independently of display branding. A base must start and end with `/`.

## Source regeneration

```sh
pnpm data:fetch
python -m pip install -r scripts/requirements-data.txt
python scripts/fetch-hls.py
pnpm assets:fetch
blender --background --threads 6 --python assets/blender/generate.py
```

The data jobs are explicit local operations. POWER uses seven sequential bounded yearly requests. HLS downloads small COG windows through the Microsoft mirror; a temporary container read signature stays in process memory and must never be committed or logged. No Earthdata, GitHub or paid API key belongs in `VITE_` variables. Full raster downloads and credentials are excluded. Source parameters, QA rules, bounds and checksums are committed. Raw POWER responses are small and redistributable. No remote texture hotlink is used at runtime.

Blender rebuilds root-zone.blend, groundwater.blend, GLBs, PNG posters and validation.json. PBR source maps remain under assets/textures; Blender packs resized runtime maps. Inspect `public/models/` in the actual browser after rebuilding. The scenes use deterministic random seed 42. The current v2 root-zone GLB is 7.71 MB raw / 5.75 MB gzip; groundwater is 6.03 MB raw / 4.87 MB gzip. The four category GLBs total 0.71 MB raw. Source scenes and deterministic v2 scripts remain in assets/blender; current measurements are documented in docs/EXPERIENCE_UPDATE.md. No Git LFS is used.

## Current GitHub Pages deployment

The owner authorized public repository visibility and publication. The site is live at https://sspace0.github.io/Agrorithm/ from the reviewed static artifact on gh-pages; PR1 remains open and unmerged. See PUBLIC_DEPLOYMENT.md for observed checks and exact revisions.

The current manual release builds the reviewed source with DEPLOY_BASE=/Agrorithm/ and advances only the artifact branch. The source includes an official-actions workflow for future deliberate dispatch after it is available on the default branch through an authorized merge. To use it, choose GitHubActions under Settings→Pages and dispatch DeployPagesmanually with publish=true on the approved ref. Do not merge or publish development changes automatically.

CI is independent of publishing. It runs install, types, lint, engine tests, production build and browser checks. Official actions were verified against GitHub's current custom Pages documentation: checkout v7, configure-pages v5, upload-pages-artifact v4, deploy-pages v4; Node setup v7. Deployment permissions are scoped to its jobs, with deployment concurrency and github-pages environment.

## Local data and offline use

Plans are localStorage records under `fieldshift-plan`. Quality/motion preferences use separate project keys. The removed language control defaults to English; legacy plan storage keys are preserved for continuity. Saved plan deletion removes the plan record; reset also clears current field inputs. A browser export is a deliberate local download, not cloud publication. No analytics or third-party font requests.

The production service worker caches the versioned static bundle after a successful first visit. After installation, the core sample, report cover, logo and navigation work offline. Large GLBs/posters enter the runtime cache after a visit; phones start with lightweight posters and opt into 3D. Live weather retrieval is optional; failed requests preserve the current series. Update deployment hashes generate a new cache. Local development does not install a service worker. For development debugging, clear the site's service worker/cache in browser devtools when necessary.

The UI supports weather JSON with explicit dataset coordinates and plan JSON with soil and crop dates. Example schema is in docs/IMPORTS.md. A changed field coordinate invalidates the regional weather match until matching data is supplied. It does not silently transplant cached observations.

On the existing Windows workspace, `./scripts/run.ps1 dev` (or build/preview/typecheck/lint/test) locates a normal pnpm installation or the bundled runtime beside Node. This avoids hardcoding a particular Codex runtime version.

## Public hosted website

Both GitHubPages and Sites are public at the URLs in PUBLIC_DEPLOYMENT.md. This does not merge PR1. The hosting build uses DEPLOY_BASE=/; Pages uses /Agrorithm/.

## Device location

**Find your farm’s location** is available in field setup and the atlas. The browser asks for permission only after a press; there is no background location watch. HTTPS or trusted localhost and browser/provider support are required. The returned point is this device, not necessarily the farm. Its reported accuracy and acquisition time are visible; confirm it before planning. Manual input, cached-place search and online place search remain available. Denial, timeout or unavailable services keep the existing point. A newer manual selection invalidates a pending location response. Local plan JSON/PDF retain device provenance; manually changed coordinates clear it. The app does not upload location to its own service. A later explicitly requested weather/geocoding call uses the coordinates/query needed by that provider.
