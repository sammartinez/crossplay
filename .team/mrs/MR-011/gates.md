# MR-011 gates

qa_commit: e73ed44fcb75917869db636a867d20cb6eeb2c89

## Red (after QA)
- npm test → 131 failed, 397 passed (528). 127 lookup tests fail on the strict fetch mock's "unexpected fetch requests: https://api.song.link/..."; 4 purity tests fail because src still mentions odesli/song.link.
- QA commit touches only tests/ (adds strict fetch mock + afterEach check; deletes 7 odesli fixtures).

## Green (round 1)
- After 00a67a9: npm test 19 files / 528 passed; lint 0, typecheck 0, build 0. tests/ unchanged since e73ed44. No odesli/song.link in src, README or dist.
- Sr. N1: deleted non-Odesli-only tests and their replacements are listed in review-1.md N1.

## Green (second pass, round 2)
- QA fixed B1/N2 in 1a850dc (tests/support/network.ts + 3 headers). npm test 528 passed; lint 0, typecheck 0, build 0. diff.patch refreshed.
