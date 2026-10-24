# MR-002 notes

## What changed
Added `src/lib/types.ts`, `links.ts`, `share.ts`, `text.ts` and `lookup.ts`, porting parsing, search fallbacks, share text and the Odesli/iTunes/oEmbed mapping from the old inline script (`66101cb:index.html`). Every literal is in `src/constants.ts`. All functions are pure. The fetch/JSONP side is left for `api.ts` in a later task.

## Decisions
- **Platform/kind constants follow the MR-001 theme pattern.** `PLATFORM_*` and `KIND_*` are constants, and `Platform`, `Kind` and `ParsedLink['src']` are derived from them (`Platform` comes from `PLATFORMS`), so the key list is written once.
- **`SHARE_LABELS` was not added.** The share labels are exactly the `PLATFORMS` display names, in the same order, so `shareText` reuses `PLATFORMS`. A separate constant would duplicate them [S17].
- **Constants beyond the plan's list.** These were needed for S14: `KIND_*`, `PLATFORM_*`, `SPOTIFY_OEMBED_URL`, `APPLE_SONG_SEGMENT`, `APPLE_ALBUM_SEGMENT`, `SLUG_SEPARATOR_RE`, `ITUNES_ENTITY_SONG`, `ITUNES_ENTITY_ALBUM`, `WORD_SEPARATOR`, `WORD_START_RE`, `LINE_BREAK`, `SHARE_LABEL_SEPARATOR` and `PATH_SEPARATOR`.
- **The album-vs-song choice is written once,** as `itunesEntity()` in `lookup.ts`. The lookup URL and the search URL both use it. `resolveSpotifyShortLink` reuses `canonicalSpotifyLink`.
- **Request URLs are built with `URLSearchParams`, not string concatenation.** The params, their order and the decoded values match the old script. One difference: `URLSearchParams` encodes a space as `+`, where `encodeURIComponent` gave `%20`. iTunes and Odesli decode both the same way. `searchUrl` keeps `encodeURIComponent`, because those are user-facing URLs and the tests check their exact text.
- **The Apple track link is rebuilt with the `URL` API** (origin + pathname, then `searchParams.set('i', ...)`). For real numeric ids it gives the same string as the old template.

## Unsure
- `itunesLookupUrl(p: ParsedLink)` uses `String(p.id)`, because `id` is optional on `ParsedLink`. Apple links from `parseLink` always have an id. This matches the old template's coercion and adds no defensive branch.
- In `ItunesResult`, `artistName` is typed as required, because iTunes always returns it. Alternate titles fall back to `''` when neither `trackName` nor `collectionName` is present. The old script would have left them `undefined`.
