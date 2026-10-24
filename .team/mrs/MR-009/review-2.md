---
mr: MR-009
round: 2
reviewer: sr-engineer
verdict: approved
blocking: 0
nits: 0
red_before_green: confirmed
---

## Summary
Round 2 approved. B1 fixed and the amended AC3 match rule implemented per the Principal's ruling. QA's round-2 tests (417e822, 69c4c92) failed before 4521469 (44) and all 554 pass after; the 4 malformed-body regressions already passed after 2309c93 as they cover B1. No tests/ file changed after the QA commits.
- B1 resolved: api.ts:101-108 maps the first body inside the `try`; api.ts:92-95 hop is `.then(...).catch(() => first)`; tests/lib/api.test.ts:762-790 cover both null cases.
- N1 resolved via escalation: `withHopLinks` (lookup.ts:81-90) checks each link against its own entity via `linksByPlatform.<key>.entityUniqueId`; applies to AC4.
- Rubric: S17 (shared `odesliEntity`, `ODESLI_PLATFORM_KEYS`), `sameText` in text.ts, S14 regexes in constants (`u` flag present), S19 layout, S1 comments explain why. Nothing to flag.

## Comments
