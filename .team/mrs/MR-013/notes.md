# MR-013 notes (PLAN-005 T1)

## What changed
`parseLink`, `spotifyParsedLink`, `canonicalSpotifyLink` and their private helpers (`isKind`, `parseSpotify`, `parseApple`) moved verbatim from `src/lib/links.ts` to the new `src/lib/parse.ts`; `links.ts` keeps only link-building and has no re-exports. `fromSpotifyFallback` is renamed `fromSpotifyOembed` (body and *why* comment unchanged) and now imports `spotifyParsedLink` from `./parse`. In `api.ts`, `viaSource` is gone: `viaApple` holds the old Apple branch, and `lookupLink` picks `viaApple`/`viaSpotify` by `parsed.src` and applies the single `.catch`. `useConversion.ts` imports `parseLink` from `../lib/parse`.

## Pattern being set
Each lib module has one job (`parse` reads the pasted link, `lookup` builds service URLs and maps responses, `links` builds the result's links, `api` does network and orchestration), and response mappers are named `from<Response>`. The rejected alternative was splitting by transport (one module per service/protocol), which would scatter parsing and mapping for the same link across files.

## For the reviewer
- The `.catch` now also wraps the Apple path. Behavior is unchanged in practice: `itunesOrNothing` already swallows network failure and `fromItunesLookup` is a pure mapper, so this only makes the never-rejects contract explicit for both branches, as the interface asked.
- No constants added or removed; `links.ts`'s constants import shrank to what it still uses.
- No source comment used "fallback"/"source path" in the Odesli sense, so none needed rewording.

## Gates
`npm test` 20 files / 772 tests pass; `npm run lint` clean; `npm run typecheck` clean.
