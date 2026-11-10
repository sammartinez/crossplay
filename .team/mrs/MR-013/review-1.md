---
mr: MR-013
round: 1
reviewer: sr-engineer
verdict: approved
blocking: 0
nits: 0
red_before_green: confirmed
---

## Summary
MR-013 meets AC1–AC4 for T1.

- **AC4:** `src/lib/parse.ts` contains `parseLink`, `spotifyParsedLink`, `canonicalSpotifyLink`, `isKind`, `parseSpotify` and `parseApple`, moved from `links.ts` with their bodies unchanged. It exports exactly the three functions. `links.ts` keeps only the link-building exports and re-exports nothing. Its constants import is down to what it still uses.
- **AC3:** `fromSpotifyFallback` is renamed `fromSpotifyOembed`. The body and the *why* comment are unchanged. `viaSource` is replaced by `viaApple`, and `lookupLink` now picks the branch and applies the single `.catch` itself, as the interface asked. Neither old name appears anywhere in `src/` or `tests/`. The only `fallback` words left in `src/` are `withSearchFallbacks` and the copy-fallback textarea, and the plan keeps both.
- **Tests:** gates.md shows red came from the planned missing module and missing export (parse.test.ts can't resolve the module; `fromSpotifyOembed is not a function`), not from broken setup. It shows green on test, lint and typecheck after 008e9b6, and the implementation commit touches only `src/`. QA's hunks change only imports, names and `describe` titles, plus the moved `parse.test.ts` and the planned `purity.test.ts` additions. No assertion changed.
- **Behavior note (`src/lib/api.ts:83-84`):** the `.catch` now also covers the Apple branch. Before, a throw from `fromItunesLookup` would have rejected `lookupLink`, which broke its documented never-rejects contract. The interface asked for this change, and it keeps behavior the same on every path the tests exercise.
- **Slop pass:** the ponytail-review pass found nothing to cut (pure move and rename). I found no slop.

## Comments
