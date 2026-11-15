# Public deployment

Both public hosts were observed without a login on15November2026:

- GitHubPages: https://sspace0.github.io/Agrorithm/
- Sites: https://fieldshift-jt1.spacetime24.chatgpt.site/

The owner explicitly authorized making sspace0/Agrorithm public. The source remains on feat/fieldshift-pilot with PR1 open and unmerged. main has not been merged automatically.

## Reviewed core release

The first Pages release serves the dedicated gh-pages branch at its root, with .nojekyll. Its artifact commit is dbec0b5aeb590f770dc2a9740bb94711ddf4a5c0; application source is cb5f9ff0012ba4b27af227e0372e8fd3e0968c12. GitHub's Pages settings reported successful publication through run43715309759 in the github-pages environment. An anonymous browser received HTTP200, loaded the opening, entered the complete sample and observed both alternatives passing the demo screens with no JavaScript errors.

Sites version5 deployed successfully: appgprj_6af89821fc248191a588f9257cd991be~appgver_f5597b402fc081918de4feb987703dfa. Deployment: appgdep_6af9a6c98f0081918b7637d85b395ab2. Exact hosted source:36f756dfce036bcdb792c08e4baba324c7194efa. Anonymous opening and About/logo checks returned HTTP200 without JavaScript errors. Later release records are appended below after publication.

## Reproduction and updates

Display branding is separate from deployment. deployment.config.json defaults to /Agrorithm/ after the repository rename. DEPLOY_BASE overrides it for builds; Sites uses /. Runtime data, fonts, models, workers and service-worker scope derive from Vite's base. Hash routes support direct entry and refresh.

For the current Pages branch deployment, build the reviewed source with DEPLOY_BASE=/Agrorithm/, copy only dist into an artifact tree, add .nojekyll and release.json identifying the exact source revision, then advance gh-pages without force. Publishing an artifact does not merge the review PR. Each update to the selected artifact branch publishes it. Development-source pushes do not publish.

The source also includes a manually dispatched official-actions workflow in .github/workflows/pages.yml, with scoped permissions, concurrency and github-pages environment. After that workflow is available on the default branch through an authorized review/merge, an owner can select GitHubActions as the Pages source and deliberately dispatch publish=true. It derives DEPLOY_BASE from the repository slug. The present branch-based release does not claim to have dispatched that workflow.

Sites project identity remains appgprj_6af89821fc248191a588f9257cd991be. Its existing hosting checkout contains .openai/hosting.json with static directory dist. The source workflow helper builds, commits/pushes and packages the exact source before a version is saved and deployed. Short-lived source credentials are kept in process memory. Archives and credentials are excluded from Git.

A previous installed service worker can display an older cached document during an update. A fresh query such as ?revision=6 opens the new document while the browser updates its versioned cache. A first successful online installation is required for offline use. Saved farm data stays in the visitor's browser and is not published with either host.

## Final immersive release — observed15November2026

Published application source:2da45713dca26ac69e90afd2f959ad1410a747e9. GitHubPages artifact:1c470549a1cc3af3bf717a187b08d85d1b7f14b8. Pages workflow43721324709 completed successfully. Source CI43721081546 completed successfully, including all40browser tests.

Sites version6:appgprj_6af89821fc248191a588f9257cd991be~appgver_f264d64ab74481918621cb3b22d750b0. Successful deployment:appgdep_6af9b9a57bc08191a4669895dfbffb89. Exact hosted source:b5372ebb86ad0f1b963d4e6aeb5d9008ef1871f6.

Fresh anonymous browsers verified both public hosts with HTTP200, the edge-to-edge intro with navigation/chat hidden, working historical helper, complete sample, corrected official challenge URL and the exact6,029,336-byte groundwater GLB. The390pxPages layout had no horizontal overflow. Neither host produced a page JavaScript error. Evidence:docs/design/agrorithm/final/live-release.json and actual screenshots. Use ?revision=6 if an older installed cache is still visible.

## Final reviewed update — 16 November 2026, Pakistan time

