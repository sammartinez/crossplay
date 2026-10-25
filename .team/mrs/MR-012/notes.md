# MR-012 notes (engineer)

## What changed
`cleanTitle`/`sameTitle` in `src/lib/text.ts` strip the AC11 noise suffixes (`TITLE_NOISE_RES` in constants, built from named pieces: remaster, feat credit, "with" credit, same-mix) and compare through `sameText`. `fromSpotifyFallback` now keeps each artist's first `sameTitle`-matching result in `firstPerArtist` (falling back to its first result), and when exactly one candidate matches it returns that artist, its Apple URL and `likely: { apple: true }`. `withSearchFallbacks` derives `exact`/`likely` per platform; `withArtistChoice` clears `likely` before rebuilding, so a click is EXACT. `ResultCard` renders EXACT/LIKELY/SEARCH via constants; `.tag.likely` uses `--accent`. N2: `viaSpotify` returns `{ lookup: null, parsed: resolved }` on a blank/whitespace oEmbed title, before any iTunes request. N4: README Tags bullet now covers LIKELY and what picking an artist does.

## Pattern being set (LIKELY)
LIKELY is the first confidence level between EXACT and SEARCH: the mapper (`fromSpotifyFallback`) decides it and records it as data on `Lookup.likely`, and `withSearchFallbacks` is the single place that turns it into the per-platform `exact`/`likely` flags, so the two can never disagree. The rejected alternative was a single `match: 'exact' | 'likely' | 'search'` field replacing `exact`; it was rejected for now because it would rewrite every existing `exact` test for no behavior change.

## Decisions a reviewer should know
- Dash-form suffixes require whitespace around the dash (`\s+[-–—]\s+`), so hyphenated words such as "Re-recorded" are never split. The plan's sketch used `\s*`; all AC11 examples pass either way.
- Feat credits in the dash form run to the end of the title (`[^()[\]]+`), so "Song - feat. X - Live" would lose the "- Live" too. Not in AC11; noted as a known edge, result is only ever LIKELY.
- The N2 early return keeps `parsed: resolved` (as the old blank-title path did) rather than the unresolved short link.
- Two commits: the N2 fix alone, then the LIKELY feature.

## Unsure / not done
- I did not run the 375px visual check in a browser. LIKELY has the same length as SEARCH (6 chars, same mono font), so the row width is unchanged; `--accent` is defined in both palettes and is already used for readable text (`.msg.err`, pressed candidate buttons).
