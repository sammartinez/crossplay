---
mr: MR-004
round: 2
reviewer: sr-engineer
verdict: changes-requested
blocking: 1
nits: 0
red_before_green: confirmed
---

## Summary
B1 from round 1 is fixed. QA's new test in `src/hooks/useConversion.test.ts:283-293` (renderHook, convert, unmount, resolve) checks that `?u=` stays unset after unmount. gates.md records that it fails against the hook from before 0bcc5de and passes on HEAD.

N1 is fixed in `src/components/ConvertForm.tsx:8-11`. N3's assertions now run every time. N2 moves to a follow-up, which is fine.

QA's N3 fix added one problem: it copy-pastes a new DOM-visibility helper into two test files, which [S17] rules out. That is the only thing blocking approval.

## Comments

### B1 · blocking · [S17] · src/App.test.tsx:57-66, src/components/ResultCard.test.tsx:32
Commit 2a6650e defines the same `isShown(el)` function in both files. Each copy is a partial hand-rolled version of jest-dom's `toBeVisible`: it checks the `hidden` attribute, `display` and `visibility` up the ancestor chain. These lines are new since round 1, and the rubric makes [S17] blocking whatever the number of callers.
**Suggestion:** QA keeps one copy in `src/test/` (for example `src/test/dom.ts`, which `testPaths` already covers) and imports it in both test files. Alternatively, QA drops the helper and writes an assertion that needs none. No engineer change is needed; record the QA commit in gates.md.
