# Natural cutaways v2

Generate both editable sources, glTF exports, transparent posters and measurements:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --threads 6 --python assets/blender/generate_v2.py
```

The deterministic generator uses Blender 5.2.1 LTS. It packs 512-pixel copies of the existing CC0 source maps listed in `assets/textures/manifest.json`. Underground diffuse maps are desaturated and given baked brown/mineral tints; no procedural-only color correction is required at runtime. Planar UV projection uses a consistent 1.6 m tile. Original source textures remain intact.

`root-zone-v2.blend` and `groundwater-v2.blend` are the editable source scenes. Matching `.glb` files are in `public/models/`, and transparent 1600 × 1250 PNG posters are in `public/images/`. Rebuilding overwrites only v2 outputs.

The wheat is a fuller green grain-filling illustration with curved leaves, paired grains and fine awns. It does not represent a measured crop variety, observed crop stage or forecast. Roots, aggregates, crop density and smooth irregular horizons are illustrative. Root-zone approximate boundaries are 0.39, 1.13 and 2.02 m; they are not an inferred Punjab soil profile.

The groundwater scene uses a separate conceptual 0–20 m depth scale with a demo water table at 7 m. Its displayed roots have a deliberate scale break relative to deeper geology. Tiny blue pore/fracture markers remain within solid material. Neither scene models aquifer dynamics or derives groundwater depth from satellite moisture observations.

Blender uses Z up and the front cut face is at Y = −1.5. The web GLBs are exported Y up, with a 4 × 3 m horizontal extent. Root-zone and groundwater share the same camera and framing. Named meshes, exact bounds, triangle counts, checksums and file sizes are recorded in `validation-v2.json` after a complete generation run. The initial loading budget applies to one lazily loaded scene; the scenes do not need to load together.

Model review covers poster inspection and a real Three.js GLTFLoader render in headless Chromium. Browser measurements are single-scene load and draw-call observations, not claims about integrated-graphics or mobile frame rates. Static posters retain the essential section when WebGL is unavailable. Runtime explanatory HTML must still communicate scale, layer status and the distinction between measured inputs and illustrative geometry.

## Individual crop studies

`generate_crops.py` builds four representative category studies for the runtime: maize for grains, mungbean for pulses, tomato for vegetables, and citrus for fruit trees. Maize has broad ribbed leaves, a jointed stem, branching tassel, individual kernels, layered husks and silks. Mungbean has trifoliate leaflets, slender pods and yellow flowers. Tomato has compound leaflets, mixed red/green fruit and star calyxes. Citrus has woody branches, oval foliage and orange fruit. These are recognizable illustrative studies, not taxonomic or cultivar verification. A category representative does not depict the exact selected species. The botanical sources and parameter provenance used by the decision engine remain separate from this presentation geometry.

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --threads 6 --python assets/blender/generate_crops.py
node assets/blender/optimize_posters.mjs
```

Append `-- --only maize` to the Blender command to rebuild one crop, or a comma-separated list such as `-- --only tomato,citrus`. Earlier wheat, rice and sorghum studies remain editable and can be rebuilt with that option; they are not required for the four runtime categories. Standalone sources are `crop-{crop}.blend`, GLBs are in `public/models/crops/`, and PNG/WebP posters plus small WebP selector graphics are in `public/images/crops/`. All standalone plants use a normalized 1.5 m presentation height and a ground origin near zero. This uniform normalization must not be interpreted as the relative natural height of the species. `validation-crops.json` records each geometry's actual bounds, triangle count, byte sizes, checksum and browser draw calls.

`optimize_posters.mjs` uses the repository's existing Playwright development dependency and Chromium's WebP encoder. Soil runtime posters are at most 1200 px wide; crop runtime posters at most 640 px; selector thumbnails 128 px; quality is 0.82. PNGs remain the full render sources. The first generated crop poster is maize so it can be reviewed while the rest of the batch continues.
