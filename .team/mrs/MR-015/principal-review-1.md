---
mr: MR-015
round: 1
reviewer: principal
pass: second
verdict: approved
blocking: 0
nits: 3
red_before_green: not-confirmed
---

## Summary
MR-015 is approved. The shared test-support surface matches what T3 asked for: `tests/support/cases.ts` holds literal data and the four `mock*Case` setups built on `mockFetchOnly` + `mockJsonp` + `fixture`, with nothing imported from `src/constants.ts`. `network.ts` lost the `mockFetch` forwarder and the Odesli comment, and the `ClipboardOutcome` comment moved to its type. This is the pattern to copy: a test file names a case and gets its data and its network setup from one module. The first pass missed no bugs. My three nits are about how this module will grow. `red_before_green` is not-confirmed only because T3 has no red state by design. Gates are green at eba1dbe: 760 tests pass, lint and typecheck exit 0, and only `tests/` changed.

## Comments

### N1 · nit · [ARCH] · tests/support/cases.ts:139-146, tests/lib/api.test.ts:249
`mockSpotifyCase`'s `itunes` parameter is `JsonpOutcome | ((src) => JsonpOutcome)` and branches on `typeof`; its siblings take a plain `JsonpOutcome`. Give it a single type, or move all four helpers to one options object once any needs a third option.

### N2 · nit · [ARCH] · tests/lib/api.test.ts:54-77, tests/App.test.tsx:50-62, tests/lib/lookup.test.ts:27-28,409-420
Spotify-track and Apple-track result data (title, thumb, candidates, Apple art/searches) is still kept per file. AC6's list is met; a follow-up should add `SPOTIFY_TRACK_TITLE`/`_THUMB`/`_CANDIDATES` and Apple-track equivalents to `cases.ts`.

### N3 · nit · [TEST] · tests/lib/api.test.ts:173, tests/lib/share.test.ts:9
The Apple-track whole-result `toEqual` and `share.test.ts`'s `links.apple` write out the Apple track link; `APPLE_TRACK.link` would match the other cases.
