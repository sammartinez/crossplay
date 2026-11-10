# MR-014 (PLAN-005 T2)

### T2 · Move component class names into constants
- complexity: low
- sets_pattern: true
- assignee: engineer
- depends_on: []
- covers: [AC1, AC2, AC5]
- preview: ["/"]
- interface:
  - `src/constants.ts` gains these class-name constants. Each value is exactly today's rendered string, so the CSS in `src/styles.css` is untouched:
    - `BUSY_CLASS = 'busy'`, `MESSAGE_CLASS = 'msg'`, `MESSAGE_ERROR_CLASS = 'msg err'`;
    - `SUBTITLE_CLASS = 'sub'`, `FADER_CLASS = 'fader'`;
    - `CARD_CLASS = 'card'`, `TRACK_CLASS = 'track'`, `TITLE_CLASS = 'title'`, `ARTIST_CLASS = 'artist'`, `CANDIDATES_CLASS = 'candidates'`;
    - `PRIMARY_BUTTON_CLASS = 'primary'`, `GHOST_BUTTON_CLASS = 'ghost'`, `SHARE_BUTTON_CLASS = 'share'`.

    Group them with `TAG_*_CLASS` and `APP_LINK_CLASS` under a one-line *why* comment: these names must match `src/styles.css`.
  - `src/App.tsx`, `src/components/ResultCard.tsx`, `ThemeToggle.tsx` and `ConvertForm.tsx` use those constants for every `className`. Props, markup and rendered output are unchanged. `CopyButton`'s `className` prop is unchanged; its callers pass the constants.
- notes:
  - **Constants:** the list above is the whole set found in the audit. Any class name it missed goes in too [S14].
  - **Reuse:** follow the existing `TAG_EXACT_CLASS`/`APP_LINK_CLASS` naming (`<THING>_CLASS`). Don't add a `classNames()` helper or a class map object [S2]: two-way ternaries stay as ternaries over constants.
  - **QA (red = source-text checks, see Key decisions):** in `tests/literals.test.ts`:
    - add a check per component file that it has no `className="` and no quoted literal inside `className={…}`;
    - add export assertions for the new constants, values written out;
    - replace the `CANDIDATE_SEPARATOR ?? ALT_SEPARATOR` tolerance (and its comment) with a plain `CANDIDATE_SEPARATOR` check.

    Existing tests that look up elements by class (e.g. `toHaveClass('busy')`, `.msg.err`) stay unchanged. They prove the rendered classes didn't move.
  - **Style:** check the preview at 375px in both themes, before and after. The screens must be identical.

## Acceptance criteria covered
- AC1 (behavior preserved): every user-visible behavior from PLAN-001 to PLAN-004 is unchanged:
  - parsing, short-link resolution and `?u=` handling;
  - the request sequence for each link type, with no retries;
  - title cleaning, auto-pick and the EXACT/LIKELY/SEARCH tags;
  - the artist picker, share text, the Copy fallbacks and the theme.

  After T1 and T2, every pre-existing test passes with its assertions unchanged (only imports, names, titles and locations differ). After T3, every behavior that a deleted test covered is still asserted on the same input by a surviving test (AC7). No fixture JSON under `tests/support/fixtures/` changes.
- AC2 (gates): `npm test`, `npm run lint` and `npm run typecheck` pass at the end of every task. `package.json` and `package-lock.json` are unchanged (no dependency added or removed).
- AC5 (constants rule in components):
  - `App.tsx` and the files in `src/components/` contain no string-literal `className` value (no `className="…"` and no quoted string inside a `className={…}` expression);
  - every CSS class name they use comes from `src/constants.ts`, and the rendered class attributes are byte-for-byte the same as today;
  - `tests/literals.test.ts` no longer accepts `ALT_SEPARATOR`.

User decision: HTML/ARIA keyword values (type="button", target="_blank", role="status", …) stay inline.
