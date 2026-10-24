---
mr: MR-010
round: 1
reviewer: principal
pass: second
verdict: approved
blocking: 0
nits: 1
red_before_green: confirmed
---

## Summary
Pattern approved: the app URI is built in links.ts from the same `searchQuery` as the web link and lives on `Conversion`; `withSearchFallbacks` always sets it, so `withArtistChoice` rebuilds or clears it for free; the component only renders it; Copy/share use the web URL. Red 22 at 0997a1e → 592 green at 50b7f64, tests/ unchanged. 375px row fits in both themes; link gone when exact. Nothing missed — no stale `spotifyAppSearch` can survive in `useConversion`.

## Comments

### N1 · nit · [ARCH] · .team/mrs/MR-010/notes.md:5, src/lib/types.ts:36, src/components/ResultCard.tsx:45
notes.md says "a later app link should add a field", which would grow per-platform fields and `key ===` branches. Change the note to: "On a second app link, replace `spotifyAppSearch` with `appSearch: Partial<Record<Platform, string>>`, filled in `withSearchFallbacks`, and render `appSearch[key]` in the row. Don't add another per-platform field."
