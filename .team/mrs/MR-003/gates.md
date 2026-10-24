# MR-003 gates

qa_commit: b37785f

## Red (after QA)
- command: `npm test`, exit 1
- Test Files 2 failed | 10 passed; existing 114 tests pass
- failing: src/lib/api.test.ts (unresolved ./api), src/hooks/useConversion.test.ts (unresolved ./useConversion) — 51 new tests
- QA commit touches only src/test/ and *.test.*

## Green (round 1)
- npm test: exit 0 (165/165)
- npm run lint: exit 0
- npm run typecheck: exit 0
- npm run build: exit 0
- QA files unchanged since b37785f: yes

## Red (QA addendum for review-1 B1)
- qa_commit_2: e656a4f (src/hooks/useConversion.test.ts only)
- npm test: 1 failed (stays busy with the invalid-link error...), 166 passed

## Green (round 2)
- npm test: exit 0 (167/167)
- lint/typecheck/build: exit 0
- QA files unchanged since e656a4f: yes
