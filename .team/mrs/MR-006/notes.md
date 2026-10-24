# MR-006 notes

Added `.github/workflows/deploy.yml` (push to `main` + `workflow_dispatch`; `contents: read`, `pages: write`, `id-token: write`; concurrency group `pages`) and rewrote the README deploy section for Pages Source = GitHub Actions, plus a new Development section. iPhone, Share Sheet shortcut and How it works sections are unchanged.

Decisions:
- Two jobs, `build` and `deploy`, the layout GitHub's Pages starter uses: `deploy` runs in the `github-pages` environment and publishes the deployment URL. The gates (`npm ci`, test, lint, typecheck, build) run in `build` before `upload-pages-artifact` with `path: dist`.
- Action versions are the latest major tags, checked with `git ls-remote` on 2026-10-24: checkout@v7, setup-node@v7, configure-pages@v6, upload-pages-artifact@v5, deploy-pages@v5.
- `node-version: 22` rather than `node-version-file`, because the repo has no `.nvmrc` and `package.json` has no `engines` field. `cancel-in-progress: false` so a deploy that is already running isn't cut off.
- I verified the built `dist/index.html` asset URLs start with `/crossplay/` by running the build locally.

Unsure: the workflow hasn't run on GitHub yet. Its first real run happens after merge to `main`, once Pages Source is set to GitHub Actions.
