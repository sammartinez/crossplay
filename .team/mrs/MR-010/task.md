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

## Acceptance criteria covered
- AC6 (Spotify app search link): when the conversion's Spotify link is not exact, the Spotify row shows:
  - the existing link named "Spotify", whose href is still `https://open.spotify.com/search/<encodeURIComponent(query)>`, with the SEARCH tag and the Copy button;
  - a second link named "Search in Spotify app", whose href is `spotify:search:<encodeURIComponent(query)>`. `query` is the same `"title artist"` (or title alone) string the web search uses.

  When Spotify is exact, the second link is absent. The share text and the Copy button use the web URL, never the `spotify:` URI.
- AC7 (artist picker keeps it in sync): in the Spotify-source fallback, choosing an artist candidate (PLAN-002) can't change the Spotify link, because it stays exact. For a conversion whose Spotify link is a search, `withArtistChoice` rebuilds the app URI with the new query, just as it rebuilds the web search link.
- AC8 (honest output): no search link is ever tagged EXACT. A link is EXACT only when it came from an Odesli response (first or hop), from the source link itself, or from a user's artist choice.
