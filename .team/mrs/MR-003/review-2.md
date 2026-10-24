---
mr: MR-003
round: 2
reviewer: principal
verdict: approved
blocking: 0
nits: 0
red_before_green: confirmed
---

## Summary
B1 is fixed, and nothing new blocks, so I'm approving. `isError` is now its own field in `ConversionState`. Invalid input sent while a lookup runs now shows the invalid-link error and keeps the lookup `busy`. That matches the reference, where `show(msg, true)` never touches the `busy` class, so T4 can safely work out "busy" from `status`. Red-before-green holds for the new behavior: QA's e656a4f failed one test, "stays busy with the invalid-link error…", against the round-1 code. Round 2 is green at 167/167, with QA's files unchanged since e656a4f. All three nits are handled.
- **N1:** the comment on `lookupLink` (src/lib/api.ts:96-97) is enough, and adding a `.catch` for a path that can't be reached would be [S9].
- **N2:** `jsonp` now builds `src` before arming the timer or registering the callback (src/lib/api.ts:36-37).
- **N3:** acknowledged.

I re-checked the new lines in src/hooks/useConversion.ts:51-76 and found nothing new:
- Reading the ref outside the updater is safe, because `busyLink` is updated synchronously.
- A valid `convert` after an invalid one resets `isError: false`.
- A stale run still returns before clearing `busyLink`.

## Comments
