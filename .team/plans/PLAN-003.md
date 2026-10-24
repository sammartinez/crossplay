---
id: PLAN-003
title: Second Odesli hop for missing platforms; Spotify search that keeps its query
status: done
---

## Goal
When Odesli answers but leaves a platform out (the reported case: an Apple link for a new release with no Spotify link), ask Odesli once more using another platform's link from the same response, and use any exact links it finds. When Spotify is still a search, give the user a way to open the Spotify app with the query filled in, while the web search link keeps working on desktop and without the app.

## Key decisions
- **One extra Odesli request, not a loop.** It happens only after a successful Odesli response that lacks at least one of Apple Music, Spotify or YouTube Music. The hop URL is the first link present in the first response's `linksByPlatform`, in the order `youtubeMusic`, `youtube`, `deezer`, `tidal`, `amazonMusic`. `appleMusic` and `spotify` are never hop sources: one of them is always the input's own platform, and the other is the platform we're usually missing. The hop gets no retry. Worst case per lookup is three Odesli requests (first attempt, PLAN-002's retry, hop), well under the ~10/min limit for one lookup. Spotify is the requirement. Filling a missing Apple or YouTube Music link for a Spotify source comes along for free, because the trigger is "any of the three missing", so it is in scope (AC4).
- **The hop only adds links.** Links in the first response always win. Title, artist and art come from the first response. A link that came from the hop is tagged EXACT, because Odesli matched it.
- **If the hop fails, the result is what the first response gave.** A network error, a non-OK status or a response with nothing new gives the first response's result plus search links. It does not fall back to oEmbed or iTunes, because the first Odesli answer is better than those. This is a specific recovery, not a swallowed error ([S6]). It gets a one-line *why* comment.
- **Spotify search mechanism (Principal's pick; you can override before approval).** The Spotify row's main link stays the web URL `https://open.spotify.com/search/<query>`. It works on desktop and on phones without the app, and the copy button and share text keep using it, since a `spotify:` URI is useless to someone you share it with. When Spotify is a search, the row also shows a second link, **"Search in Spotify app"**, whose href is the app URI `spotify:search:<query>` (query `encodeURIComponent`-encoded, the same query the web link uses). Rejected alternatives:
  - (a) Making `spotify:search:` the main href. On a phone without Spotify, and on most desktops, it does nothing or shows an "invalid address" error, which breaks the "must still work without the app" requirement.
  - (b) Trying the app URI and then falling back to the web URL after a timer. iOS Safari shows an "invalid address" alert when the app is missing, and the timer guesses at whether the app opened.
  - (c) A different `open.spotify.com` URL shape that the app might honor. I don't know of one that is documented, and it can't be checked from here.

  The cost: on a phone with Spotify installed, tapping the main "Spotify" link still opens the app's empty Search tab, as today. The user has to tap "Search in Spotify app" to get the query. If you'd rather make the app URI the main link on phones, say so; that needs user-agent sniffing, which I'd avoid.
- **The fixture artist for "Dirt" is invented.** The report doesn't name the artist, and the live services can't be reached. QA uses the real Apple IDs from the report (`album 6811936164`, `i=6811936165`) and real Odesli response shapes, with a placeholder artist name and placeholder YouTube and Spotify IDs. A comment in each fixture says which values are placeholders.

## Acceptance criteria
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
  - **(amended after MR-009 review, user decision; rule settled by Principal escalation)** a link from the hop is used only when the song it points to is the same song as the first response's. For each platform the hop would fill, the entity behind that link (its `linksByPlatform.<platform>.entityUniqueId` in the hop's `entitiesByUniqueId`) must have a title equal to the first response's title, and — when both artists are non-empty — an artist equal to the first response's artist. The hop response's main entity is not used (for a YouTube source it's a video whose artist is a channel name, e.g. "X - Topic"). Comparison ignores case, punctuation and surrounding/repeated whitespace ("Ain't" = "Aint", "Dirt (Live)" ≠ "Dirt"). If that entity is missing, has no title, or doesn't match, the platform is not filled and stays a search, tagged SEARCH. Applies to AC4 too.
  - a malformed Odesli 200 body (e.g. `null`), first or hop, never makes `lookupLink` reject: a bad first body goes to the source fallback as before; a bad hop body gives the first lookup unchanged.
- AC4 (any missing platform): a Spotify-source lookup whose first Odesli response lacks `appleMusic` hops the same way. If the hop response has `appleMusic`, the Apple Music link is that URL, tagged EXACT.
- AC5 (when no hop happens): an Odesli response with all three platforms makes exactly one Odesli request, as today. The source fallback path (Odesli failed twice, then oEmbed or iTunes) never makes a hop request. Per lookup, Odesli is requested at most three times.
- AC6 (Spotify app search link): when the conversion's Spotify link is not exact, the Spotify row shows:
  - the existing link named "Spotify", whose href is still `https://open.spotify.com/search/<encodeURIComponent(query)>`, with the SEARCH tag and the Copy button;
  - a second link named "Search in Spotify app", whose href is `spotify:search:<encodeURIComponent(query)>`. `query` is the same `"title artist"` (or title alone) string the web search uses.

  When Spotify is exact, the second link is absent. The share text and the Copy button use the web URL, never the `spotify:` URI.
