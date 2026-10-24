---
mr: MR-007
round: 1
reviewer: sr-engineer
verdict: approved
blocking: 0
nits: 0
red_before_green: confirmed
---

## Summary
MR-007 meets AC1, AC2 and AC3. QA moved 18 test files, 7 support modules and 14 JSON fixtures from `src/` to `tests/`, mirroring the source tree, and `src/test/` is gone. The implementer changed only the two config lines the task asked for: `vite.config.ts:10` now sets `setupFiles: ['tests/support/setup.ts']`, and `tsconfig.json:18` sets `"include": ["src", "tests", "vite.config.ts"]`. The red state follows the plan's agreed exception for a pure move. In QA's throwaway-config run, only layout checks (c) and (d) failed. In round 1 all 392 tests pass across 19 files, and lint, typecheck and build exit 0. `git diff c274fb8 HEAD` touches only the two config files, so QA's tests are intact.

I checked these points while reviewing. None of them needs a comment:
- Tests that read files by path still resolve from `process.cwd()` and still point at the same `src/...` files: `tests/lib/purity.test.ts:9`, `tests/literals.test.ts:10,14`, `tests/deploy.test.ts` and `tests/pageShell.test.ts`. The fixture loader reads `tests/support/fixtures` (`tests/support/fixtures.ts:8`).
- No file outside `.team/` still refers to `src/test`, apart from the layout test's own check that the directory is gone.
- `.team/config.json` `testPaths` no longer lists `src/test/`.
- QA's allow-list in `tests/layout.test.ts:24-30` adds `tests/lib/purity.test.ts`. This doesn't match the plan's list exactly, but purity is a repo-level check with no `src/lib/purity.ts`, so it is correct. That file is QA's, not the implementer's.
- The implementer added no code, so the slop rubric has nothing to check.

I did not re-run the gates myself; the results above come from gates.md.

## Comments
