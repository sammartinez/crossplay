---
mr: MR-002
round: 1
reviewer: principal
pass: second
verdict: approved
blocking: 0
nits: 3
red_before_green: confirmed
---

## Summary
I approve this MR. The pattern it sets for T3–T5 is a good one to copy. The `src/lib/` modules are pure and depend on each other in one direction only: types ← constants, and lookup → links/text. Every module takes parsed or typed input and returns new objects. The short-link resolver returns a new `ParsedLink` where the old script used `Object.assign` to mutate `p`. That fits T3's `lookupLink` contract, which returns `{ conversion, parsed }`, and it gives `api.ts` a thin shape to follow: build URL → fetch/JSONP → map. `Platform` and `Kind` are derived from the constants, as `Theme` was in MR-001. gates.md confirms red-before-green: QA's commit a5a7a56 failed on the missing modules, and rounds 1 and 2 are green with QA's files unchanged. I re-checked the code against `.team/reference-original-index.html` (lines 119–191 and 255) and found no missed correctness bugs. The three notes below are about the pattern only, and none of them blocks.

## Comments

### N1 · nit · [ARCH] · src/constants.ts:47-48, src/lib/lookup.ts:46, 82
`URL_PARAM` merges two unrelated wire protocols into one constant just because both happen to name the parameter `url`. This is DRY applied to matching text rather than shared knowledge. If Odesli or oEmbed ever renames the parameter, the change has to touch both. It also clashes with the file's own convention: `ITUNES_ENTITY_ALBUM`, `KIND_ALBUM` and `APPLE_ALBUM_SEGMENT` are kept separate even though they share a value. T3 will add `JSONP_CALLBACK_PREFIX` and a `callback` parameter, so settle the convention now: prefix each parameter name with its API (`ODESLI_URL_PARAM`, `OEMBED_URL_PARAM`).

### N2 · nit · [ARCH] · src/lib/links.ts:34, src/lib/lookup.ts:89
`{ src: PLATFORM_SPOTIFY, kind, id, link: canonicalSpotifyLink(kind, id) }` is written out in full in `parseSpotify` and again in `resolveSpotifyShortLink`. The plan only asked for `canonicalSpotifyLink` to be reused, and the code does that. But T3's short-link message decision (`src === 'spotify' && !kind`) relies on both places producing the same shape. A `spotifyParsedLink(kind, id): ParsedLink` exported from `links.ts` would define a resolved Spotify link once.

### N3 · nit · [ARCH] · src/lib/types.ts:54, 63
`ItunesResult.artistName: string` and `SpotifyOembed.title: string` are required in the type, but they come from untyped external JSON, and an oEmbed error body has no `title`. The plan chose TypeScript to catch mistakes in exactly these response shapes. Typing the fields as required hides the AC9 "no title → null" path from the type checker when T3 passes the parsed body through. Make both optional. The mappers already handle `undefined`: `|| ''` for the artist, and `Lookup.title` is already optional.
