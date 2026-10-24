# MR-010 gates

qa_commit: 0997a1e48d0c58d8845a02bb3d94bb0eb7033a6c

## Red (after QA)
- npm test → 22 failed, 570 passed. links.test.ts 14 (searchQuery/spotifyAppSearchUri missing, spotifyAppSearch undefined), ResultCard.test.tsx 6 (no "Search in Spotify app" link), constants.test.ts 1, literals.test.ts 1 (constants not exported).
- QA commit touches only tests/.
- The spotify:search: deep link cannot be verified on a device here; user to check after deploy (plan "What the user must verify").

## Green (round 1)
- After 3923185: npm test 19 files / 592 passed; lint 0, typecheck 0, build 0. `git diff --name-only 0997a1e HEAD -- tests/` → empty.
- Screens at 375px (author couldn't check phone width): Apple "Dirt" link, Odesli first response from fixture; hop 429 → screens/spotify-search-{light,dark}.png; hop = odesli-ytm-dirt.json → screens/spotify-exact-{light,dark}.png. Spotify row fits at 375px.

## Green (round 2, after Sr. nit)
- After 50b7f64: npm test 592 passed; lint 0, typecheck 0, build 0. tests/ unchanged since 0997a1e. Screens re-captured at 375px; Spotify row still on one line.
