# MR-015 (PLAN-005 T3)

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

## Acceptance criteria covered
- AC1 (behavior preserved): every user-visible behavior from PLAN-001 to PLAN-004 is unchanged:
  - parsing, short-link resolution and `?u=` handling;
  - the request sequence for each link type, with no retries;
  - title cleaning, auto-pick and the EXACT/LIKELY/SEARCH tags;
  - the artist picker, share text, the Copy fallbacks and the theme.

  After T1 and T2, every pre-existing test passes with its assertions unchanged (only imports, names, titles and locations differ). After T3, every behavior that a deleted test covered is still asserted on the same input by a surviving test (AC7). No fixture JSON under `tests/support/fixtures/` changes.
- AC2 (gates): `npm test`, `npm run lint` and `npm run typecheck` pass at the end of every task. `package.json` and `package-lock.json` are unchanged (no dependency added or removed).
- AC3 (no Odesli-era names): `fromSpotifyFallback` and `viaSource` don't appear anywhere in `src/` or `tests/`. The test suites don't describe the Spotify path as a "fallback" (`FALLBACK` constant, "fallback result" titles). No file under `tests/` mentions Odesli, except the PLAN-004 AC1 checks in `tests/lib/purity.test.ts` and `tests/deploy.test.ts` that assert its absence.
- AC6 (shared test data): each of these is defined in exactly one place, `tests/support/cases.ts`:
  - the reported-case link (`1yQDTSOyfVTCt9XWKQcnXb`), its title, its thumbnail and its three candidates;
  - the unique-match link (`3kVr8XqPz2LmNw7TyB5hJd`), its title and its candidates;
  - the Spotify track, Spotify album, Spotify short, Apple track and Apple album parsed links;
  - the four expected status messages.

  Checkable by grep: each distinctive literal (the two track IDs, `'Couldn’t find that one.`, `'That link isn’t`) appears in exactly one file under `tests/` outside `fixtures/`. The per-case network setups (reported, unique, Spotify track, Apple track) are shared helpers in that module, used by `App.test.tsx`, `api.test.ts` and `useConversion.test.ts`.
- AC7 (less test code, same coverage): the `.ts`/`.tsx` files under `tests/` total at least 10% fewer lines at the end of T3 than at its start. The QA commit body has a coverage map: each deleted `it` and the surviving test that asserts the same behavior on the same input. A deleted test with no surviving equivalent is a blocking review finding.


User decision: QA makes every change in T3; the engineer verifies the coverage map against the diff, runs the gates and writes notes.md (nothing to implement in src/).

User decision (after QA): AC7's 10% floor is lowered to the ~5% achieved (5,391 → 5,111 lines). The coverage-map requirement still holds.
