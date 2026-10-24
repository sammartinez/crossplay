# MR-003 notes

`src/lib/api.ts` adds `jsonp` (script tag + window callback, 8 s timeout, cleanup on every path) and `lookupLink`, which tries Odesli, then falls back by source exactly as the reference script did. `src/hooks/useConversion.ts` holds the conversion state with `useState` and a ref for the run ID and the in-flight link; `chooseAlt` delegates to a pure `withAppleAlt` in `links.ts`. A first commit applies the Principal's MR-002 pattern notes: `URL_PARAM` split into `ODESLI_URL_PARAM` / `OEMBED_URL_PARAM`, `spotifyParsedLink(kind, id)` shared by `parseLink` and the short-link resolver, `ItunesResult.artistName` and `SpotifyOembed.title` made optional, and `withParams` moved to `src/lib/url.ts` so the hook reuses it for `?u=`.

Decisions:
- JSONP callback names are `cp<counter>` rather than the reference's random suffix: unique per page, a valid identifier, and no magic radix literals. The param constant is `ITUNES_CALLBACK_PARAM`, since iTunes is the only JSONP API.
- `fetchJson` checks `response.ok` for oEmbed too (the reference didn't). The visible outcome is the same; a failed oEmbed now skips a pointless iTunes search.
- A failed iTunes JSONP becomes `null` (AC9's "treated as no results"), and a failed oEmbed fetch becomes a null conversion, as in the reference. These are the only catches.
- Busy keeps the previous conversion in state (the reference left the old card visible while looking up); error clears it (the reference hid the card).
- As in the reference, invalid input while a lookup runs shows the error (`isError`) but leaves `status` busy and does not cancel the lookup; its result still lands (fixed in round 1, B1).
- `history.replaceState` is not wrapped in try/catch (the reference swallowed errors there). It runs after `setState`, so the UI still updates if it throws.
- Amended AC10 in PLAN-001 to name `conversion`, `isError` and `chooseAlt`, matching the T3 interface and QA's tests.

Unsure: `oembed.title ?? ''` sends an empty iTunes term when oEmbed has no title. The result is a null conversion either way, as with the reference's `"undefined"` term.
