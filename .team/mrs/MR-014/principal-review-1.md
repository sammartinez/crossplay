---
mr: MR-014
round: 1
reviewer: principal
pass: second
verdict: approved
blocking: 0
nits: 0
red_before_green: confirmed
---

## Summary
I'm approving this as the pattern to copy. Every CSS class name now has one home: the single `// Class names must match the selectors in src/styles.css.` group in `src/constants.ts:123-140`, named `<THING>_CLASS`. The pre-existing `TAG_*_CLASS` and `APP_LINK_CLASS` moved into that group, so the next class added has an obvious place to go.

The pattern holds in three ways:
- **Compound classes:** they are their own constants (`MESSAGE_ERROR_CLASS = 'msg err'`, matching `TAG_EXACT_CLASS`), not built at the call site.
- **Conditional classes:** they are plain ternaries over constants. There is no `classNames()` helper or class map ([S2]).
- **The guard:** QA's balanced-brace check in `tests/literals.test.ts:114-144` enforces both rules for every current and future file in `src/components/`.

The test data and the boundaries are sound:
- **Overlapping values:** `BUSY_CLASS`/`STATUS_BUSY` and `TRACK_CLASS`/`KIND_TRACK` share a value but name different domain concepts. Keeping them separate is correct, not duplication ([S17]).
- **CopyButton:** its `className` prop stays a plain pass-through, and callers choose the constant. The dependency stays one-way (components depend on constants).
- **T3:** this MR doesn't touch any of T3's test-support surface (`tests/support/`), so it adds no friction there.

I found nothing the first pass missed:
- A grep of `src/` finds no `className` literal.
- Every selector in `src/styles.css` maps to a constant.
- HTML/ARIA keywords stay inline, as the user decided.
- Red-before-green holds: dc8825f failed only `tests/literals.test.ts`, and 0a06a4c touches only `src/` with all 795 tests green.
- The 375px light and dark screens show the same unbroken home view.

## Comments
