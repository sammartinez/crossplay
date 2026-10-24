---
mr: MR-009
round: 1
reviewer: sr-engineer
verdict: changes-requested
blocking: 1
nits: 1
red_before_green: confirmed
---

## Summary
T1 meets AC1–AC5 and AC8 as specified; reuse is good and the retry is untouched. Red 35 at QA commit, green 509 after 1ae6d77, tests/ unchanged. One blocker: a regression against AC9 — `fromOdesli(body)` moved out of the `try`, and the hop's mapping has no rejection handler, so a malformed 200 body (first or hop) now makes `lookupLink` reject where it didn't before.

## Comments

### B1 · blocking · [BUG] [AC9] · src/lib/api.ts:92-111
`lookupLink` promises to resolve on every failure (api.ts:113-114); `useConversion.ts:78` relies on it (no `.catch`). `fromOdesli(body)` / `odesliHopUrl(body)` now run outside the `try`, so a `null` 200 body throws and rejects `lookupLink`; the UI stays BUSY and `busyLink` blocks resubmitting. The hop's `.then(onFulfilled, onRejected)` only catches a failed fetch, not `fromOdesli(hop)` throwing.
**Suggestion:** map the first body inside the `try` as before; for the hop, `fetchJson(hopUrl).then((hop) => withHopLinks(first, fromOdesli(hop))).catch(() => first)`. Keep the hop outside the `try` that routes to `viaSource`.

### N1 · nit · [S18] · src/lib/lookup.ts:87-91 (pinned by tests/lib/api.test.ts:351-356)
For the Principal, not the author. `withHopLinks` takes the hop's Spotify link without checking the hop entity is the same song; in the mismatch fixture a "Dirt (Live) · Some Other Artist" Spotify link is shown under "Dirt" and tagged EXACT. Weaker still for the `youtube` fallback source. A follow-up could tag a hop link EXACT only when titles match; needs an AC + QA change, so not blocking here.
