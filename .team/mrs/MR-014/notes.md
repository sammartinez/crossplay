# MR-014 notes (engineer)

**What changed:** Added the 13 `*_CLASS` constants from the task to `src/constants.ts` and moved the existing `TAG_*_CLASS`/`APP_LINK_CLASS` next to them under one comment ("Class names must match the selectors in src/styles.css."). `App.tsx`, `ResultCard.tsx`, `ThemeToggle.tsx` and `ConvertForm.tsx` now use the constants for every `className`. Two-way ternaries stay ternaries. `CopyButton.tsx` is unchanged; its callers pass `GHOST_BUTTON_CLASS`/`SHARE_BUTTON_CLASS`.

**Decisions:**
- The audit list is complete. Every class selector in `src/styles.css` (artist, busy, candidates, card, fader, ghost, msg, primary, share, sub, tag, title, track, plus the compound `exact`/`likely`/`err`/`app-link`) maps to a constant. No other `className` literals exist in `src/`.
- Each constant's value is the exact string rendered before, so the class attributes are byte-identical. The existing class-based tests (`toHaveClass('busy')`, `.msg.err`) pass unchanged.
- `type`, `role`, `aria-*` and other HTML/ARIA values stay inline, as the user decided.
- The repo has no Prettier config. I formatted only the changed lines to the house style (no semicolons, single quotes, width 100). `ThemeToggle`'s button wraps because the new line would be over 100 characters.

**Unsure / not done:** I did not do the 375px visual check in both themes because there is no browser in this session. The rendered class strings are identical, so no visual change is expected.
