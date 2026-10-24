---
mr: MR-004
round: 1
reviewer: principal
pass: second
verdict: changes-requested
blocking: 1
nits: 1
red_before_green: confirmed
---

## Summary
The architecture holds and works for T5. ConvertForm and ResultCard are thin, prop-driven components. All state changes still go through `useConversion`. ResultCard gives T5 one clear place for the per-row Copy button, the share button and the fallback textarea ref. The `mounted` guard in commit 0bcc5de is the right way to extend MR-003's run-ID pattern, and it now has its own red-to-green test. gates.md confirms red before green for the 44 UI tests and for the unmount test. One thing is blocking: the same [S17] problem the Sr. blocked in round 2 also exists in a second test helper, and it was missed.

## Comments

### B1 · blocking · [MISSED] · [S17] · src/App.test.tsx:49-55, src/components/ResultCard.test.tsx:24-30
`row(name)` is defined twice with identical code: it finds the listitem that holds the named link and throws if there isn't one. This is the same kind of copy-pasted test helper as `isShown`, which round 2 blocked and moved to `src/test/dom.ts`. T5 will add per-row Copy button tests to both files, so leaving two copies means a third copy is likely.
**Suggestion:** QA moves `row` into `src/test/dom.ts` next to `isShown`, has it take `screen` queries or a container, and imports it in both test files. This is a test-only commit and needs no engineer change. Record it in gates.md.

### N1 · nit · [ARCH] · src/App.tsx:11-13, src/hooks/useConversion.ts:86-87
Knowledge of the share URL is split across two layers. App reads `?u=` with a raw `URLSearchParams(location.search)`. The hook writes it through `withParams` from `src/lib/url.ts`. PLAN-001 puts the read in App, so this does not block. If a later task touches `?u=` again (PLAN-002, the iOS Shortcut), put the read next to the write: a `readParam` in `src/lib/url.ts`, or have the hook own the param.
