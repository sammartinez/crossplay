# MR-009 gates

qa_commit: fc3748ebe32eca8c0f54f4162af38407f19812bf

## Red (after QA)
- npm test → exit 1: 35 failed, 474 passed (509). lookup.test.ts (23: odesliHopUrl/withHopLinks not exported), api.test.ts (11: missing hop request / Spotify still a search), App.test.tsx (1: Spotify href is a search).
- QA commit touches only tests/. Live services unreachable here; reported case uses fixtures with real Apple IDs and placeholder artist/YTM/Spotify IDs.

## Green (round 1)
- After 1ae6d77: npm test 19 files / 509 passed; lint 0, typecheck 0, build 0. `git diff --name-only fc3748e HEAD -- tests/` → empty.

## Red (after QA, round 2 — amendment + escalation ruling)
qa_commit: 69c4c92 (also 417e822)
- npm test → 44 failed, 510 passed (554). text.test.ts 11 (sameText missing), lookup.test.ts withHopLinks 27 (raw hop body / match rule missing), api.test.ts 6 (mismatched hop link used). Malformed-body regressions (4) already pass after 2309c93.
- QA commits 417e822, 69c4c92 touch only tests/.

## Green (round 2)
- After 4521469: npm test 19 files / 554 passed; lint 0, typecheck 0, build 0. `git diff --name-only 69c4c92 HEAD -- tests/` → empty. diff.patch refreshed.
