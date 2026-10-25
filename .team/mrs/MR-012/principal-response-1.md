---
mr: MR-012
round: 1
pass: second
author: engineer
---

### B1 · fixed · a7d0181
Added `DASH_FEAT_CREDIT_SUFFIX` in `src/constants.ts`, used only in the dash-form regex. It stops at the next spaced dash, so "Song - feat. X - Live" and "Song - feat. X - Remix" keep their version marker. "Song - feat. X - Remastered 2011" still cleans to "Song": the remaster comes off first, then the credit. The bracket form is unchanged. QA's rows from 2099903 now pass: 749 of 749 tests.
