### B1 · fixed · 2309c93
`fromOdesli(body)` and `odesliHopUrl(body)` now run inside the `try` again, so a malformed first body goes to `viaSource` as it did before. The hop is still outside that `try`: `fetchJson(hopUrl).then((hop) => withHopLinks(first, fromOdesli(hop))).catch(() => first)`, so a failed fetch or a body that fails to map gives the first lookup. I'd like QA to add regression tests to `tests/lib/api.test.ts`:
- the first response is a `null` 200 body: `lookupLink` resolves through the source fallback;
- the reported case where the hop response is a `null` 200 body: `lookupLink` resolves to `withSearchFallbacks(fromOdesli(odesli-apple-dirt.json))` after exactly two requests.

### N1 · acknowledged
This is for the Principal and the user. I have not changed anything for it.
