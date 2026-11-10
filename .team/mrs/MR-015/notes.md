# MR-015 engineer notes (verification only)

Scope: QA made every change (e2b1c6d..6892b3e on team/PLAN-005 = 8b979f7). I made no
commits and edited no files outside this note. `git diff team/PLAN-005...HEAD` touches
only `tests/`; `src/`, `package.json`, `package-lock.json` and `tests/support/fixtures/`
are unchanged.

## Coverage map vs diff

Method: listed every removed and added `it(` line per file in the diff and matched them
against the map in 6892b3e's body, then read each survivor's assertions.

- Deleted `it`s in the diff: 40 (api 25, lookup 10, useConversion 4, App 1). The map lists
  exactly these 40. No deleted test is missing from the map. Parse, share, links,
  ResultCard and support changes delete no `it` (ResultCard has 2 renames, as the map says).
- "fetches the oEmbed once, then makes one iTunes search over JSONP for the title, in that
  order" (api, reported) shows as removed and re-added: it was moved, with the
  `reportedCase` body inlined. Its assertions are unchanged.
- Added `it`s: 5, the whole-result survivors in api.test.ts. 511 - 40 + 5 = 476, as stated.
- Lines: 5,391 -> 5,111 (recounted). The user lowered AC7's floor to this figure.

Survivors, checked field by field:

- **api, Apple track** (8 deleted): the survivor `toEqual`s `{ parsed, conversion }` with the
  title, artist, art, all three links, exact, likely and `spotifyAppSearch`, all as literals.
  Same input: `mockAppleCase()` defaults to `itunes-lookup-song.json`. The old
  "offer no candidates" checked `candidates ?? []` equals `[]`. The survivor has no
  `candidates` key, so it now fails if `candidates` is `[]`. That narrows what passes and
  loses no coverage.
- **api, Spotify track** (3 deleted): `SPOTIFY_TRACK_CONVERSION` includes artist `''` and
  nothing likely (the old "Queen and The Petersens" test) and the whole result (the old
  `withSearchFallbacks(fromSpotifyOembed(...))` comparison); `parsed` is in the `toEqual`.
  Same fixtures.
- **api, unique match** (5 deleted): title, artist, Marlow's URL as the Apple link,
  exact/likely for all three, the YTM "title artist" search and the Spotify link are all in
  the survivor. Same fixtures (`mockUniqueCase`).
- **api, short link** (2 deleted): the survivor checks `parsed` is `SPOTIFY_TRACK`, and its
  conversion carries `links.spotify = SPOTIFY_TRACK.link` with `exact.spotify = true`.
  Same input.
- **api, reported** (7 deleted): every deleted field is in the survivor. Same fixtures.
- **api, kept tests that changed setup**: `mockSpotifyCase` answers album searches with
  the albums fixture and other searches with the songs fixture. So the short-link album
  test still gets `itunes-search-albums.json`. The reported oEmbed-fails test now uses
  `mockSpotifyCase(REPORTED.link, failsToFetch)`. Its iTunes default changes, but it makes
  no iTunes request, so its result is the same.
- **lookup** (10 deleted): both `toEqual` survivors were already in the file before this MR.
  The reported one has links `{ spotify }` only (no Apple link) and no `likely` key,
  so the old `likely` toBeUndefined and the old links toEqual checks are both covered. The
  unique one pins `MARLOW_MATCH_URL` exactly, which covers the hostname and no-`&uo=` checks.
- **useConversion** (4 deleted): the task names these as restating `withArtistChoice`. The
  links.test.ts survivors exist and assert the same rule (the YTM rebuild with NEON, the
  candidates kept in order, the switch on a second choice, a new object with no mutation).
  They run on the reported conversion built by hand with `withSearchFallbacks`, with the same
  title, art, link and candidates, not on the hook's lookup output. The hook test switched
  NEON -> ZACH. The links survivor switches NEON -> MATSON, and App.test.tsx also covers
  NEON -> MATSON through the hook. That is the same rule on a different second candidate.
  This is within the task's explicit cut list, so it is not a finding.
- **App "Wrong Apple match?"** (1 deleted): ResultCard's copy exists and renders
  `SPOTIFY_SOURCE` (blank artist, exact Spotify, candidates), the same shape the reported
  link produces. The task names this deletion explicitly.

Result: every deleted test has a real survivor. No blocking finding.

## AC3 (grep)

- `FALLBACK` constant: gone. Spotify-path "fallback" titles: gone. The "fallback" left in
  tests/ refers to `withSearchFallbacks`, the copy fallback textarea, `FALLBACK_LABEL`, or the
  network.ts comment about code that swallows a rejection. None means the Spotify path.
- Odesli: only `tests/deploy.test.ts` and `tests/lib/purity.test.ts`, as allowed.
- `fromSpotifyFallback` / `viaSource`: not in `src/`. They appear in tests/ only in
  `tests/lib/purity.test.ts:45,47`, the check that asserts they are absent from src/. That
  check was added by MR-013 (T1), not this MR. A literal reading of AC3 ("anywhere in
  ... tests/") would flag it. AC3 grants no explicit exception for it the way it does for
  Odesli. I'm noting it for the reviewer and leaving it unchanged (not a T3 test, and I
  must not edit tests).

## AC6 (grep, excluding fixtures/)

Each of `1yQDTSOyfVTCt9XWKQcnXb`, `3kVr8XqPz2LmNw7TyB5hJd`, `'Couldn’t find that one.` and
`'That link isn’t` appears only in `tests/support/cases.ts`. The four `mock*Case` helpers
are in cases.ts and are used by App.test.tsx, api.test.ts and useConversion.test.ts.
cases.ts imports nothing from `src/constants.ts`. No `() => jsonResponse(` is left in
tests/.

## Gates (HEAD 6892b3e)

- `npm test`: exit 0, 760/760.
- `npm run lint`: exit 0.
- `npm run typecheck`: exit 0.
