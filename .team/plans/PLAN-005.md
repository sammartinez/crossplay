---
id: PLAN-005
title: Behavior-preserving cleanup of src/lib, components and the test suite
status: done
---

## Goal
Make the codebase easier to read and change without changing anything a user can see: retire the names PLAN-004 left behind when Odesli went, give `links.ts` a single job, bring the components in line with the constants rule, and cut the duplication and cross-level repetition in `tests/` (5,331 lines of tests for 968 lines of source).

## Audit summary (what this plan is based on)
`src/` is in decent shape: no unused exports, no unused constants, no Odesli identifiers. Most of the debt is in naming, module boundaries and the tests:
- **Odesli-era names.** `fromSpotifyFallback` and `viaSource` are named after the "fallback/source path" that ran when Odesli failed. It is now the only path. The test suites still call the Spotify result "the fallback" (`FALLBACK` in `ResultCard.test.tsx`, "Spotify fallback result" in `api.test.ts`), and `tests/support/network.ts` still names Odesli in a comment.
- **`src/lib/links.ts` does two jobs.** It parses the pasted link (`parseLink`, `spotifyParsedLink`, `canonicalSpotifyLink`) and it builds the result's links (`searchUrl`, `withSearchFallbacks`, `withArtistChoice`). `lookup.ts` imports it only to parse.
- **Constants rule applied unevenly.** `TAG_*_CLASS` and `APP_LINK_CLASS` are constants. Every other class name is inline, including computed strings in `App.tsx` (`'busy'`, `'msg err'`, `'msg'`) [S14]. `tests/literals.test.ts` still accepts the pre-PLAN-002 name `ALT_SEPARATOR`.
- **Tests.**
  - The same test data is redefined in up to four files: the reported case (link, title, thumbnail, the three artists and their URLs), the unique-match case, parsed links, and the four status messages.
  - The same network setup (`reportedCase`, `uniqueCase`, `spotifyCase`, `appleCase`) is rewritten in `App.test.tsx`, `api.test.ts` and `useConversion.test.ts`.
  - Mapping rules are asserted field by field at three levels: `lookup.test.ts`, then `api.test.ts`, then `useConversion.test.ts`. The `chooseArtist` block repeats `withArtistChoice`'s tests through the hook.
  - Smaller items: `mockFetch` only forwards to `mockFetchOnly` [S10]; a comment in `tests/support/clipboard.ts` sits above the wrong export; `expectedShareText` (share-text format) lives in the clipboard helpers; App tests mix `() => jsonResponse(x)` and `answerJson(x)` for the same thing.

