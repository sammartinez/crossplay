# MR-008 gates

qa_commit: 6de7dab1e18be6b629035504291c423d763e9c7e

## Red (after QA)
- `npm test` → exit 1. 7 files / 64 tests fail, 388 pass (452). Failures: missing "Which artist?" group (16), `withArtistChoice is not a function` (8), `chooseArtist is not a function` (8), and assertions on old behavior (artist 'Samuel Cody Matson' vs '', candidates undefined, Apple top-hit link vs title search, Odesli called once, missing ARTIST_PICKER_LABEL).
- QA commit touches only `tests/`.
- Live services (Odesli, Spotify, iTunes) unreachable from this environment; reported case covered with fixtures shaped like real responses.

## Green (round 1)
- npm test: 19 files, 452 tests passed. lint 0, typecheck 0, build 0.
- `git diff --name-only 6de7dab HEAD -- tests/` → empty (QA files untouched); implementation touched src/ only.
- Screens: dev server with Odesli→429, oEmbed/iTunes served from QA's reported-case fixtures (art stubbed): screens/fallback-{light,dark}.png, screens/picked-{light,dark}.png.
- Note: the review-1 request found this section and diff.patch missing; the orchestrator's shell died before writing them (pkill -f matched its own command). Recorded now; code unchanged.

## Green (round 2)
- After 2c290f2 (N1): npm test 19 files / 452 passed; lint 0, typecheck 0, build 0. `git diff --name-only 6de7dab HEAD -- tests/` → empty. diff.patch refreshed.
