# MR-004 notes

`ConvertForm` is an uncontrolled form: the input uses `defaultValue={initialValue}` and a ref, so submit and the deferred paste callback both read the live value when they run. `ResultCard` renders the reference markup (`card`, `track`, `title`, `artist`, `tag exact`, `alts`) from a `Conversion`, so `styles.css` applies unchanged. Alternates are `alts.slice(1)`, and clicking one calls `onChooseAlt`, which goes to the hook's `chooseAlt`. `App` reads `?u=` once with a lazy `useState`, passes it to the form as `initialValue`, and converts it in an effect guarded by a ref, so the effect runs once under StrictMode. `<main>` gets `busy`, the status `<p>` gets `msg` or `msg err`, and the card renders only when the hook holds a conversion. The hook clears the conversion on every error, which hides the card.

Decisions:
- **Hook change (separate commit 0bcc5de):** `useConversion` now drops lookup results that land after unmount. Without this, a lookup left running by one App test resolved after cleanup and wrote `?u=` into the URL. The next test then auto-converted that link, and "looks up the pasted link one tick after the paste event" failed. In the real page this would also be wrong: an unmounted hook should not rewrite history. I used a `mounted` flag rather than bumping `runId` in cleanup, because StrictMode's simulated unmount would cancel the `?u=` lookup and the ref guard would block a retry.
- The artwork `<img>` is not rendered when there is no art. The reference rendered it with `hidden`, which shows the same thing on screen and avoids React's `src=""` warning.
- Input accessible name: `aria-label={INPUT_LABEL}` ("Spotify or Apple Music link"), since the reference has no visible label. I kept the reference's `required` and `autoComplete="off"`.
- CSS class names stay inline in `className`, following the MR-001 pattern (`"ghost"`, `"sub"`). They are not constants.
- No placeholder Copy or share buttons. T5 adds them inside each `<li>` after the tag, and at the end of the card.

Unsure: the paste `setTimeout` is not cleared on unmount. If the form unmounts within the same tick as a paste, the callback would read a null ref. That cannot happen in the app, since App never unmounts, so I left it out.
