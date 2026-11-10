---
mr: MR-014
round: 1
reviewer: sr-engineer
verdict: approved
blocking: 0
nits: 0
red_before_green: confirmed
---

## Summary
The MR meets AC1, AC2 and AC5. The 13 constants match the task's interface exactly. They sit in one group with `TAG_*_CLASS` and `APP_LINK_CLASS` under the required one-line *why* comment (`src/constants.ts:123-140`).

Every `className` in `App.tsx`, `ConvertForm.tsx`, `ResultCard.tsx` and `ThemeToggle.tsx` now uses a constant. Each constant has the same value as the string it replaced, so the rendered class attributes don't change. I compared the selectors in `src/styles.css` with the constants: `sub`, `ghost`, `primary`, `fader`, `busy`, `msg`, `err`, `card`, `track`, `title`, `artist`, `tag`, `exact`, `likely`, `app-link`, `candidates` and `share` are all covered. A grep of `src/` finds no `className` literal left. `CopyButton.tsx` is unchanged, as the task requires, and its callers pass `GHOST_BUTTON_CLASS` and `SHARE_BUTTON_CLASS`. HTML/ARIA keywords stay inline, as the user decided. The two-way ternaries stay ternaries over constants; there is no class map or helper ([S2]).

Red-before-green is confirmed:
- **QA commit (dc8825f):** touches only `tests/literals.test.ts`. It went red with 18 failures in that file and nowhere else. The failures were the planned ones: missing exports and the source-text checks.
- **Implementation (0a06a4c):** touches only `src/`. All 795 tests pass, and lint and typecheck are clean.
- **Existing tests:** the class-lookup tests have unchanged assertions.

I looked at the 375px screenshots in light and dark (`screens/home-light.png`, `screens/home-dark.png`). Nothing is visibly broken, and `gates.md` records them as byte-identical to the before captures. `ponytail-review` found nothing to cut.

## Comments
