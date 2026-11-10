# MR-014 gates

qa_commit: dc8825f

## Red (after QA)
- `npm test`: exit 1 — 18 failed / 777 passed (795); only tests/literals.test.ts.
- Planned red: 13 missing `*_CLASS` exports; source-text className checks in App.tsx, ConvertForm.tsx, ResultCard.tsx, ThemeToggle.tsx.
- QA commit touches only tests/literals.test.ts.

## Green (round 1)
- impl commit: 0a06a4c
- npm test: exit 0 — 20 files, 795 tests passed
- npm run lint: exit 0; npm run typecheck: exit 0
- QA files unchanged since dc8825f (diff touches only src/)

## Preview
- `/` at 375px, light + dark, before (dc8825f) and after (0a06a4c): PNGs byte-identical (`cmp`).
- Screens: screens/home-light.png, screens/home-dark.png (before: home-before-*.png). Result card not on `/`; its classes are covered by existing class-lookup tests.