## Key decisions
- **Three tasks.** T1 is source-only in `src/lib` and the hook. T2 is source-only in the components. T3 is test-only. T1 and T2 don't touch the same files and can run in parallel. T3 runs last, so it consolidates tests that already use the new names.
- **No behavior change, enforced by the tests.** For T1 and T2, QA's red commit changes no assertion in any existing test. It only changes imports, renames, `describe` titles and moved blocks, and adds the new source-text checks. If an implementer believes an assertion has to change, that is a bug in this plan: stop and report it.
- **Red states that aren't ordinary failing assertions (named, as asked):**
  - **T1:** red is a missing module or export. The tests import `parseLink`/`spotifyParsedLink`/`canonicalSpotifyLink` from `src/lib/parse` (which doesn't exist yet) and `fromSpotifyOembed` from `src/lib/lookup` (not exported yet). `typecheck` and the affected test files fail on the import, not on an assertion.
  - **T2:** red is source-text assertions in `tests/literals.test.ts` (no string-literal `className` in `App.tsx` or `src/components/`), plus export assertions for the new class constants.
  - **T3:** there is no red state. It is a test-only refactor, so the suite is green before and after. Its check is the coverage map in the QA commit body (see T3), plus AC6 and AC7.
- **T3 is done by QA.** Only QA edits tests (`engineering.md` TDD rule 4), so QA makes every change in T3. The assignee (engineer) checks the coverage map against the diff, runs the gates and writes `notes.md`. There is nothing to implement in `src/`.
- **Test data stays literal.** The repo's tests write expected values out ("a literal on purpose, so the tests check the value rather than echo it"). T3 keeps that rule. Shared data moves to `tests/support/cases.ts` as literals and is **not** imported from `src/constants.ts`.
- **Name chosen: `fromSpotifyOembed`.** It mirrors `fromItunesLookup`: each mapper is named for the response it starts from. Rejected: `fromSpotifySearch`, because the iTunes search is a second input and the oEmbed is the primary one.
- **The module split is `parse.ts` + `links.ts`, not a new folder.** `links.ts` keeps the name for the half that builds links, so most of its importers don't change. Rejected: moving `jsonp`/`fetchJson` out of `api.ts` into their own transport module. `api.ts` is 91 lines, and the split would add a module without removing any confusion.

## Acceptance criteria
- AC1 (behavior preserved): every user-visible behavior from PLAN-001 to PLAN-004 is unchanged:
  - parsing, short-link resolution and `?u=` handling;
  - the request sequence for each link type, with no retries;
  - title cleaning, auto-pick and the EXACT/LIKELY/SEARCH tags;
  - the artist picker, share text, the Copy fallbacks and the theme.

  After T1 and T2, every pre-existing test passes with its assertions unchanged (only imports, names, titles and locations differ). After T3, every behavior that a deleted test covered is still asserted on the same input by a surviving test (AC7). No fixture JSON under `tests/support/fixtures/` changes.
- AC2 (gates): `npm test`, `npm run lint` and `npm run typecheck` pass at the end of every task. `package.json` and `package-lock.json` are unchanged (no dependency added or removed).
- AC3 (no Odesli-era names): `fromSpotifyFallback` and `viaSource` don't appear anywhere in `src/` or `tests/`. The test suites don't describe the Spotify path as a "fallback" (`FALLBACK` constant, "fallback result" titles). No file under `tests/` mentions Odesli, except the PLAN-004 AC1 checks in `tests/lib/purity.test.ts` and `tests/deploy.test.ts` that assert its absence.
- AC4 (one job per lib module):
  - `src/lib/parse.ts` exports exactly `parseLink`, `spotifyParsedLink` and `canonicalSpotifyLink`, with unchanged signatures and behavior;
  - `src/lib/links.ts` no longer exports or re-exports them;
  - `tests/lib/parse.test.ts` holds the parsing tests and `tests/lib/links.test.ts` holds only link-building tests;
  - `parse.ts` is in `PURE_MODULES` in `tests/lib/purity.test.ts`.
- AC5 (constants rule in components):
  - `App.tsx` and the files in `src/components/` contain no string-literal `className` value (no `className="…"` and no quoted string inside a `className={…}` expression);
  - every CSS class name they use comes from `src/constants.ts`, and the rendered class attributes are byte-for-byte the same as today;
  - `tests/literals.test.ts` no longer accepts `ALT_SEPARATOR`.
- AC6 (shared test data): each of these is defined in exactly one place, `tests/support/cases.ts`:
  - the reported-case link (`1yQDTSOyfVTCt9XWKQcnXb`), its title, its thumbnail and its three candidates;
  - the unique-match link (`3kVr8XqPz2LmNw7TyB5hJd`), its title and its candidates;
  - the Spotify track, Spotify album, Spotify short, Apple track and Apple album parsed links;
  - the four expected status messages.

  Checkable by grep: each distinctive literal (the two track IDs, `'Couldn’t find that one.`, `'That link isn’t`) appears in exactly one file under `tests/` outside `fixtures/`. The per-case network setups (reported, unique, Spotify track, Apple track) are shared helpers in that module, used by `App.test.tsx`, `api.test.ts` and `useConversion.test.ts`.
- AC7 (less test code, same coverage): the `.ts`/`.tsx` files under `tests/` total at least 10% fewer lines at the end of T3 than at its start. The QA commit body has a coverage map: each deleted `it` and the surviving test that asserts the same behavior on the same input. A deleted test with no surviving equivalent is a blocking review finding.

## Out of scope
- Any visible change: markup structure, CSS rules, copy, class names as rendered, the README.
- New features, new error messages, new tags, and new dependencies (including a coverage tool such as `@vitest/coverage-v8`).
- Replacing `exact`/`likely` with a single `match` field. PLAN-004 considered and rejected it, and nothing here changes that reasoning.
- Moving `jsonp`/`fetchJson` out of `api.ts`, renaming `api.ts`/`lookup.ts`, or restructuring `useConversion`.
- Changing or adding fixtures, or changing what the repo-level checks (`layout`, `deploy`, `pageShell`, `purity`) assert. Only the additions named below are allowed.
- HTML and ARIA keyword attribute values (`type="button"`, `target="_blank"`, `rel="noopener"`, `role="status"`, `autoComplete="off"`), unless the user decides otherwise (see the end of this plan).

## Tasks

### T1 · Retire Odesli-era names and split link parsing out of links.ts
- complexity: medium
- sets_pattern: true
- assignee: principal
- depends_on: []
- covers: [AC1, AC2, AC3, AC4]
- interface:
  - `src/lib/parse.ts` (new, pure). It takes these from `links.ts` unchanged, along with their private helpers `isKind`, `parseSpotify` and `parseApple`:
    - `parseLink(raw: string): ParsedLink | null`
    - `spotifyParsedLink(kind: Kind, id: string): ParsedLink`
    - `canonicalSpotifyLink(kind: Kind, id: string): string`
  - `src/lib/links.ts` keeps exactly these, with no re-exports of the moved functions [S10]:
    - `searchUrl`, `searchQuery`, `spotifyAppSearchUri`;
    - `withSearchFallbacks(lookup: Lookup): Conversion`;
    - `withArtistChoice(conversion: Conversion, candidate: ArtistCandidate): Conversion`.
  - `src/lib/lookup.ts`: `fromSpotifyFallback` is renamed `fromSpotifyOembed(oembed: SpotifyOembed, itunesBody: ItunesResponse | null, p: ParsedLink): Lookup`. Only the name changes; the body is identical. It imports `spotifyParsedLink` from `./parse`.
  - `src/lib/api.ts`:
    - `lookupLink(parsed)` keeps its signature and its never-rejects contract.
    - `viaSource` is deleted. Its Apple branch becomes `viaApple(parsed): Promise<SourceLookup>`.
    - `lookupLink` picks `viaApple` or `viaSpotify` by `parsed.src` and applies the single `.catch(() => ({ lookup: null, parsed }))` itself. It keeps the existing *why* comments on `itunesOrNothing` and `lookupLink`.
  - `src/hooks/useConversion.ts`: imports `parseLink` from `../lib/parse` and `withArtistChoice` from `../lib/links`. No other change.
- notes:
  - **Constants:** none added or removed. The moved code keeps importing the same constants from `../constants`.
  - **Reuse:** a pure move and rename. Don't rewrite the moved bodies, reorder their logic or "tidy" them on the way [S13]. `git diff -M` should show `parse.ts` as mostly moved lines.
  - **Comments:** `fromSpotifyOembed`'s existing *why* comment stays. Update any comment that calls this path "fallback" or "source path" in the Odesli sense. "Search fallbacks" in `withSearchFallbacks` is still accurate (search links fill in for missing ones) and stays.
  - **QA (red = missing module/export, see Key decisions):**
    - Move the `parseLink` and `canonicalSpotifyLink` describes from `tests/lib/links.test.ts` to a new `tests/lib/parse.test.ts` importing `../../src/lib/parse`.
    - Rename `fromSpotifyFallback` to `fromSpotifyOembed` in the imports and `describe` titles of `lookup.test.ts`, `api.test.ts` and `useConversion.test.ts`.
    - Add `'parse.ts'` to `PURE_MODULES` in `tests/lib/purity.test.ts`.
    - Add a source-text check in `purity.test.ts` that `src/` contains neither `fromSpotifyFallback` nor `viaSource`.
    - Change no assertion.
  - **Pattern being set** (`notes.md`, two sentences): each lib module has one job (`parse` reads the pasted link, `lookup` builds service URLs and maps responses, `links` builds the result's links, `api` does network and orchestration), and mappers are named `from<Response>`. The rejected alternative is the transport split (see Key decisions).
  - **Risk:** low; it is mechanical. `layout.test.ts` requires `tests/lib/parse.test.ts` to mirror `src/lib/parse.ts`, and it will once both exist.

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

### T3 · Consolidate the test suite: shared cases, no cross-level repeats
- complexity: medium
- sets_pattern: true
- assignee: engineer (QA makes every change; see Key decisions)
- depends_on: [T1, T2]
- covers: [AC1, AC2, AC3, AC6, AC7]
- interface (test support surface other tests will import):
  - `tests/support/cases.ts` (new). It holds literal values only and imports nothing from `src/constants.ts`:
    - parsed links: `SPOTIFY_TRACK`, `SPOTIFY_ALBUM`, `SPOTIFY_SHORT`, `APPLE_TRACK`, `APPLE_ALBUM` (`ParsedLink`), plus the raw links the tests paste (`SPOTIFY_TRACK_RAW`, …);
    - the reported case: `REPORTED` (`ParsedLink`), `REPORTED_TITLE`, `REPORTED_THUMB`, `REPORTED_CANDIDATES` (`ArtistCandidate[]`, Matson, Neon, Zach in iTunes order);
    - the unique-match case: `UNIQUE` (`ParsedLink`), `UNIQUE_TITLE`, `UNIQUE_CANDIDATES` (Marlow, Dust Bowl Choir, Harper);
    - the expected messages: `INVALID_LINK_MESSAGE`, `LOOKING_UP_MESSAGE`, `SHORT_LINK_MESSAGE`, `NOT_FOUND_MESSAGE`;
    - `expectedShareText(head, links)`, moved from `tests/support/clipboard.ts`;
    - network setups returning `{ fetchMock, loads }`, each built on `mockFetchOnly` + `mockJsonp` + `fixture` and with today's defaults:
      - `mockAppleCase(itunes?: JsonpOutcome)`;
      - `mockSpotifyCase(link?: string, oembed?: FetchAnswer)`;
      - `mockReportedCase(itunes?: JsonpOutcome)`;
      - `mockUniqueCase()`.
  - `tests/support/network.ts`:
    - `mockFetch` is inlined into `mockFetchOnly` [S10];
    - the Odesli example in its comment goes;
    - fetch answers use `answerJson` everywhere (no `() => jsonResponse(x)` in test files). `jsonResponse` stays exported for the deferred-promise tests that resolve a `Response` by hand.
  - `tests/support/clipboard.ts`: the `'ok' | 'blocked' | 'missing'` comment moves to `ClipboardOutcome`, where it belongs.
- notes:
  - **What to cut (cross-level repeats).** Each rule is asserted at the lowest level that owns it, and higher levels test only their own job:
    - **`tests/lib/lookup.test.ts` owns the mapping.** In the reported and unique-match blocks, a whole-object `toEqual` already pins the result. Delete the field-by-field `it`s that only restate a field of that `toEqual`. Keep those that test a distinct rule: the original title kept, the matching candidate chosen per artist, artists grouped by case and spaces.
    - **`tests/lib/api.test.ts` owns orchestration**: which requests, in what order, how many, and each degraded path to `null` or to no candidates. For each link type (Apple track, Spotify track, reported, unique match, short link), replace the per-field `it`s with one `toEqual` against the whole expected `Conversion`, written out in literals. Keep every request-sequence and degraded-path test.
    - **`tests/hooks/useConversion.test.ts` owns state and wiring.** In `chooseArtist`, keep:
      - choosing sets the artist and an EXACT Apple link;
      - after an auto-pick, choosing clears LIKELY;
      - the status stays done;
      - no conversion means no change.

      Delete the tests that restate `withArtistChoice` (YouTube Music rebuild, candidate order, switching twice, no mutation); `tests/lib/links.test.ts` covers each of them.
    - **`tests/App.test.tsx` and `tests/components/ResultCard.test.tsx` are the user-visible level and stay** as they are, apart from using the shared cases. The only deletion is the duplicate "old Wrong Apple match? block" test in `App.test.tsx`; `ResultCard.test.tsx` keeps its copy.
  - **Names:**
    - `FALLBACK` in `ResultCard.test.tsx` becomes `SPOTIFY_SOURCE`;
    - "fallback" titles that mean the Spotify path are reworded (AC3);
    - "fallback textarea" (the copy fallback) is a different thing and stays.
  - **Coverage map (required, AC7):** the QA commit body lists each deleted `it`, by file and title, with the surviving test that asserts the same behavior on the same input. The reviewer (and the assignee) checks the list against the diff.
  - **Measurement:** the commit body states the line count of the `.ts`/`.tsx` files under `tests/` before and after (5,331 before PLAN-005; T1 and T2 add a few lines), and the `it` count before and after.
  - **Constraints:**
    - Fixtures don't change.
    - The repo-level checks (`layout`, `deploy`, `pageShell`, `literals`, `purity`) keep what they assert. `cases.ts` is under `tests/support/`, so `layout.test.ts` accepts it.
    - Keep one commit per logical step (shared cases; network/clipboard support; each file's de-duplication), so a reviewer can check each step against the map.
  - **Risk:** losing coverage of a degraded path (TDD rule 7). When in doubt, keep the test. AC7's 10% floor is met easily by the `api`/`lookup`/`useConversion` collapses alone, so nothing borderline needs to go.

## What the user must decide or verify
1. **The constants rule for HTML/ARIA keywords.** T2 moves every CSS class name into constants, but leaves standard attribute keywords inline (`type="button"`, `target="_blank"`, `rel="noopener"`, `role="status"`, `autoComplete="off"`, `type="url"`). They are part of the HTML vocabulary, not values the app defines. The strict reading of the rule ("every literal") would move those too. Say if you want that, and T2 adds them; otherwise the plan treats them as out of scope.
2. **T3 is QA-run.** Only QA may edit tests, so T3's work is done in QA's step, and the engineer's step is a check against the coverage map with nothing to implement in `src/`. Confirm that's acceptable for the pipeline, or fold T3 into QA's step of T1 instead.

## User decisions (2026-10-27)
1. HTML/ARIA keyword values stay inline (out of scope).
2. T3: QA makes the edits; the engineer verifies the coverage map and gates.
3. Delivery: push `team/PLAN-005` and open a PR.
4. AC7 amended (after T3): the user accepted a ~5% reduction (5,391 → 5,111 lines, −5.2%) in place of the 10% floor. Coverage-map requirement unchanged.
5. AC3 amended (final checkpoint): the `fromSpotifyFallback`/`viaSource` absence check in `tests/lib/purity.test.ts` is exempt, like the Odesli absence checks.

## Follow-ups (non-blocking, from MR-015 Principal review)
- Give `mockSpotifyCase`'s `itunes` parameter one type (or move the case helpers to an options object).
- Move Spotify-track and Apple-track result data (title, thumb, candidates) into `tests/support/cases.ts`.
- Use `APPLE_TRACK.link` in `api.test.ts` and `share.test.ts`.
