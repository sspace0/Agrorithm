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
