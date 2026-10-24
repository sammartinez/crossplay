### T6 · GitHub Pages build-and-deploy workflow and README
- complexity: low
- sets_pattern: true
- assignee: engineer
- depends_on: [T1]
- covers: [AC3]
- interface:
  - `.github/workflows/deploy.yml`:
    - triggers: every push to `main`, plus manual dispatch (`workflow_dispatch`);
    - permissions: `pages: write`, `id-token: write`, `contents: read`;
    - concurrency group `pages`;
    - steps: `actions/setup-node` with `node-version-file` or `22` and npm cache; `npm ci`; test; lint; typecheck; `npm run build`; `actions/upload-pages-artifact` with `path: dist`; `actions/deploy-pages`.
  - README:
    - Replace "upload everything to the root" with the Actions-based deploy steps (Settings → Pages → Source: GitHub Actions).
    - Add a Development section covering `npm install`, `npm run dev`, `npm test`, `npm run lint` and `npm run typecheck`.
    - Keep the iPhone, Shortcut and How-it-works sections. Update the URLs only if they change; they do not, since the base is `/crossplay/`.
- notes:
  - This is the first CI file in the repo, hence `sets_pattern`.
  - QA can check the workflow with a Node test that reads the file as text and asserts the trigger, the gate steps and `path: dist` (adding a YAML parser dependency is not justified), and can check the `base` by building and asserting that `dist/index.html` asset URLs start with `/crossplay/`.

## Acceptance criteria covered

- AC3 (Pages deploy):
  - `vite.config.ts` sets `base: '/crossplay/'`.
  - `.github/workflows/deploy.yml` runs on every push to `main` and on manual dispatch (`workflow_dispatch`). It runs `npm ci`, then test, lint, typecheck and build, and deploys `dist/` with `actions/upload-pages-artifact` and `actions/deploy-pages`.
  - Built asset URLs in `dist/index.html` all start with `/crossplay/`.
  - The README deploy section says Pages **Source = GitHub Actions** and includes the dev and test commands.
