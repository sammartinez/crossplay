---
mr: MR-012
round: 2
reviewer: principal
pass: second
verdict: approved
blocking: 0
nits: 0
red_before_green: confirmed
---

## Summary
B1 resolved: the dash-form regex in `TITLE_NOISE_RES` uses `DASH_FEAT_CREDIT_SUFFIX` (src/constants.ts:74, 79) and stops at the next spaced dash; bracket form unchanged. QA rows first at 2099903 (4/749 failing: "- Live"/"- Remix" in cleanTitle and sameTitle; "- Remastered 2011" already passing). After a7d0181 749 green, lint/typecheck/build clean, tests/ unchanged. Round-1 N2 (375px overflow) and N3 (light-palette contrast) carried to the follow-up task.

## Comments
