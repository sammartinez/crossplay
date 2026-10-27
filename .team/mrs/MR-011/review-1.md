---
mr: MR-011
round: 1
reviewer: sr-engineer
verdict: approved
blocking: 0
nits: 4
red_before_green: confirmed
---

## Summary
Meets AC1–AC4, AC9, AC10. src/ change is a clean deletion; `lookupLink` calls `viaSource` directly; why-comments kept; no orphaned constants/types/imports; `sameText` kept for T2. All 7 odesli fixtures removed. QA's rewrite (e73ed44) checked path by path: every removed non-Odesli-only test has an equivalent (Apple iTunes error/timeout/empty/no slug; Spotify oEmbed reject/404/429/500, iTunes error/timeout/empty; short links; hook overlap/unmount). The strict `mockFetchOnly` + `checkNoUnexpectedFetches` closes the old gap where a swallowed Odesli rejection let tests pass. Red 131 → green 528, tests/ unchanged.

## Comments

### N1 · nit · [TEST] · commit e73ed44
Deleted non-Odesli-only tests and replacements, for the record: App "not shown for an Apple link that falls back…" → "the result card for an Apple link › shows no artist picker"; App not-found → tests/App.test.tsx:372; api "fills search links for platforms Odesli has no link for" → Apple "link Spotify and YouTube Music to searches"; api "null when Odesli gives no title" → tests/lib/api.test.ts:271; useConversion not-found → tests/hooks/useConversion.test.ts:200; api reported-link oEmbed failure → "returns a null conversion after exactly one request when the oEmbed request fails".

### N2 · nit · [TEST] · tests/App.test.tsx:372, tests/hooks/useConversion.test.ts:191-205
No test covers a Spotify oEmbed 200 with no `title` (still makes an iTunes search with an empty term before returning null). Add with T2's AC6 "blank oEmbed title" cases.

### N3 · nit · [TEST] · tests/lib/api.test.ts:60-67, tests/hooks/useConversion.test.ts:46-49
Two `answer` FetchAnswer builders with different signatures, plus `answersStatus`. One shared `answerJson(body, status?)` in tests/support/network.ts would remove the clash.

### N4 · nit · [AC10] · README.md:38
Doesn't say what picking an artist does (Apple links to that release, tagged EXACT). T2 rewrites this bullet for LIKELY anyway.
