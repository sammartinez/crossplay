# MR-007 notes (engineer)

- Changed only `vite.config.ts` (`setupFiles: ['tests/support/setup.ts']`) and `tsconfig.json` (`include` adds `"tests"`), as the task specifies.
- Gates: `npm test` 19 files / 392 tests pass (18 moved files with the 370 existing tests, plus `tests/layout.test.ts`); `npm run lint`, `npm run typecheck`, `npm run build` pass.
- No QA test changes; nothing unclear in the task.
