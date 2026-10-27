# MR-011 notes (engineer)

**What changed.** Deleted Odesli end to end: `viaOdesliOrSource`, `withOdesliHop` and the retry in `api.ts` (`lookupLink` now calls `viaSource` directly); `odesliUrl`, `odesliEntity`, `fromOdesli`, `odesliHopUrl`, `sameSong`, `withHopLinks` in `lookup.ts`; the four Odesli types in `types.ts`; the six `ODESLI_*` constants in `constants.ts`. Imports that only served Odesli (`PLATFORMS` and `sameText` in `lookup.ts`) were dropped. README "How it works" rewritten into two bullets: Lookup (iTunes for Apple; oEmbed then iTunes title search for Spotify) and Tags (EXACT / SEARCH, artist picker).

**Decisions.** `sameText` stays in `src/lib/text.ts` unused by `src/` for now, as the plan asks (T2 re-imports it). README does not mention LIKELY; T2 adds that sentence.

**Unsure.** Nothing open. Prettier `--check` reports 19 pre-existing files, so it isn't the repo's enforced formatter; I didn't reformat.
