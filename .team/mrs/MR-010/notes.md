# MR-010 notes

**What changed.** `links.ts` gains `searchQuery` (the `"title artist"` join, extracted from `withSearchFallbacks`) and `spotifyAppSearchUri`. `withSearchFallbacks` always sets `spotifyAppSearch` on the `Conversion`: the `spotify:search:` URI when Spotify is not exact, `undefined` when it is, so `withArtistChoice` rebuilds or clears it with no extra code. `ResultCard` renders it in the Spotify row after the tag as a plain `<a>` without `target`. Copy and share still use `links.spotify`.

**Pattern set (app-scheme deep link).** The app URI is computed in `links.ts` next to the web search URL and carried on the `Conversion`, so the component only renders what it is given and never builds a query. A later app link should add a field computed the same way in `withSearchFallbacks`, not build it in the UI.

**Decisions.**
- New constants: `SPOTIFY_APP_SEARCH_URI`, `SPOTIFY_APP_SEARCH_LABEL`, and `APP_LINK_CLASS` (`'app-link'`) for the new class name. Existing class names in `ResultCard` are still inline. I didn't touch them because that's out of scope.
- Styling: `li a` is `flex:1`, so the second link needed `li a.app-link{flex:none;...}`. Without it, both links would split the row. It is 12px, muted and `nowrap`. I didn't reuse `.ghost` because that's a button chrome, and the plan asks for a small secondary link.

**Unsure.** I couldn't check the preview at 375px because this container has no browser. By estimate, the row is about 55 (Spotify) + 45 (SEARCH) + 115 (app link) + 55 (Copy) + 30 (gaps) ≈ 300px, and a 375px viewport leaves 311px inside the card. It fits, but with little room to spare. The reviewer should confirm in the preview.


**Pattern guidance (Principal N1):** On a second app link, replace `spotifyAppSearch` with `appSearch: Partial<Record<Platform, string>>`, filled in `withSearchFallbacks`, and render `appSearch[key]` in the row. Don't add another per-platform field.
