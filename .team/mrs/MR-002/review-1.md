---
mr: MR-002
round: 1
reviewer: sr-engineer
verdict: changes-requested
blocking: 1
nits: 1
red_before_green: confirmed
---

## Summary
The diff meets AC5–AC8. I checked it line by line against `.team/reference-original-index.html` (`parse`, `search`, `viaOdesli`, `viaApple`, `viaSpotify`, `titleCase`, share head). Mapping, fallbacks, URL rewriting and `&uo=` stripping match the old script. The modules are pure and the QA files are intact. Red-before-green is confirmed in gates.md: QA's run failed on missing modules, all 114 pass now, and the QA files are unchanged since a5a7a56. One blocking issue: the request query-parameter names in `lookup.ts` are inline literals, although this MR already treats a URL param name as a constant (`APPLE_SONG_PARAM = 'i'`).

Parity note, not blocking: building request URLs with `URLSearchParams` encodes spaces in the iTunes `term` as `+`, where the old script sent `%20`. iTunes documents `+` for spaces and Odesli `url` values contain no spaces, so I accept the author's reasoning. Nothing in this MR exercises the live endpoints, so the T3 tests should cover it.

## Comments

### B1 · blocking · [S14] · src/lib/lookup.ts:39, 58-62, 75, 86-91
The query-parameter names `userCountry`, `url`, `id`, `entity`, `country`, `term` and `limit` are written inline as object keys passed to `withParams`. They are wire-protocol keys, and the type system doesn't check them, so a typo silently breaks a lookup. The same MR already treats the Apple `i` param name as a constant (`APPLE_SONG_PARAM`), so the current split is inconsistent.
**Suggestion:** add the param names to `src/constants.ts` (e.g. `ODESLI_COUNTRY_PARAM`, `URL_PARAM`, `ITUNES_ID_PARAM`, `ITUNES_ENTITY_PARAM`, `ITUNES_COUNTRY_PARAM`, `ITUNES_TERM_PARAM`, `ITUNES_LIMIT_PARAM`) and build the param objects with computed keys (`{ [ITUNES_TERM_PARAM]: title, ... }`).

### N1 · nit · [BUG] · src/lib/lookup.ts:99
`title: r.trackName || r.collectionName || ''` departs from the reference, which leaves the title `undefined`. In the old UI the alt button then read "undefined · Artist"; with this change it reads " · Artist". The plan treats current oddities as the spec. The state is practically unreachable, and the author points it out in notes.md, so this is not blocking. Either keep it and note it in the T4 alternates work, or match the old behavior if `AppleAlt.title` can be made optional without spreading `undefined` checks.
