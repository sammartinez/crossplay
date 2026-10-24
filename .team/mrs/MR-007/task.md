### T1 · Move tests under tests/ mirroring src
- complexity: low
- sets_pattern: true
- assignee: engineer
- depends_on: []
- covers: [AC1, AC2, AC3]
- interface:
  - Layout after the move (QA does every `git mv`):
    - `src/App.test.tsx`, `src/constants.test.ts`, `src/deploy.test.ts`, `src/literals.test.ts`, `src/pageShell.test.ts` → `tests/<same name>`
    - `src/components/*.test.tsx` → `tests/components/`
    - `src/hooks/*.test.ts` → `tests/hooks/`
    - `src/lib/*.test.ts` (including `purity.test.ts`) → `tests/lib/`
    - `src/test/{setup,clipboard,dom,network,storage,systemTheme,fixtures}.ts` → `tests/support/`, and `src/test/fixtures/*.json` → `tests/support/fixtures/`
  - Config the implementer sets:
    - `vite.config.ts`: `test.setupFiles: ['tests/support/setup.ts']`
    - `tsconfig.json`: `"include": ["src", "tests", "vite.config.ts"]`
  - New QA test `tests/layout.test.ts` (reads files from `process.cwd()`, the same pattern as `deploy.test.ts`). It asserts:
    - (a) no file under `src/` matches `.test.` or `.spec.`, and `src/test` does not exist;
    - (b) every `tests/**/*.test.ts(x)` other than `layout.test.ts` has a matching source file at the mirrored `src/` path, or is one of the repo-level checks (`deploy`, `pageShell`, `literals`, `constants`, the last of which mirrors `src/constants.ts`); keep that allow-list explicit;
    - (c) the `vite.config.ts` text names `tests/support/setup.ts` as the setup file;
    - (d) the `tsconfig.json` `include` contains `"tests"`;
    - (e) no file under `src/` imports from a `tests/` path.
- notes:
  - **QA:** do the move and add `tests/layout.test.ts` in one commit. Rewrite relative imports, e.g. `./App` → `../src/App`, `../lib/api` → `../../src/lib/api`, `./test/fixtures` → `./support/fixtures`, `../test/network` → `../support/network`. Change the fixture loader in `tests/support/fixtures.ts` to read `tests/support/fixtures`, and fix the path comments that name `src/test/`. Tests that read source files by path (`literals.test.ts`, `lib/purity.test.ts`, `deploy.test.ts`, `pageShell.test.ts`) already resolve from `process.cwd()` and keep pointing at `src/...`. Check that they still read the same files. Change no assertions.
  - Expected red state after QA's commit: Vitest cannot find `src/test/setup.ts`, so every file errors. This is the agreed exception to TDD rule 2 for a pure move (see Key decisions). `npm test` must not be run against a half-moved tree; QA verifies the move with a throwaway config at the repo root that is never committed. Vitest has no `--setupFiles` CLI flag, and `mergeConfig` concatenates arrays, so the file spreads the base config instead: `import base from './vite.config'; export default { ...base, test: { ...base.test, setupFiles: ['tests/support/setup.ts'] } }`. QA runs `npx vitest run --config <that file>`, then deletes the file. Expect the 370 existing tests to pass and `layout.test.ts` to fail only on (c) and (d).
  - **Implementer:** edit only `vite.config.ts` and `tsconfig.json`. Don't touch anything under `tests/`. Vitest's default `include` already finds `tests/**/*.test.*`, and `eslint.config.js` already lints `**/*.{ts,tsx}`, so neither needs a change. Run all four gates plus `npm run build`.
  - **Orchestrator, `.team/config.json`:** remove the `"src/test/"` entry from `testPaths`. `"tests/"` already covers `tests/support/`, and keeping `src/test/` would let test helpers creep back under `src/`. Make no other change; `vitest.config.*` etc. stay. Do this before QA starts T1 (nobody commits `.team/`).
  - No new constants: this task changes no production source.


## Acceptance criteria covered
- AC1 (test layout): no `*.test.*` file and no test helper, setup or fixture remains under `src/`, and `src/test/` no longer exists. Every test file sits under `tests/` at the path that mirrors its source file, keeping the `.test.` suffix. Top-level `src/*.test.ts(x)` files go to `tests/`, and helpers, setup and fixtures go to `tests/support/` (fixtures under `tests/support/fixtures/`).
- AC2 (config): `vite.config.ts` `test.setupFiles` is `['tests/support/setup.ts']`, and `tsconfig.json` `include` covers `tests`, so `npm run typecheck` still type-checks every test file. `npm run lint` still lints them.
- AC3 (no regression from the move): `npm test` passes the same 370 pre-existing tests, as the same 18 files, plus QA's new layout test file. `npm run lint`, `npm run typecheck` and `npm run build` pass. No file under `src/` imports from `tests/`, so the production bundle contains no test code.
