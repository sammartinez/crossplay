---
mr: MR-015
round: 1
responder: qa
commit: eba1dbe
---

## Summary
All comments are handled in one commit, eba1dbe, except N1, which is left for the user. No test was added or deleted and no assertion changed. The suite still runs 760 tests. `npm test`, `npm run lint` and `npm run typecheck` all pass. Only files under `tests/` changed. Lines (.ts/.tsx under `tests/`, fixtures excluded): 5,111 → 5,109.

## Comments

### B1 · fixed
`tests/support/cases.ts` now exports `answerItunesSearchByEntity(src)`. It answers an album search with the albums fixture and anything else with the songs fixture. `mockSpotifyCase` uses it as its default iTunes answer, and `deferOembed` in `useConversion.test.ts` uses it too. The local `itunesSearch` and its "as in mockSpotifyCase" comment are gone.

### N1 · left as is
This is a plan question for the user, as the reviewer says. The `fromSpotifyFallback`/`viaSource` absence check in `tests/lib/purity.test.ts` is unchanged. Proposed fix: amend AC3 to exempt this check, the same way it already exempts the Odesli checks.

### N2 · fixed
`mockSpotifyCase` takes an optional third argument, `itunes`: a `JsonpOutcome`, or a function from the script URL to one. It defaults to `answerItunesSearchByEntity`. In `api.test.ts`, "treat a failed iTunes JSONP load as no results" now calls `mockSpotifyCase(SPOTIFY_TRACK.link, undefined, 'error')`. The test's input and assertions are the same.

### N3 · fixed
`NOTHING_LIKELY` is defined once in `tests/support/cases.ts`. `api.test.ts` and `useConversion.test.ts` import it.

### N4 · fixed
`links.test.ts` no longer has the `SPOTIFY_LINK`, `ART` and `CANDIDATES` aliases. The tests use `REPORTED.link`, `REPORTED_THUMB` and `REPORTED_CANDIDATES` directly.

### N5 · fixed
`ConvertForm.test.tsx` and the `links` object in `share.test.ts` use `SPOTIFY_TRACK.link`. The expected share text in `share.test.ts` is still written out in full.
