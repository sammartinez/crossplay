---
mr: MR-008
round: 1
reviewer: principal
verdict: changes-requested
blocking: 1
nits: 1
red_before_green: not-confirmed
---

## Summary
The code meets AC4–AC8 as written. The retry is the planned one-liner in `viaOdesliOrSource`, and `fromSpotifyFallback` no longer sets an artist or Apple link from a search hit, so it passes S18. `withArtistChoice` reuses `withSearchFallbacks` as the plan asks (S17). Constants are in place (S14). Tests sit under `tests/` (S19). The screenshots match AC5 and AC7 in both themes. The one blocker is the process record: `gates.md` has no green run and `diff.patch` is missing.

## Comments

### B1 · blocking · [TEST] · .team/mrs/MR-008/gates.md:5-8
No "Green (round 1)" section and no `diff.patch`; red-before-green cannot be confirmed, nor that `tests/` is untouched.
**Suggestion:** add the Green section (452/452, lint/typecheck/build exit codes, `git diff --name-only 6de7dab HEAD -- tests/` empty) and generate `diff.patch`. If the numbers match, this approves with no code changes.

### N1 · nit · [ARCH] · src/lib/links.ts:91-97
`withArtistChoice` rebuilds the `Lookup` field by field (title, art, candidates); a field added to `Lookup` later would be silently dropped on a pick. `withSearchFallbacks({ ...conversion, artist: candidate.artist, links: { ...exactLinks, [PLATFORM_APPLE]: candidate.url } })` carries every field forward.