- AC7 (artist picker keeps it in sync): in the Spotify-source fallback, choosing an artist candidate (PLAN-002) can't change the Spotify link, because it stays exact. For a conversion whose Spotify link is a search, `withArtistChoice` rebuilds the app URI with the new query, just as it rebuilds the web search link.
- AC8 (honest output): no search link is ever tagged EXACT. A link is EXACT only when it came from an Odesli response (first or hop), from the source link itself, or from a user's artist choice.
- AC9 (unchanged paths): the Odesli retry, the oEmbed and iTunes fallbacks, the artist picker, short-link resolution, error messages and `?u=` handling behave as before.

## Out of scope
- More than one hop, or chaining hops until every platform is found.
- Retrying the hop request, or adding any delay or backoff.
- Taking title, artist or art from the hop response.
- Hops in the source fallback path (when Odesli is unreachable, the hop would be too).
- Platform or user-agent detection to choose between the app URI and the web URL.
- App-URI search links for Apple Music or YouTube Music.
- Spotify Web API search (it needs auth and a backend).
- Showing the new platforms (Deezer, Tidal, Amazon, YouTube) as result rows. They are only used as hop sources.

## Tasks

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

### T2 · "Search in Spotify app" link when Spotify is a search
- complexity: low
- sets_pattern: true
- assignee: engineer
- depends_on: []
- covers: [AC6, AC7, AC8]
- preview: ["/"]
- interface:
  - `src/lib/links.ts`:
    - `searchQuery(lookup: Pick<Lookup, 'title' | 'artist'>): string` is the `"title artist"` join that `withSearchFallbacks` does today, extracted. `withSearchFallbacks` uses it.
    - `spotifyAppSearchUri(query: string): string` returns `SPOTIFY_APP_SEARCH_URI + encodeURIComponent(query)`.
    - `withSearchFallbacks(lookup)` also sets `spotifyAppSearch` on the returned `Conversion`: `spotifyAppSearchUri(query)` when Spotify is not exact, `undefined` when it is. Always assign the key, so a value spread in from an older conversion by `withArtistChoice` is overwritten.
  - `src/lib/types.ts`: `Conversion` gains `spotifyAppSearch?: string`.
  - `src/components/ResultCard.tsx`: in the Spotify `<li>`, when `conversion.spotifyAppSearch` is set, it renders `<a href={spotifyAppSearch}>Search in Spotify app</a>` (no `target`; a custom scheme opens the app, not a tab). Props are unchanged. Copy and share keep using `links.spotify`.
- notes:
  - **Constants:** `SPOTIFY_APP_SEARCH_URI = 'spotify:search:'` and `SPOTIFY_APP_SEARCH_LABEL = 'Search in Spotify app'`. QA adds the label to `UI_TEXT` in `tests/literals.test.ts`. Any class name or other literal goes in constants too ([S14]).
  - **Pattern being set:** this is the first app-scheme deep link in the repo. Keep it as a field computed in `links.ts` next to the web search URL, not built in the component, so a later app link (if ever) copies the same shape. Explain that in two sentences in `notes.md`.
  - **Reuse ([S17]):** don't re-implement the query join in the component or in `share.ts`. Use `searchQuery`.
  - **QA:**
    - `tests/lib/links.test.ts` covers `searchQuery`, `spotifyAppSearchUri` (spaces, `/`, `&`, `?`, apostrophes) and `withSearchFallbacks`/`withArtistChoice` setting or clearing `spotifyAppSearch`.
    - `tests/components/ResultCard.test.tsx` covers the link's presence, href and absence.
    - `tests/lib/share.test.ts` asserts that the share text never contains `spotify:`.
    - `tests/App.test.tsx:268` takes the single link in each `<li>` (`within(li).getByRole('link')`). The Spotify row now has two links when it's a search, so that query must name the link. Update it, and keep what it covers.
  - **Merge order:** T1 and T2 are independent but both edit `src/constants.ts` and `src/lib/types.ts`. Run them one after the other, T1 first, to avoid trivial conflicts.
  - **Style:** the app link sits after the tag, as a small secondary link. Reuse existing `.ghost`/tag styling where possible. It must not wrap badly at phone width (check the preview at 375px).

## What the user must verify on a phone after deploy
1. **Before merge (30 seconds):** in iPhone Safari, type `spotify:search:Bohemian%20Rhapsody%20Queen` in the address bar. Spotify should open on Search with that query filled in. If the query is empty there too, the URI scheme doesn't carry the query on your iOS and Spotify version, and T2 needs a different mechanism. Tell me before T2 starts.
2. After deploy, open `https://<site>/crossplay/?u=https://music.apple.com/us/album/dirt/6811936164?i=6811936165`. The Spotify row should read EXACT, and tapping it should open "Dirt" in Spotify. If it still reads SEARCH, Odesli's YouTube Music match also lacks Spotify (an Odesli data gap, not our bug), and item 3 is the fallback.
3. For a search case (any song where the Spotify row reads SEARCH), check three things. Tapping "Search in Spotify app" opens the app with the query filled in. Tapping "Spotify" opens the web search, or the app's empty Search tab, which is a known limit. On a desktop browser, "Spotify" shows web search results.
4. Optional: on a phone without Spotify installed, "Spotify" still opens the web search. "Search in Spotify app" fails there, which is expected.
