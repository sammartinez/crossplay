---
mr: MR-004
round: 1
reviewer: sr-engineer
verdict: changes-requested
blocking: 1
nits: 3
red_before_green: confirmed
---

## Summary
The UI part meets AC11 and AC12 within T4's scope; the Copy buttons are deferred to T5 as the plan says. The form, status line, busy state, result card, alternates and the `?u=` auto-convert all match the reference markup and behaviour. The `?u=` effect runs only once under StrictMode. The literals pass AC15, and inline class names follow the pattern set in MR-001. QA's 44 tests failed before the implementation and pass now, and the QA files are unchanged since b8a6e8a.

The hook change in 0bcc5de is correct and acceptable in this MR:
- It needs a `mounted` flag rather than a `runId` bump in cleanup. A bump would cancel the `?u=` lookup during StrictMode's simulated unmount, and the ref guard would then block a retry.
- It is needed for the QA suite to pass reliably, it sits in its own commit, and it is documented.
- What's missing is a test: this behaviour change to the hook (from MR-003, which set the async-state pattern) has no test of its own.

## Comments

### B1 · blocking · [TEST] · src/hooks/useConversion.ts:49-62, 79 (commit 0bcc5de)
The hook now drops lookup results that arrive after unmount, so they no longer call `history.replaceState`. No test pins this. The only thing that catches a regression is test-order leakage in `App.test.tsx`. That failure shows up under an unrelated test name ("looks up the pasted link one tick after the paste event") and only when tests run in a particular order. There was also no red-before-green step for this change: gates.md records red only for the 44 UI tests.
**Suggestion:** have QA add a case to `src/hooks/useConversion.test.ts`:
1. `renderHook` with a deferred `fetch`, then `convert(SPOTIFY_TRACK_RAW)`.
2. `unmount()`, then resolve with `odesli-track.json`.
3. Assert that `?u=` is still `null`.

Confirm it fails against the hook before 0bcc5de and passes now, and record that in gates.md.

### N1 · nit · [BUG] · src/components/ConvertForm.tsx:8, 26
The deferred paste callback calls `convertInput`, which reads `inputRef.current!`. If the form unmounts within that tick, this throws a TypeError from inside a timer. The notes say App never unmounts, which is true today. Still, `inputRef.current?.value` (or skipping the call when the ref is null) costs nothing and removes the non-null assertion.

### N2 · nit · [UI] · src/components/ResultCard.tsx:14-18 (screens/result-light.png, result-dark.png)
The page overflows sideways on a 420px viewport when the title is long. In the result screenshots, the Theme button, the Convert button and the card's right edge all sit about 10px past the 404px content edge seen on the home screenshots, and the title doesn't truncate with an ellipsis. The cause is that `main` is a grid with an `auto` column, and the card's minimum width includes the `nowrap` title. The markup and `styles.css` are identical to the reference, so the reference page behaves the same way. PLAN-001 rules out behaviour fixes, so leave this MR as it is and open a follow-up, for example `main{grid-template-columns:minmax(0,1fr)}`.

### N3 · nit · [S8] · src/App.test.tsx:239-240, src/components/ResultCard.test.tsx:53-54
"Hides the artwork when there is none" asserts inside `if (img) …`. The implementation doesn't render the `<img>` at all, so this assertion never runs and the test passes without checking anything. This is QA's file: ask QA to assert that either `img` is `null` or `img` is not visible, so the test can fail.
