# Public deployment

Published and anonymously verified on 2026-11-14:

**https://fieldshift-jt1.spacetime24.chatgpt.site**

The site is public to anyone with its URL. The GitHub source repository remains private and PR #1 remains unmerged. GitHub Pages has not been enabled or deployed; the existing manual Pages workflow remains available for future use.

## Hosting identity and reproducibility

- Sites project: `appgprj_6af89821fc248191a588f9257cd991be`.
- Saved version: 1 (`appgprj_6af89821fc248191a588f9257cd991be~appgver_b6f142913c448191b621f94fbcd40b27`).
- Successful deployment: `appgdep_6af898ca3a848191a6e0e236b45b2540`.
- Hosted source commit: `070ec3a8cfda8af9cc9ccfedfc881c12d069bf17` in the Sites source repository.
- Application source corresponds to GitHub commit `8fa18c6da2afcf4517e3a90b08d9ea223af71c89`, with the added hosting manifest and a root-path build.
- Hosting manifest: `.openai/hosting.json`; static directory `dist`.

For this host, build with `DEPLOY_BASE=/`. GitHub Pages builds continue to default to `/FieldShift/`; display branding is independent of either path. On PowerShell, set `$env:DEPLOY_BASE='/'` for the hosting build process, run the normal build, and remove that environment override afterward. The publication used a separate checkout under the ignored .cache directory, so the original local `/FieldShift/` preview was preserved.

Use the existing project ID for subsequent Sites updates. Obtain a fresh short-lived source credential through the Sites tools, push the exact source, package it with the Sites workflow helper, save a version and deploy that saved version. Do not commit credentials, deployment archives or private farm inputs. The archive is built from the exact pushed hosting source and is not the source repository itself.

## Live verification

The deployed origin returned HTTP 200 in an anonymous Chromium context, with no authentication redirect. The opening menu loaded, the genuine-data sample showed both alternatives under its stated demo assumptions, the 5400×2700 satellite basemap loaded, the overlay opacity changed to 25%, and the 390 px mobile layout had no document overflow. No page JavaScript errors were observed.

Saved farmer plans remain in each visitor's own browser. This deployment does not copy the owner's browser storage or share plans between visitors. Scientific and translation limitations in METHODS.md and VERIFICATION.md still apply.

## Experience publication
Sites version2 was successfully deployed and anonymously verified on14November2026. Version ID: appgprj_6af89821fc248191a588f9257cd991be~appgver_b7ed61bdfbb08191ae7569bdd1ecc385. Deployment ID: appgdep_6af8a8feaed08191b2f960ef93cebaf5. Hosted source:49d665f4fafdd740375fefc215cfbeabf47f42e2; GitHub application source:5758712d6eb31790751e8f70b45d2d8699fedfc9. That GitHub revision passed remote CI run43626894174.
Fresh anonymous browser checks returned HTTP200, loaded all four crop GLBs with HTTP200, opened the genuine sample, selected cached Lahore on the atlas, searched a natural-language water question, and verified390px mobile without document overflow. No page JavaScript errors were observed. See docs/design/redesign/live-check.json and live screenshots. Later quality-control fixes retain the same public URL. GitHub Pages remains undeployed and the private repository PR remains unmerged.

## Final crop-viewer release
Sites version3 deployed successfully at the same public HTTPS URL. Saved version:appgprj_6af89821fc248191a588f9257cd991be~appgver_ad6bc601dad481918468b73d2b635ecc. Deployment:appgdep_6af8aa602de48191b9239dd1f5707018. Hosted source:ef712a196ada2729e00c89d04dd45bcea86cd290. GitHub application source:71e28a251670cf407eb729f037a4a6d926516b64. A fresh anonymous browser received HTTP200, reopened a plant viewer twice, switched an active viewer to Static and observed no remaining canvas or page errors. Version2 screenshots remain representative of the unchanged composition.
