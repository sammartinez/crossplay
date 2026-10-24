---
mr: MR-007
round: 1
reviewer: principal-engineer
pass: second
verdict: approved
blocking: 0
nits: 1
red_before_green: confirmed
---

## Summary
I approve this as the layout pattern for the repo. Production and test code are separated in one direction only: `src/` never imports `tests/`, and layout check (e) enforces that. Helpers, setup and fixtures sit together under `tests/support/`. Tests that check the whole repo are listed in one explicit allow-list (`tests/layout.test.ts:24-30`), so a new exception has to be added on purpose. It matches `engineering.md` TDD rule 6 and `.team/config.json` `testPaths`. Nothing else in the repo still points at `src/test`. T2 needs no further layout work. Red-before-green numbers in gates.md add up (390 pass / 2 fail on (c),(d); green 392).

## Comments

### N1 · nit · [TEST] · tests/literals.test.ts:11
`!f.includes('.test.')` existed so the scan would skip co-located test files in `src/components/`. After the move it never removes anything (layout check (a) guarantees that). Drop it when T2 edits this file for its `UI_TEXT` entries.
