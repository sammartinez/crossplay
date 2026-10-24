# MR-007 gates

qa_commit: c274fb8d6dc61866ca66f4abc1d37a5750e36e38

## Red (after QA)
- `npm test` → exit 1. All 19 files fail to load: `src/test/setup.ts` (vite.config setupFiles) no longer exists. Agreed red state for a pure move (plan T1 notes).
- QA's throwaway-config run: 390 pass, 2 fail — `config > sets vitest setupFiles to tests/support/setup.ts`, `config > includes tests in tsconfig.json`.
- QA commit touches only `tests/` (39 renames + tests/layout.test.ts).

## Green (round 1)
- npm test: 19 files, 392 tests passed. lint 0, typecheck 0, build 0.
- `git diff --name-only c274fb8 HEAD` → tsconfig.json, vite.config.ts (no QA files touched).
