---
mr: MR-005
round: 1
reviewer: sr-engineer
verdict: changes-requested
blocking: 1
nits: 1
red_before_green: confirmed
---

## Summary
The implementation meets AC7, AC13 and AC15. `copyText` follows the reference `copy()` step for step: clipboard first, then show, select and `execCommand('copy')`, then focus for a manual copy. `CopyButton` resets after `COPY_RESET_MS`. `ResultCard` reuses `shareText` and renders the reference markup (`ghost` and `share` classes, a read-only textarea with `rows=5`, `hidden` and an aria-label). The screenshots match in light and dark. Gates show 28 red after QA commit 5f16b8d, green after f172ce8, and QA files unchanged. The one blocker is in the QA test files: the same selection-reading helper is written three times, the [S17] pattern earlier rounds of this plan blocked. QA needs to fix it, because the implementer may not edit QA files.

## Comments

### B1 · blocking · [S17] · src/lib/clipboard.test.ts:25-26, src/components/ResultCard.test.tsx:110-111, src/test/clipboard.ts:38
The "selected text of a textarea" logic (`box.value.slice(box.selectionStart, box.selectionEnd)`) appears three times. `clipboard.test.ts` and `ResultCard.test.tsx` each define their own `selectedText`, and `stubExecCommand` inlines the same expression. `src/test/dom.ts` already holds the shared DOM test helpers (`isShown`, `expectNotShown`, `resultRow`).
**Suggestion:** QA exports `selectedText(box: HTMLTextAreaElement): string` from `src/test/dom.ts` (or from `src/test/clipboard.ts`) in a QA commit, then uses it in both test files and inside `stubExecCommand`. The behavior under test doesn't change, so the red/green gate still holds.

### N1 · nit · [TEST] · src/components/ResultCard.test.tsx:151,153,190
`CopyButton.test.tsx:11` names the 1.4 s reset `RESET_MS`, but `ResultCard.test.tsx` writes raw `1399`, `1` and `1400`. Keeping the spec value as a literal in tests is fine, since importing `COPY_RESET_MS` would make the test circular. Using one named local constant in both files would read more consistently. QA owns this one too.
