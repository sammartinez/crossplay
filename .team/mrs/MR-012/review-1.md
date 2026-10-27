---
mr: MR-012
round: 1
reviewer: sr-engineer
verdict: approved
blocking: 0
nits: 3
red_before_green: confirmed
---

## Summary
Meets AC3, AC5–AC8, AC10, AC11; carried N2 (blank oEmbed title → NOT_FOUND, no iTunes request), N3 (shared answerJson), N4 (README) landed. Red 168 at ad0b4df → 742 green after 20adc80/31c3dec; tests/ unchanged. S18 holds: LIKELY only from `fromSpotifyFallback`'s unique-match branch; `withSearchFallbacks` keeps EXACT/LIKELY exclusive and never tags a search; `withArtistChoice` clears `likely`. The 448px screenshots come from a pre-existing layout bug exposed by the long title (N1). Spaces-around-dash choice is sound.

## Comments

### N1 · nit · [UI] · src/styles.css:16, 40, 44 (not changed in this MR)
`main` is `display:grid` with an implicit `auto` column; `.card` and `.track` keep `min-width:auto`; `.title` is `nowrap`, so the column grows to the full title width and ellipsis never applies. 16+1+16+56+12+330+16+1 = 448px, matching the screenshot. Pre-existing (any title wider than ~240px at 375px). Fix: `grid-template-columns:minmax(0,1fr)` on `main` and `.card` (or `min-width:0` on `.card`/`.track`), re-shoot likely-*.

### N2 · nit · [BUG] · src/constants.ts:77
Dash-form `FEAT_CREDIT_SUFFIX` runs `[^()[\]]+` to the end, so "Song - feat. X - Live" cleans to "Song" and matches the studio take, against the plan's "Live is kept" decision. Only ever LIKELY. Fix: stop at the next spaced dash, e.g. `(feat\.?|ft\.?|featuring)\s+(?:(?!\s[-–—]\s)[^()[\]])+`; QA adds "Song - feat. X - Live" to the non-match table.

### N3 · nit · [UI] · src/styles.css:52
`.tag.likely` `--accent` on white is ~3.3:1 for 11px text (below 4.5:1); `.tag.exact` ~4.4:1. Dark mode fine. Optional light-palette tag token alongside N1.
