---
mr: MR-002
round: 2
reviewer: sr-engineer
verdict: approved
blocking: 0
nits: 0
red_before_green: confirmed
---

## Summary
MR-002 is approved: B1 from round 1 is fixed and nothing new blocks. In bae9967 the seven query-parameter names moved to `src/constants.ts` (lines 46-48 and 54-58). `src/lib/lookup.ts` now builds every request's parameters with computed keys (lines 46, 65-69, 82, 93-98), and no parameter name is written inline any more. Sharing one `URL_PARAM` between Odesli and oEmbed is fine, since both endpoints take the link as `url`. The fix only renames keys: the request URLs are the same strings as before. The changed files are the same as in round 1, and the edits since then are limited to `constants.ts` and `lookup.ts`. gates.md shows round 2 green (test, lint, typecheck) with QA's files unchanged. Red-before-green was confirmed in round 1 against QA commit a5a7a56.

Round 1 nit N1 (an alternate with no name gets `''` as its title, where the old page showed `undefined`) was kept unchanged with a reason, and the author flagged it for T4. Nits need no resolution, so it does not carry forward.

## Comments
