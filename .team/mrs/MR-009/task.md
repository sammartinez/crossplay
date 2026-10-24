### T1 · One Odesli hop to fill missing platform links
- complexity: medium
- sets_pattern: false
- assignee: engineer
- depends_on: []
- covers: [AC1, AC2, AC3, AC4, AC5, AC8, AC9]
- interface:
  - `src/lib/types.ts`: `OdesliResponse.linksByPlatform` also lists optional `youtube`, `deezer`, `tidal` and `amazonMusic` (`OdesliPlatformLink`).
  - `src/lib/lookup.ts`, all pure:
    - `odesliHopUrl(body: OdesliResponse): string | null` returns `odesliUrl(<first hop-source link>)` when `fromOdesli(body).links` lacks any `PLATFORMS` key and a hop-source link exists, and `null` otherwise.
    - `withHopLinks(first: Lookup, hop: Lookup): Lookup` returns `first` with each platform link that is missing in `first` taken from `hop`. Every other field comes from `first`. It does not mutate either input.
  - `src/lib/api.ts`: `lookupLink(parsed)` keeps its signature. In `viaOdesliOrSource`, after a successful Odesli body, if `odesliHopUrl(body)` is non-null, fetch it once with `fetchJson`, map it with `fromOdesli`, and merge with `withHopLinks`. A failed hop gives the first lookup unchanged and never reaches `viaSource`.
- notes:
  - **Constants** (`src/constants.ts`): `ODESLI_HOP_PLATFORMS = ['youtubeMusic', 'youtube', 'deezer', 'tidal', 'amazonMusic'] as const`, with a one-line *why* comment (Odesli matches some sources better than others; never `appleMusic`/`spotify`). Type the `OdesliResponse` keys from it if that's clean. Any other literal goes in the constants file too ([S14]).
  - **Reuse ([S17]):** use `fetchJson`, `odesliUrl`, `fromOdesli` and `PLATFORMS` as they are. Don't add a second Odesli mapper. Don't touch the `.catch(() => fetchJson(url))` retry: the hop goes after it and outside the `try` that sends failures to `viaSource`.
  - **Fixtures (QA):** add `tests/support/fixtures/odesli-apple-dirt.json` and `odesli-ytm-dirt.json`, shaped like `odesli-track.json`.
    - In the Apple one, `entityUniqueId` is `ITUNES_SONG::6811936165`. `entitiesByUniqueId` has that entity and a `YOUTUBE_VIDEO::<id>` entity. `linksByPlatform` has `appleMusic` (a `geo.music.apple.com` URL with the tracking params), `itunes`, `youtube` and `youtubeMusic`, and no `spotify`.
    - In the YTM one, `entityUniqueId` is `YOUTUBE_VIDEO::<id>`, and `linksByPlatform` has `youtube`, `youtubeMusic`, `spotify` (with `nativeAppUriDesktop`) and `appleMusic`.
    - Add a third variant for AC3 whose hop response has different Apple and YTM URLs and a different title.
    - For AC4, a Spotify-source fixture with no `appleMusic` and with `youtubeMusic`.
  - **Tests (QA):** `tests/lib/lookup.test.ts` covers `odesliHopUrl` and `withHopLinks`. `tests/lib/api.test.ts` covers AC1 to AC5 with `fetchedUrls` order assertions. Add an `tests/App.test.tsx` case for AC1 through the UI (Spotify row EXACT, href is the fixture's Spotify URL). Existing tests using `odesli-track.json` and `odesli-partial.json` must still pass unchanged. That's the check that the hop doesn't fire when it shouldn't.
  - **Risk:** `purity.test.ts` holds `lookup.ts` to no network calls and no inline URLs. The hop *decision* lives in `lookup.ts` and the *fetch* in `api.ts`.

## Acceptance criteria covered
- AC1 (reported case): for input `https://music.apple.com/us/album/dirt/6811936164?i=6811936165`, Odesli's first response (`odesli-apple-dirt.json`) has the Apple entity "Dirt" and `linksByPlatform` with `appleMusic`, `itunes`, `youtube` and `youtubeMusic`, but no `spotify`. The second response, for the YouTube Music URL (`odesli-ytm-dirt.json`), has `spotify`. Then:
  - exactly two requests are made, both to Odesli: `odesliUrl(<apple link>)`, then `odesliUrl(<the first response's youtubeMusic url>)`. No oEmbed or iTunes request is made;
  - the Spotify link is the second response's `linksByPlatform.spotify.url`, tagged EXACT;
  - the Apple Music and YouTube Music links are the first response's, tagged EXACT;
  - title, artist and art are the first response's entity values ("Dirt", the fixture artist, its thumbnail);
  - no "Search in Spotify app" link is shown.
- AC2 (hop source choice): the hop uses the first link present in the first response's `linksByPlatform`, in the order `youtubeMusic`, `youtube`, `deezer`, `tidal`, `amazonMusic`. When none of these is present, no hop is made, and the result is the first response plus search links, after exactly one Odesli request (`odesli-partial.json` keeps that behavior).
- AC3 (hop degraded paths), all for the reported first response:
  - the hop request rejects (`TypeError('Failed to fetch')`) or returns `429`: no further request of any kind. The result is the first response's links with Spotify as a search, tagged SEARCH;
  - the hop response has no `spotify` link: same result as above;
  - the hop response has a different `appleMusic` or `youtubeMusic` URL, title or artist than the first: the first response's values are kept. The hop only fills platforms the first response lacked.
- AC4 (any missing platform): a Spotify-source lookup whose first Odesli response lacks `appleMusic` hops the same way. If the hop response has `appleMusic`, the Apple Music link is that URL, tagged EXACT.
- AC5 (when no hop happens): an Odesli response with all three platforms makes exactly one Odesli request, as today. The source fallback path (Odesli failed twice, then oEmbed or iTunes) never makes a hop request. Per lookup, Odesli is requested at most three times.
- AC8 (honest output): no search link is ever tagged EXACT. A link is EXACT only when it came from an Odesli response (first or hop), from the source link itself, or from a user's artist choice.
- AC9 (unchanged paths): the Odesli retry, the oEmbed and iTunes fallbacks, the artist picker, short-link resolution, error messages and `?u=` handling behave as before.

## Amendment (after review round 1, user-approved)
AC3 now also requires: hop links are used only when the hop entity matches the first (title equal; artist equal when both non-empty; case-insensitive, punctuation and extra whitespace ignored). Mismatch or missing hop entity → hop fills nothing. Malformed 200 bodies (first or hop) never make `lookupLink` reject. QA updates the mismatch tests and adds regression tests for malformed bodies; the author implements. Put the normalizing comparison in `src/lib/text.ts` (shared, next to `titleCase`).

## Escalation ruling (Principal) — see escalation-ruling.md
Interface changes: `withHopLinks(first: Lookup, hop: OdesliResponse): Lookup` (raw hop body); `OdesliPlatformLink = { url: string; entityUniqueId?: string }`; export `OdesliEntity`; `ODESLI_PLATFORM_KEYS` in constants (fromOdesli reads its links through it); `sameText(a, b)` in src/lib/text.ts; private `sameSong(first, entity?)` in lookup.ts; api.ts `withOdesliHop` uses `.then((hop) => withHopLinks(first, hop)).catch(() => first)`.
