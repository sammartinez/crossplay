---
mr: MR-012
round: 1
reviewer: principal
pass: second
verdict: changes-requested
blocking: 1
nits: 3
red_before_green: confirmed
---

## Summary
The LIKELY pattern is the one to copy: the mapper (`fromSpotifyFallback`) decides it as data; `withSearchFallbacks` alone derives mutually exclusive per-platform flags; the view only reads them; tag text/classes are constants. Red 168 → 742 green, tests/ unchanged. One blocker: Sr.'s N2 upgraded. Sr.'s N1 (overflow) and N3 (contrast) → one follow-up task.

## Comments

### B1 · blocking · [BUG] · src/constants.ts:77, 82
Dash-form `FEAT_CREDIT_SUFFIX` runs to the end of the title, so "Song - feat. X - Live" / "- Remix" / "- Acoustic" clean to "Song" and auto-pick the studio take, breaking the user decision in PLAN-004 Key decisions (version markers are kept). "Only LIKELY" was accepted by name for "(with X)" only. This is the template future noise patterns will copy.
**Suggestion:** a dash-only credit piece stopping at the next spaced dash, e.g. `DASH_FEAT_CREDIT_SUFFIX = String.raw\`(feat\.?|ft\.?|featuring)\s+(?:(?!\s[-–—]\s)[^()[\]])+\``, used in the dash-form regex; bracket form unchanged. QA first (red then green): add "Song - feat. X - Live" and "Song - feat. X - Remix" to DOES_NOT_MATCH_SONG; "Song - feat. X - Remastered 2011" to MATCHES_SONG.

### N1 · nit · [ARCH] · src/lib/types.ts:29, 35; src/lib/links.ts:101-104
`likely` is a partial hint on `Lookup` and full derived flags on `Conversion`; rebuild paths must clear it. Fine for one rebuild path; if a second path or fourth state appears, switch to `match: 'exact' | 'likely' | 'search'`. No change now.

### N2 · nit · [UI] · src/styles.css:16, 40, 44 (unchanged here)
Sr.'s N1 → follow-up task (S13 to fix here). Matters: share-sheet use on iPhone + long suffixed titles → common horizontal scroll. Fix: `minmax(0,1fr)` columns on `main` and `.card` (or `min-width:0` on `.card`/`.track`), re-shoot at 375px.

### N3 · nit · [UI] · src/styles.css:51-52, 38
Sr.'s N3 → same follow-up. `.tag.likely`, `.tag.exact` and `.msg.err` all fail AA in the light palette; fix all three together.
