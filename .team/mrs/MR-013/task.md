# MR-013 (PLAN-005 T1)

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

## Acceptance criteria covered
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
