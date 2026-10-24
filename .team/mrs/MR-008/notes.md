# MR-008 notes

## What changed
Odesli is fetched up to twice (`fetchJson(url).catch(() => fetchJson(url))` in `viaOdesliOrSource`) before the source fallback. The Spotify fallback no longer takes the artist or Apple link from the top iTunes hit: `fromSpotifyFallback` returns a blank artist, only the Spotify link, and `candidates` deduplicated by artist (trimmed, case-insensitive, first appearance) via a module-private `firstPerArtist`. `withArtistChoice` replaces `withAppleAlt` and is built on `withSearchFallbacks` (exact links kept, candidate URL as the Apple link, everything else rebuilt as a search). `ResultCard` renders a "Which artist?" `role="group"` of `aria-pressed` buttons; the hook exposes `chooseArtist`, which `App` passes as `onChooseArtist`.

## Decisions
- Renamed `ALT_SEPARATOR` to `CANDIDATE_SEPARATOR` and replaced `WRONG_MATCH_LABEL` with `ARTIST_PICKER_LABEL`; no other references remained.
- Candidate `artist` is stored trimmed, so the display, the `aria-pressed` comparison and the `"title artist"` search query all use the clean name.
- In `withArtistChoice` the candidate's Apple URL is applied after the exact links are copied, so choosing a second candidate replaces the first one's (now exact) Apple link instead of keeping it.
- The picker group is labelled with `aria-labelledby` pointing at the visible label (`useId`), so the label text is not duplicated.
- Renamed the `.alts` CSS class to `.candidates` and added an `[aria-pressed="true"]` accent style.
- Candidate buttons are keyed by artist, which is unique after dedup.

## Unsure of
- Nothing blocking. The carried MR-007 nit (dead `.test.` filter in `tests/literals.test.ts`) was already removed in QA's commit 6de7dab.
