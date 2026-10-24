# .team/config.json

```json
{
  "baseBranch": "main",
  "commands": {
    "test": "npm test",
    "lint": "npm run lint",
    "typecheck": "npx tsc --noEmit",
    "preview": "npm run dev -- --port 5173 --strictPort"
  },
  "previewUrl": "http://localhost:5173",
  "testPaths": ["tests/", "**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx", "vitest.config.*", "vitest.setup.*"],
  "paths": { "constants": "src/constants.ts", "shared": "src/lib/" },
  "maxReviewRounds": 3
}
```

- `commands.*`: shell commands run from the repo root. `null` skips that gate.
- `commands.preview` / `previewUrl`: a long-running command that serves the app, and the URL it serves on. Used to screenshot UI work for reviewers and the dashboard, and to let the user try the result before the final merge. Detect from the repo's `dev` (or `start`) script and its framework's default port (Vite 5173, Next 3000, Astro 4321), and pin the port so the URL is stable. If the repo has UI but no way to serve it, offer to add a dev server at the config check (below). `null` turns previews off.
- `testPaths`: what QA may touch, and what implementers may not change after QA's commit. Include test setup and test-runner config files, not just test files: QA owns the test infrastructure, so a test that needs a setup change gets it from QA, not the implementer. Directory prefixes end in `/`; anything else is a glob.
- `paths.constants` / `paths.shared`: where constants and reusable code live. Use the repo's existing locations if it has them (e.g. an existing `constants` file, `utils/`, `lib/`, `shared/`); otherwise `src/constants.ts` and `src/lib/` (Swift: `Sources/<Target>/Constants.swift` and `Sources/<Target>/Shared/`; Python: `<pkg>/constants.py` and `<pkg>/lib/`).
- `baseBranch`: detect with `git symbolic-ref --short refs/remotes/origin/HEAD` (strip `origin/`), else the current branch.

## Detection

Look at the repo root, first match wins, and use the repo's own scripts when they exist.

| Marker | test | lint | typecheck | testPaths |
|---|---|---|---|---|
| `package.json` | `npm test` (or `pnpm`/`yarn`/`bun` per lockfile) | `lint` script if present | `typecheck` script, else `npx tsc --noEmit` if `tsconfig.json` | `**/*.test.*`, `**/*.spec.*`, `tests/`, `__tests__/`, plus test setup/config: `vitest.config.*`, `vitest.setup.*`, `jest.config.*`, `jest.setup.*`, `setupTests.*`, `playwright.config.*` |
| `Package.swift` | `swift test` | `swiftlint` if `.swiftlint.yml` | `null` (the build covers it) | `Tests/` |
| `*.xcodeproj` / `*.xcworkspace` | `xcodebuild test -scheme <scheme> -destination '<dest>'` — ask the user for scheme and destination | `swiftlint` if configured | `null` | `*Tests/` |
| `pyproject.toml` | `pytest` | `ruff check .` | `mypy .` if configured | `tests/`, `**/test_*.py` |
| `go.mod` | `go test ./...` | `go vet ./...` | `null` | `**/*_test.go` |

If nothing matches, ask the user for each command.

## Adding a dev server

Only with the user's yes, and only the framework's standard minimum. Nothing else changes.

| Stack | What to add |
|---|---|
| React or TS with Vitest/Vite already in devDependencies | `vite` (and `@vitejs/plugin-react` for React) as devDependencies; `index.html` at the root with a `#root` element and a module script pointing at the entry; an entry file (`src/main.tsx`) that mounts the root component; `"dev": "vite --port 5173 --strictPort"` |
| Next, Astro, SvelteKit, Remix | They ship a dev server; just add the `dev` script if it's missing |
| Swift / SwiftUI | No dev server. Previews come later via the simulator; set `commands.preview` to `null` |
