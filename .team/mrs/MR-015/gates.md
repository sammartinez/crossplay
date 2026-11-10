# MR-015 gates

qa_commit: 6892b3e (last of QA's commits e2b1c6d..6892b3e; coverage map in its body)

## Red (after QA)
- None by design (test-only refactor; plan Key decisions). Suite green: 760/760.
- QA commits touch only tests/ (testPaths OK). Lines 5,391 → 5,111 (−5.2%); it sites 511 → 476. AC7 floor lowered to ~5% by the user.

## Green (round 1)
- npm test: exit 0 — 20 files, 760 tests; lint exit 0; typecheck exit 0

## Green (round 2)
- QA fix commit: eba1dbe (tests/ only)
- npm test: exit 0 — 760 tests; lint exit 0; typecheck exit 0
- Lines 5,111 → 5,109
