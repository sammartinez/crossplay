### T1 · Remove Odesli; lookups go straight to oEmbed/iTunes
- complexity: medium
- sets_pattern: false
- assignee: engineer
- depends_on: []
- covers: [AC1, AC2, AC3, AC4, AC9, AC10]
- interface:
  - `src/lib/api.ts`: `lookupLink(parsed): Promise<{ conversion: Conversion | null; parsed: ParsedLink }>` keeps its signature and its never-rejects contract.
    - Its body calls what is `viaSource` today directly. `viaOdesliOrSource`, `withOdesliHop` and the Odesli retry are deleted.
    - `jsonp` and `fetchJson` stay as they are; `fetchJson` is still used for oEmbed.
  - `src/lib/lookup.ts`: delete `odesliUrl`, `odesliEntity`, `fromOdesli`, `odesliHopUrl`, `sameSong` and `withHopLinks`. Every other export keeps its signature and behavior. Drop the `sameText` import (T2 re-imports it).
  - `src/lib/types.ts`: delete `OdesliEntity`, `OdesliPlatformLink`, `OdesliPlatform` and `OdesliResponse`, and the `ODESLI_*` type imports.
  - `src/constants.ts`: delete `ODESLI_API_URL`, `ODESLI_COUNTRY`, `ODESLI_COUNTRY_PARAM`, `ODESLI_URL_PARAM`, `ODESLI_PLATFORM_KEYS` and `ODESLI_HOP_PLATFORMS`, with their comments.
  - `README.md`: rewrite the two "How it works" bullets (lines 37–38) for AC10. This is T1's copy change; T2 adds one sentence for LIKELY.
- notes:
  - **Pure deletion.** Add no new behavior, and no "service unavailable" message. Don't rename `viaSource` or `itunesOrNothing` beyond what the deletion needs. Keep the existing *why* comments on `itunesOrNothing` and `lookupLink`.
  - **Constants:** none added. If an edit leaves a constant unused, delete it ([S9]).
  - **Reuse:** `sameText` and `tests/lib/text.test.ts` stay untouched (see Key decisions).
  - **QA:**
    - Delete `tests/support/fixtures/odesli-*.json` (6 files) and the Odesli helpers in `tests/support/fixtures.ts` (`odesliWithout`, `odesliEntityWith`, `ytmDirtWith` and their types).
    - Delete tests that only cover Odesli: `lookupLink Odesli hop`, the `Odesli retry` block, and the `odesliUrl`/`fromOdesli`/`odesliHopUrl`/`withHopLinks` cases in `tests/lib/lookup.test.ts`.
    - Rewrite tests that reached the source path through "Odesli fails" so they run with no Odesli mock. Keep their assertions on results and on `fetchedUrls`/JSONP loads, now without the Odesli calls. This covers `api.test.ts` "Apple links / Spotify links / Spotify short links / the reported Spotify link when Odesli …", and the `useConversion`, `App` and `ResultCard` tests built on `odesli-track.json`.
    - Tests that only checked the Odesli happy path (all three EXACT) become Apple-source or Spotify-source cases, because no lookup yields three EXACT links any more.
    - Make `mockFetch` in each rewritten test fail on any URL it doesn't expect, so an Odesli request would fail the test (AC1).
    - Add the AC1 source-text check to `tests/lib/purity.test.ts`. It already reads `src/lib` files. Extend it to every file under `src/`, or add a sibling test there; keep it in that file.
  - **Risk:** the size of the test rewrite. Coverage of every remaining degraded path must survive (TDD rule 7). QA lists any deleted test that wasn't Odesli-only in the commit body.

## Acceptance criteria covered
- AC1 (no Odesli): no lookup of any kind requests `api.song.link` or any other Odesli URL. In `src/`, `README.md` and `tests/`, no Odesli constant, type, function, fixture or fixture helper remains: `ODESLI_*`, `OdesliResponse`, `OdesliEntity`, `odesliUrl`, `fromOdesli`, `odesliHopUrl`, `withHopLinks`, `sameSong`, `odesli-*.json`, `odesliWithout`, `odesliEntityWith`, `ytmDirtWith`. `sameText` and its tests remain. A source-text test asserts that `src/` contains neither `song.link` nor `odesli` (case-insensitive).
- AC2 (Apple link): for an Apple track or album link, the only network activity is one iTunes lookup JSONP (`itunesLookupUrl(parsed)`), with no `fetch`. The result is as today's Apple-source fallback:
  - title, artist and art come from the lookup; Apple is the input link, tagged EXACT;
  - Spotify and YouTube Music are searches for `"title artist"`, tagged SEARCH;
  - the "Search in Spotify app" link is shown.
  
  When iTunes fails or returns no results, the title comes from the URL slug and the artist is blank, as today.
- AC3 (Spotify link, reported ambiguous case): for `https://open.spotify.com/track/1yQDTSOyfVTCt9XWKQcnXb`, with `spotify-oembed-aint-gettin-high.json` and `itunes-search-aint-gettin-high.json`:
  - the requests, in order, are exactly one `fetch` of `spotifyOembedUrl(<link>)`, then one iTunes search JSONP for the title;
  - the title is "Ain't Gettin' High", the art is the oEmbed thumbnail, and the artist is blank;
  - Apple is the Apple Music search for the title, tagged SEARCH. Spotify is the canonical link, tagged EXACT. YouTube Music is a search, tagged SEARCH;
  - the picker shows Samuel Cody Matson, The Neon Prairie Dogs and Zach Bryan, with no button pressed.
  
  Both Matson and the Neon Prairie Dogs have an exact-title result, so nothing is auto-picked.
- AC4 (Spotify degraded paths, unchanged):
  - oEmbed rejects or returns non-OK: `NOT_FOUND_MESSAGE`, after exactly one request;
  - an unresolvable short link: `SHORT_LINK_MESSAGE`, as today;
  - an iTunes JSONP error or timeout, or zero results: the AC3 result with no candidates and no picker.
  
  No request is ever retried.
- AC9 (unchanged paths): short-link resolution, `?u=` handling, the error messages, "Search in Spotify app" (shown exactly when Spotify is not EXACT), Copy buttons and theme behave as before.
- AC10 (copy): the README's "How it works" section describes the oEmbed/iTunes lookup, the SEARCH and LIKELY tags and the artist picker, and doesn't mention Odesli or song.link. No user-facing string in `src/` mentions song.link.
