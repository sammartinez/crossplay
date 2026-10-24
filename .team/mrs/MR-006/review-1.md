---
mr: MR-006
round: 1
reviewer: sr-engineer
verdict: approved
blocking: 0
nits: 1
red_before_green: confirmed
---

## Summary
The MR meets AC3 as T6 specifies it. `.github/workflows/deploy.yml` runs on push to `main` and on `workflow_dispatch`. It sets the three permissions and the `pages` concurrency group, and it runs `npm ci`, test, lint, typecheck and build before `upload-pages-artifact` (`path: dist`) and `deploy-pages`. `vite.config.ts` has `base: '/crossplay/'`, and gates.md records that the built asset URLs start with `/crossplay/`. The README says Source = GitHub Actions. Its Development section matches the `package.json` scripts: `vitest run`, `eslint .`, `tsc --noEmit`, `vite build`, and the dev server on port 5173 with strictPort under `/crossplay/`. Gates show QA's `src/deploy.test.ts` failing at 0481a61 (25 of 30) and passing now, with the file unchanged since then. I found nothing blocking. One existing README sentence slightly misdescribes the fallback path.

## Comments

### N1 · nit · [AC9] · README.md:38
This line is not part of the diff. It says "if Odesli fails, the page uses Spotify oEmbed and the iTunes Search API", but `src/lib/api.ts:80-86` sends Apple links to the iTunes **Lookup** API (`itunesLookupUrl`). Only Spotify links go through oEmbed and then iTunes Search. Since this MR is the README update, a clause like "Apple links use the iTunes Lookup API; Spotify links use Spotify oEmbed and the iTunes Search API" would make it accurate. Optional.
