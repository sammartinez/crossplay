# MR-001 gates

qa_commit: 2f63225

## Red (after QA)
- command: `npm test`
- exit: 1
- note: harness not installed yet (`npm test` is still the stub), so the new tests can't load in-repo. QA verified in a scratch copy with a matching vite.config.ts: all 5 files fail (4 on missing modules `./constants`, `./theme`, `./ThemeToggle`, `./App`; pageShell.test.ts: 4 assertion failures for favicon/apple-touch-icon in public/, module script src/main.tsx, inline script removed). Files touched: all under src/test/ or *.test.* (in testPaths).

## Green (round 1)
- npm test: exit 0 (36/36)
- npm run lint: exit 0
- npm run typecheck: exit 0
- npm run build: exit 0 (asset URLs under /crossplay/)
- QA files unchanged since 2f63225: yes
