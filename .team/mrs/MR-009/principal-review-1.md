---
mr: MR-009
round: 1
reviewer: principal
pass: second
verdict: approved
blocking: 0
nits: 3
red_before_green: confirmed
---

## Summary
Approved. Decision logic (`odesliHopUrl`, `withHopLinks`, `sameSong`) is pure in lookup.ts; fetch + recovery in api.ts `withOdesliHop` outside the `try` that routes to `viaSource`; retry untouched. `ODESLI_PLATFORM_KEYS` follows `SEARCH_URL_BASES`' keyed-map shape and is type-checked by Platform. Match rule implements the ruling. MR-010 fits cleanly: hop links go through `withSearchFallbacks`, so `exact.spotify` is the only signal T2 needs. Gates consistent (35→509, 44→554; tests/ unchanged after QA). Nothing [MISSED].

## Comments

### N1 · nit · [ARCH] · src/lib/lookup.ts:128-133, src/lib/api.ts:103-104
`odesliHopUrl(body)` re-runs `fromOdesli(body)` to read links; the hop trigger and `withHopLinks`' "missing in first" stay in sync only by convention. Consider `odesliHopUrl(first: Lookup, body)` if this area changes.

### N2 · nit · [S12] · src/lib/lookup.ts:122-124
`Object.fromEntries(PLATFORMS.map(...))` widens keys to `string`; use the loop-and-assign pattern of `withSearchFallbacks` to keep `Platform` keys.

### N3 · nit · [PERF] · src/lib/api.ts:104-108
The hop runs even when the first body has no entity title, where it can fill nothing and the result is null anyway. Gate the hop on `first.title`.