GitHub Pages successfully published artifact **10c929df9718d725a3bc9f312138a7c0791bbd64**, built from application source **1a5f81ce90e09f578c4d084933694ce0195be5e4**. Pages run **43754570244** succeeded. Source push CI **43754218921**, PR CI **43754226153**, and preparation run **43754218928** all succeeded. The preparation run verified all 30 trained-model parts, then completed install, type checking, lint, **94 unit tests**, production build and **52 browser tests** before staging the artifact. This particular artifact push was followed by GitHub's successful dynamic Pages build; an additional authenticated trigger was unnecessary. Always check the actual Pages run and live release record rather than inferring publication from a push.

Anonymous verification of the canonical URL returned the exact source revision in `release.json`, a working **Our Project** opening action, the project introduction, visible button shadows, no horizontal overflow and no JavaScript errors. The initial full-screen opening hid navigation and the chat launcher; the launcher appeared after leaving the intro. Public screenshots are under `docs/design/agrorithm/our-project-pages-live-*`.

The final Pages browser also loaded the optional trained reader and generated the verified **259.09 mm** historical precipitation reading under the `/Agrorithm/` subpath. Observed cold model loading was **14.95 seconds**, with **1.35 seconds** generation on the development computer. The actual WASM URL, tokenizer bytes/hash, explicit consent, greeting, scientific subscript, 390-pixel accepted view and intentionally failed-download fallback were checked. These are headless development-computer observations, not physical-phone performance or general model accuracy. Evidence: `docs/design/agrorithm/helper-results/live-pages-v10/`.

Sites version **10** also deployed successfully. Hosted source: **e0abde38b32cf8db6c5b3e3b0c80a7c2c8c34c7c**. Saved version: **appgprj_6af89821fc248191a588f9257cd991be~appgver_1c98e4d6b964819199a1ad4c1e620c2b**. Deployment: **appgdep_6afa0c7e4a4881919d5494be07dc12f7**. Both hosts contain the same application refinements; their Git identities differ because the hosting source repository is separate.

Share **https://sspace0.github.io/Agrorithm/**. For an installed older cache, **https://sspace0.github.io/Agrorithm/?revision=10** requests a fresh document while the versioned worker updates. The alternative host is **https://fieldshift-jt1.spacetime24.chatgpt.site/**. Neither public site depends on a local preview server remaining open. Source PR #1 stays open and unmerged.

## Conversational greeting correction

A reported message, “Hey there! How are you?”, exposed a narrow greeting pattern that accepted the shorter “Hi, how are you?” but rejected an ordinary variation. Whole-message conversational matching now handles greeting/check-in combinations, punctuation, curly apostrophes and thanks. A greeting followed by a substantive question still reaches the source guide or evidence limits.

Application source **cd3b37f9f8a9214aad013d0655e89131ef6c4aff** passed **107 unit tests** and **52 browser tests** in preparation run **43755606007**. Source push CI **43755606018**, PR CI **43755614952**, and Pages deployment **43756050816** succeeded. The browser suite exercises the reported greeting at desktop/phone sizes before continuing through irrigation and historical follow-ups.

Sites version **11** deployed successfully from hosted source **d44085de07fd18713c4f333ad5e826fd3e5ce712**, deployment **appgdep_6afa100a68588191b8da3cb3910c86fc**. Fresh anonymous desktop/phone checks also exercised “Hi there how are you”, a curly-apostrophe check-in, thanks and a mixed greeting/irrigation question, with no overflow or page errors. Screenshots and observations are under `docs/design/agrorithm/greeting-fix/`. Use **https://sspace0.github.io/Agrorithm/?revision=11** for the corrected Pages build. Existing conversation messages remain a record of their original responses; submit a new message after reloading the updated application.

Pages artifact **eeb25504bfd6c06dc29309c049f28c1263ef7442** was then checked anonymously at **1440 and 390 pixels**. Both exact reported phrases (“Hey there! How are you?” and “Hi there how are you”), a curly-apostrophe greeting, thanks, the mixed irrigation question and the following historical question passed. No optional model/WASM download, horizontal overflow or JavaScript errors occurred. Actual screenshots and separate results for the additional exact phrase are retained under `docs/design/agrorithm/helper-results/live-greeting-fix/`. All local development servers and every test browser/context were closed after verification.
