---
mr: MR-006
round: 1
reviewer: principal
pass: second
verdict: approved
blocking: 0
nits: 3
red_before_green: confirmed
---

## Summary
The workflow is a good pattern to copy. It uses GitHub's two-job Pages layout. The gates run in order before the upload. Concurrency is serialized without cancelling a deploy already in progress, and the base path stays in `vite.config.ts` only. Gates show `src/deploy.test.ts` failing at 0481a61 (25 of 30) and passing now, with the file unchanged since then. I found no missed bugs. My notes are about where permissions are granted and where the Node version is defined, so the next workflow (for example, PLAN-002's) starts from a tighter base.

## Comments

### N1 · nit · [SEC] · .github/workflows/deploy.yml:8-11
`pages: write` and `id-token: write` are granted to the whole workflow. That means the `build` job gets them too, and `build` runs `npm ci` (dependency lifecycle scripts) and the full test suite. Any code in that job can mint an OIDC token and call the Pages API directly, which skips the `github-pages` environment that the `deploy` job runs in. Because this is the first workflow file, whatever goes here will be copied.
**Suggestion:** keep `contents: read` at the top level. Move `pages: write` and `id-token: write` under `jobs.deploy.permissions`. QA's regexes are line-anchored with `/m`, so they still pass with the permissions at job level.

### N2 · nit · [ARCH] · .github/workflows/deploy.yml:30, README.md:14
Node 22 is now written in two places: the workflow's `node-version: 22` and the README's "You need Node 22". `@types/node: ^22` implies it as well. T6 allowed `node-version-file`. The author skipped it only because no version file existed yet.
**Suggestion:** add a one-line `.nvmrc` (`22`), switch the workflow to `node-version-file: .nvmrc`, and point the README at that file. Each later Node bump is then a single edit. QA's test already accepts `node-version-file:`.

### N3 · nit · [S2] · .github/workflows/deploy.yml:37
`actions/configure-pages` is not in T6's interface, and nothing reads its output. The base path is hard-coded in `vite.config.ts`, so `base_path` goes unused. Keeping it as the starter boilerplate is defensible. Drop it if you want the workflow to contain only the steps it uses.
