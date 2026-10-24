### T5 · Copy buttons, share text, clipboard fallback
- complexity: medium
- sets_pattern: false
- assignee: engineer
- depends_on: [T4]
- covers: [AC13, AC7, AC15]
- preview: ["/?u=https%3A%2F%2Fmusic.apple.com%2Fus%2Falbum%2Fx%2F1440857781%3Fi%3D1440857786"]
- interface:
  - `src/lib/clipboard.ts`: `copyText(text: string, fallbackBox: HTMLTextAreaElement): Promise<'copied'|'manual'>`. It tries `navigator.clipboard.writeText`, then `execCommand('copy')` on the box, and returns `'manual'` with the box left selected.
  - `src/components/CopyButton.tsx` with props `{ text: string; label: string; className?: string; fallbackRef: RefObject<HTMLTextAreaElement> }`. It shows "Copied" or "Copy it below", then goes back to its label after `COPY_RESET_MS`.
  - `ResultCard` gains a Copy button on each row, a "Copy share text" button (`className="share"`) that copies `shareText(conversion)`, and the hidden, read-only, `aria-label`led fallback textarea.
- notes:
  - Reuse `shareText` from T2. Do not rebuild the string.
  - Constants to add: `COPY_LABEL`, `COPIED_LABEL`, `COPY_MANUAL_LABEL`, `SHARE_LABEL`, `FALLBACK_TEXTAREA_LABEL`, `COPY_RESET_MS = 1400`.
  - Tests stub `navigator.clipboard` and `document.execCommand`, which are platform APIs jsdom lacks, and use fake timers.

## Acceptance criteria covered

- AC7 (share text): `shareText({title, artist, links})` returns `"<title> — <artist>\n\nApple Music: …\nSpotify: …\nYouTube Music: …"`. When the artist is empty, the first line is the title alone.
- AC13 (copy and share):
  - "Copy share text" and each row's Copy button copy with `navigator.clipboard`. The button then reads "Copied" and goes back to its label after 1.4 s.
  - If the clipboard is blocked, the app tries `execCommand('copy')` from the read-only textarea.
  - If that also fails, the textarea stays visible with the text selected and focused, and the button reads "Copy it below".
- AC15 (standards): every non-exempt literal lives in `src/constants.ts`, including JSX text, labels, messages, URLs, regexes, timeouts and keys. Modules in `src/lib/` other than `api.ts`, `clipboard.ts` and `theme.ts` are pure, with no DOM or network access. (`theme.ts` added in MR-001: `applyTheme` writes `<html>` and `localStorage` by design.)
