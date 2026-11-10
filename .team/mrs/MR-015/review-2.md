---
mr: MR-015
round: 2
reviewer: sr-engineer
verdict: approved
blocking: 0
nits: 0
red_before_green: not-confirmed
---

## Summary
B1 is resolved, and N2 through N5 are addressed in eba1dbe. Nothing new qualifies as a finding, so MR-015 is approved. `answerItunesSearchByEntity` is now defined once, in `tests/support/cases.ts:131-135`. `mockSpotifyCase` uses it as its default, and so does `deferOembed` (`tests/hooks/useConversion.test.ts:229`). The local `itunesSearch` is gone, and there is no other `entity=album` answerer under `tests/`. The fix commit only changes setup and shared names. For example, `useConversion.test.ts:400,412` now import `NOTHING_LIKELY` from cases.ts, with the same value as the local constant it replaces. The test count stays at 760, and the gates are green. N1 (the `fromSpotifyFallback`/`viaSource` absence check in `tests/lib/purity.test.ts`) is left for the user to settle with an AC3 amendment. It is not blocking, since this MR doesn't change those lines. `red_before_green` reads not-confirmed because T3 has no red state by design (PLAN-005 Key decisions), not because a red-before-green check was missed.

## Comments
