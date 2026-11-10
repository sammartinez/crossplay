---
mr: MR-015
round: 1
reviewer: sr-engineer
verdict: changes-requested
blocking: 1
nits: 5
red_before_green: not-confirmed
---

## Summary
There is one blocking finding. The MR meets AC1, AC2, AC6 and AC7 as amended. I checked the coverage map in 6892b3e's body against the diff, one deletion at a time. All 40 deleted `it`s are listed (api 25, lookup 10, useConversion 4, App 1), and each has a surviving test. The api and lookup survivors are whole-object `toEqual`s on the same fixtures and assert at least as much as the tests they replace. The useConversion and App survivors run on different inputs (a hand-built conversion and `SPOTIFY_SOURCE`), but the plan's cut list names those deletions explicitly, so I am not raising them. There is no red state by design (PLAN-005 Key decisions, T3), so `red_before_green` reads not-confirmed without counting against the MR. Gates are green: 760 tests, lint and typecheck. Only `tests/` changed. The blocking finding is that the new shared `mockSpotifyCase` copies the iTunes-search answerer that `useConversion.test.ts` still defines and uses.

## Comments

### B1 · blocking · [S17] · tests/hooks/useConversion.test.ts:47-51, tests/support/cases.ts:136-138
`itunesSearch` in useConversion.test.ts and the JSONP answerer inside `mockSpotifyCase` are the same logic: `fixture(src.includes('entity=album') ? 'itunes-search-albums.json' : 'itunes-search-songs.json')`. The comment added on top of `itunesSearch` ("as in mockSpotifyCase") admits the copy. `itunesSearch` is still used by `deferOembed` (useConversion.test.ts:233), so the two copies can drift. This MR exists to define each piece of shared test data in one place.
**Suggestion:** export the answerer from `tests/support/cases.ts` with a domain name (e.g. `answerItunesSearchByEntity`). Have `mockSpotifyCase` and `deferOembed` both use it, and delete `itunesSearch` and its comment from useConversion.test.ts.

### N1 · nit · [AC3] · tests/lib/purity.test.ts:42-47
`fromSpotifyFallback` and `viaSource` still appear under `tests/`, in the absence check that T1's plan required. Read literally, AC3 forbids them "anywhere in `src/` or `tests/`". This MR didn't change these lines, and the check is the plan's own requirement, so this is a conflict inside the plan, not a defect in T3. Hiding the strings (for example, building the regex in pieces) would be worse. I'd ask the user to amend AC3 to exempt this check, as it already exempts the Odesli checks.

### N2 · nit · [TEST] · tests/lib/api.test.ts:250-251
"treat a failed iTunes JSONP load as no results" writes out `mockFetchOnly` + `mockJsonp` by hand. Every other Spotify-track test uses `mockSpotifyCase`. The cause is the interface's `mockSpotifyCase(link?, oembed?)`, which has no iTunes parameter, while `mockAppleCase` and `mockReportedCase` both take one. That's acceptable as is. If B1's change touches `mockSpotifyCase` anyway, adding an optional iTunes answer would remove this one-off.

### N3 · nit · [TEST] · tests/lib/api.test.ts:51, tests/hooks/useConversion.test.ts:384
`NOTHING_LIKELY = { apple: false, spotify: false, ytm: false }` is now defined in two files. It could go into `cases.ts` next to the other shared literals, or stay inline.

### N4 · nit · [TEST] · tests/lib/links.test.ts:1891-1893
`const SPOTIFY_LINK = REPORTED.link`, `ART = REPORTED_THUMB` and `CANDIDATES = REPORTED_CANDIDATES` only rename the imports. Using the imported names directly removes three lines.

### N5 · nit · [AC6] · tests/components/ConvertForm.test.tsx:8, tests/lib/share.test.ts:10
Both still write out the Spotify track link `https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv`. AC6's grep doesn't cover this ID, and these files aren't the four the plan names, so this isn't blocking. `SPOTIFY_TRACK.link` would finish the job. The expected share-text literal at share.test.ts:19 should stay written out.
