### T4 · Convert form, result card, alternates, `?u=` auto-convert
- complexity: medium
- sets_pattern: false
- assignee: engineer
- depends_on: [T3]
- covers: [AC11, AC12, AC15]
- preview: ["/", "/?u=https%3A%2F%2Fopen.spotify.com%2Ftrack%2F4cOdK2wGLETKBW3PvgPWqT", "/?u=not-a-link"]
- interface:
  - `src/components/ConvertForm.tsx` with props `{ busy: boolean; initialValue?: string; onConvert(raw: string): void }`.
    - It renders a labeled `type="url"` input with the existing placeholder and a "Convert" button that is disabled while busy.
    - Submitting, or a paste event (deferred one tick), calls `onConvert` with the input value.
  - `src/components/ResultCard.tsx` with props `{ conversion: Conversion; onChooseAlt(alt: AppleAlt): void }`.
    - It renders the artwork, the title, the artist, and one row per platform with a link (`target="_blank" rel="noopener"`) and an `EXACT`/`SEARCH` tag.
    - It also renders the alternates block from AC12.
  - `App.tsx` wiring:
    - It connects `useConversion` to these components and adds the `busy` class to `<main>`.
    - It shows the status line with `role="status"` (adding `err` on errors).
    - On mount it reads `?u=` once and converts it.
- notes:
  - Reuse `PLATFORMS` and the T3 messages.
  - Constants to add: `INPUT_PLACEHOLDER`, `CONVERT_LABEL`, `TAG_EXACT`, `TAG_SEARCH`, `WRONG_MATCH_LABEL`, `ALT_SEPARATOR`.
  - Leave the Copy buttons and the share button to T5. Leave a single slot for them, and add no placeholder buttons.
  - Component tests drive `App` with a mocked `fetch`, through the public render output only.
  - Make sure the `?u=` effect runs once under StrictMode in dev.

## Acceptance criteria covered

- AC11 (convert UI):
  - Submitting the form, or pasting into the URL input, starts a conversion.
  - While busy, the Convert button is disabled, the crossfader animates and the status line reads "Looking it up…".
  - The result card shows the artwork (hidden when there is none), the title and the artist, plus one row per platform. Each row has a link that opens in a new tab with `rel="noopener"`, an `EXACT` or `SEARCH` tag, and a Copy button.
  - Errors appear in the status line and hide the card.
  - Loading `/crossplay/?u=<link>` fills the input and converts automatically.
- AC12 (alternates): when the Spotify fallback returned more than one Apple match, the card shows "Wrong Apple match?" with a button for each other match. Clicking one makes it the Apple link, tagged `EXACT`, updates the artist and reorders the alternates.
- AC15 (standards): every non-exempt literal lives in `src/constants.ts`, including JSX text, labels, messages, URLs, regexes, timeouts and keys. Modules in `src/lib/` other than `api.ts`, `clipboard.ts` and `theme.ts` are pure, with no DOM or network access. (`theme.ts` added in MR-001: `applyTheme` writes `<html>` and `localStorage` by design.)
