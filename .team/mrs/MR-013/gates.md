# MR-013 gates

qa_commit: 01845f2

## Red (after QA)
- `npm test` (vitest run): exit 1 — 46 failed / 703 passed (749); 7 of 20 files.
- Planned red (missing module/export): parse.test.ts (cannot resolve src/lib/parse), purity `src/lib/parse.ts` checks (ENOENT), purity `src/ names` (api.ts, lookup.ts), layout mirror check for parse.test.ts, 41× `fromSpotifyOembed is not a function` (lookup, api, useConversion, share).
- QA commit touches only tests/ (testPaths OK).

## Green (round 1)
- impl commit: 008e9b6
- npm test: exit 0 — 20 files, 772 tests passed
- npm run lint: exit 0
- npm run typecheck: exit 0
- QA files unchanged since 01845f2 (diff touches only src/)
