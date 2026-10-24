### T3 · Network layer and useConversion hook
- complexity: high
- sets_pattern: true
- assignee: sr-engineer
- depends_on: [T2]
- covers: [AC9, AC10, AC15]
- interface:
  - `src/lib/api.ts`:
    - `jsonp<T>(url: string): Promise<T>`, which rejects with `Error('timeout')` or `Error('network')` and always removes its script tag and callback;
    - `lookupLink(parsed: ParsedLink): Promise<{ conversion: Conversion|null; parsed: ParsedLink }>`. It returns the possibly resolved `parsed` so the caller can tell whether a short link was resolved.
  - `src/hooks/useConversion.ts`: `useConversion(): { status; conversion: Conversion|null; message: string; isError: boolean; convert(raw: string): void; chooseAlt(alt: AppleAlt): void }`, with the behavior in AC10 and AC12.
- notes:
  - This sets the data-fetching and async-state pattern. Plain `fetch` plus `useState`, with a ref holding the run ID to guard against stale results.
  - `chooseAlt` lives here so all state changes stay in one place. It returns new objects and never mutates.
  - Constants to add: `JSONP_TIMEOUT_MS = 8000`, `JSONP_CALLBACK_PREFIX`, the `?u=` param name `SHARE_URL_PARAM`, and the messages (invalid link, looking up, short-link failure, not found).
  - Tests mock only `fetch` and the JSONP script load, which cross the network boundary. Use fake timers for the timeout. Use deferred promises to check that a stale response is dropped.

## Acceptance criteria covered

- AC9 (lookup orchestration): `lookupLink(parsed)` in `src/lib/api.ts` follows the same order as today:
  - It tries Odesli first.
  - On any Odesli failure it falls back by source: Apple links go to iTunes lookup, Spotify links go to oEmbed and then iTunes search. A failed iTunes JSONP request is treated as no results.
  - It returns a result with the search fallbacks filled in, or `null` when there is no title.
  - JSONP times out after 8 s and cleans up its script tag and callback.
- AC10 (conversion state): `useConversion()` exposes `{ status: 'idle'|'busy'|'done'|'error', result, message, convert(raw) }`, with these rules:
  - Input that doesn't parse sets the invalid-link error without making any request.
  - A response from an older lookup is discarded once a newer one has started.
  - Repeating `convert` on the same link while it is busy does nothing.
  - A failure shows the short-link message when the link was an unresolved `spotify.link` URL, and the not-found message otherwise.
  - On success it calls `history.replaceState` with `?u=<canonical link>`.
- AC15 (standards): every non-exempt literal lives in `src/constants.ts`, including JSX text, labels, messages, URLs, regexes, timeouts and keys. Modules in `src/lib/` other than `api.ts`, `clipboard.ts` and `theme.ts` are pure, with no DOM or network access. (`theme.ts` added in MR-001: `applyTheme` writes `<html>` and `localStorage` by design.)
