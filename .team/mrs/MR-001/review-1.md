---
mr: MR-001
round: 1
reviewer: sr-engineer
verdict: approved
blocking: 0
nits: 3
red_before_green: confirmed
---

## Summary
The MR meets AC1, AC2, AC4, AC14, AC15 and AC16 for T1. Gates are green (36/36, lint, typecheck, build), QA's files are unchanged since 2f63225, and both screenshots match the old header in light and dark with nothing visibly broken. Red-before-green counts as confirmed, with one caveat. The in-repo red only shows the stub `npm test` failing. The meaningful red comes from QA's scratch copy, where all 5 files failed for the right reasons: missing modules, plus the pageShell assertions on the icons, the module script and the inline script. The AC15 amendment is sound. The task interface already put `applyTheme` (which writes the DOM and storage) and storage-error tolerance in `src/lib/theme.ts`, so the original AC15 wording contradicted the plan's own interface. Adding `theme.ts` next to the other platform-boundary modules (`api.ts`, `clipboard.ts`) fixes that without a speculative split into pure and impure halves. The only issue is the wording of the parenthetical (N3). I found nothing blocking.

## Comments

### N1 · nit · [TEST] · src/constants.test.ts:5-7
This test checks that `THEME_STORAGE_KEY` equals `'cp-theme'`. That restates the constant, and the behavior is already pinned through the public interface by `src/lib/theme.test.ts:569-572` and `src/components/ThemeToggle.test.tsx:471-475`, which assert `localStorage.getItem('cp-theme')`. The file is QA-owned, so this goes to QA: it can be deleted with no loss of coverage.

### N2 · nit · [BUG] · src/main.tsx:8-9
The comment says the saved choice "shows without a flash of the system theme". `main.tsx` loads as a module script, which is deferred. Once the stylesheet arrives, the browser can paint the empty body in the system palette before this line runs. The old page used a synchronous inline script, which ran before first paint. The visible effect is at most a brief background flash for users whose stored theme differs from the system, and `src/pageShell.test.ts:759-762` forbids an inline script, so I'm accepting the behavior. The comment should claim only what is true: the theme is applied before React's first render.

### N3 · nit · [ARCH] · .team/plans/PLAN-001.md:82
The amendment's parenthetical says only "`applyTheme` writes `<html>` and `localStorage`". But `readStoredTheme` reads storage, and the new `shownTheme` (`src/lib/theme.ts:656-660`) reads `<html>` and `matchMedia`. The exemption covers the whole module, so that part is fine. To keep later tasks from misreading the parenthetical as a per-function allowance, it could read: "`theme.ts` reads and writes `<html>`, `localStorage` and `matchMedia` by design."
