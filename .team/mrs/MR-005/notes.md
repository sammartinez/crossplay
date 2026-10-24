# MR-005 notes

**What changed:** `src/lib/clipboard.ts` adds `copyText`, which ports the reference `copy()`. It hides the box, tries `navigator.clipboard.writeText`, then puts the text in the box, shows it, selects it and runs `execCommand('copy')`. If that fails it leaves the box shown, selected and focused, and returns `'manual'`. `CopyButton` shows "Copied" or "Copy it below", then resets after `COPY_RESET_MS`, with the timer started once the copy settles and cleared on unmount or on a repeat click. `ResultCard` gets a `ghost` Copy button on each row, the `share` button (which reuses `shareText`), and the read-only fallback textarea (`rows=5`, `hidden`), matching the reference markup.

**Decisions:**
- I changed `fallbackRef` to `RefObject<HTMLTextAreaElement | null>`. The plan said `RefObject<HTMLTextAreaElement>`, but React 19's `useRef<T>(null)` returns the nullable type. `CopyButton` uses `fallbackRef.current!` with a comment: the textarea renders next to the buttons, so the ref is always set by the time anyone clicks. I left out a runtime check because it would guard a state that can't happen [S3].
- `copyText` shows and hides the textarea itself through `box.hidden`, as the reference does. The planned `CopyButton` props have no callback, so `ResultCard` can't hold that state. React renders `hidden` once and never resets it, so the imperative toggle is safe.
- A missing `navigator.clipboard` throws a TypeError inside the same `try` that catches a rejected write. Both cases fall through to `execCommand`, the same as in the reference.
- A throw from `execCommand` is handled the same as a `false` return (fall back to a manual copy). It is not swallowed.
- I added `COPY_COMMAND`, `COPY_RESULT_COPIED`, `COPY_RESULT_MANUAL` and `FALLBACK_TEXTAREA_ROWS` to the constants in the plan [S14]. The result values follow the `STATUS_*` pattern.

**Unsure:** if a copy promise settles after `CopyButton` unmounts, the reset timer still starts. When it fires it only calls `setState` on an unmounted component, which React 19 ignores, so I didn't add a mounted guard.
