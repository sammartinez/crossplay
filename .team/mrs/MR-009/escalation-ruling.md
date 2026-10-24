# MR-009 escalation ruling (Principal): AC3 hop-match rule

Blocker (QA, 417e822): the hop's main entity is the YouTube video whose artist is a channel name ("Placeholder Artist - Topic"), so comparing it rejects the correct song and breaks AC1.

## Decision: option (a)
For each platform the hop fills, compare the entity behind that link (`hop.linksByPlatform.<odesliKey>.entityUniqueId` → `hop.entitiesByUniqueId`) to `first`. Never the hop's main entity. No " - Topic" stripping. Titles-only rejected (marks a same-titled song by another artist EXACT).
- Link has no entityUniqueId / id not in entitiesByUniqueId / entity has no title → that platform not filled.
- `first` has no title → nothing filled.
- Artist compared only when both non-empty.

## Interface
- types.ts: `OdesliPlatformLink = { url: string; entityUniqueId?: string }`; export `OdesliEntity`.
- constants.ts: `ODESLI_PLATFORM_KEYS = { [PLATFORM_APPLE]: 'appleMusic', [PLATFORM_SPOTIFY]: 'spotify', [PLATFORM_YTM]: 'youtubeMusic' } as const`; `fromOdesli` reads its three links through it (output identical) [S17].
- text.ts: `sameText(a: string, b: string): boolean` — Unicode case-insensitive, punctuation removed, whitespace trimmed/collapsed.
- lookup.ts: `withHopLinks(first: Lookup, hop: OdesliResponse): Lookup` (raw hop body). For each PLATFORMS key missing in `first`, take `hop.linksByPlatform?.[ODESLI_PLATFORM_KEYS[key]]`, use its url only if its entity is the same song. Private `sameSong(first, entity?)`. No mutation. `odesliHopUrl` unchanged.
- api.ts: `withOdesliHop`: `.then((hop) => withHopLinks(first, hop)).catch(() => first)`.

## QA changes
- Fixtures, text.test.ts, api.test.ts tests: no change (move `ytmDirtWith` from api.test.ts to tests/support/fixtures with optional entity-id param; use in both files).
- lookup.test.ts withHopLinks: pass raw bodies instead of `fromOdesli(...)`; replace `sameSongHop` Lookup builder with an OdesliResponse builder; "different Apple/YTM links" case built from the mismatch fixture with `SPOTIFY_SONG::0PlaceholderDirtLive00` overridden to "Dirt"/"Placeholder Artist"; "no entity" test clears entitiesByUniqueId (rename "fills nothing when the link's entity is missing"); "no title" sets title undefined on the SPOTIFY_SONG entity.
- Add: (1) fills Spotify when the main entity artist is a "- Topic" channel but the Spotify link's entity matches; (2) fills nothing when the main entity matches but the Spotify link's entity is "Dirt (Live)".
