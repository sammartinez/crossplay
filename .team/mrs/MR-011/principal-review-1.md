---
mr: MR-011
round: 1
reviewer: principal
pass: second
verdict: changes-requested
blocking: 1
nits: 2
red_before_green: confirmed
---

## Summary
Lookup flow after removal is sound: api.ts is I/O only (`viaSource` → `viaSpotify` / iTunes lookup), lookup.ts pure mappers, `withSearchFallbacks` the single Conversion builder. T2 slots in without reshaping. Strict `mockFetchOnly` + teardown check is the pattern to copy. One small blocker: permissive `mockFetch` still exported.

## Comments

### B1 · blocking · [MISSED] · [S9] · tests/support/network.ts:33
`mockFetch` has no caller outside network.ts; it's an unused export and the loose stand-in that lets a swallowed unexpected request pass. T2's QA could pick it up and bypass `checkNoUnexpectedFetches`.
**Suggestion:** drop `export` from `mockFetch`; `mockFetchOnly` becomes the only fetch stand-in tests can import.

### N1 · nit · [ARCH] · src/lib/api.ts:67, src/lib/api.ts:86
For T2: AC6 says a blank oEmbed title gives "no auto-pick (AC3 behavior)", but `lookupLink` turns a title-less lookup into null → NOT_FOUND, after an iTunes search with term ''. T2's QA should assert NOT_FOUND; cleanest fix is `viaSpotify` returning `{ lookup: null }` before the iTunes search when `oembed.title` is blank.

### N2 · nit · [S1] · tests/App.test.tsx:23-25, tests/hooks/useConversion.test.ts:23-25, tests/lib/api.test.ts:28
Headers repeat the "every fetch stand-in answers only the URLs a test names" note that lives on `mockFetchOnly`. Keep the AC refs, drop the restatement.
