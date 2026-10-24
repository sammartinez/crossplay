---
id: PLAN-002
title: Move tests under tests/, then fix the wrong artist on Spotify fallback results
status: done
---

## Goal
First, move every test file and test helper out of `src/` into `tests/`, mirroring the source tree, without changing any test result. Then fix the reported Spotify bug: Odesli gets one retry, and when the Spotify/iTunes fallback still runs, the result stops showing a guessed artist or an EXACT Apple tag. Instead the user picks the artist from the iTunes candidates.

## Key decisions
- **The move is QA's work.** Everything moved matches `testPaths`. The implementer only changes non-test config: `vite.config.ts` `setupFiles` and `tsconfig.json` `include`. Right after QA's move the suite fails to start, because `setupFiles` still points at `src/test/setup.ts`. For this infrastructure task that is the expected red state; it is the one exception to TDD rule 2. QA's new layout test describes the exact config the implementer must reach.
- **Odesli retry is immediate, with no delay.** It is one more attempt after any failure: a network error, a non-OK status, or a bad body. It is written as `fetchJson(url).catch(() => fetchJson(url))`. A delay would make every fallback test depend on the clock, and a short wait does not clear Odesli's per-minute rate limit anyway. If you want a delay, say so before approval.
- **In the fallback, Apple becomes a search link, not a guessed link.** With no artist from oEmbed, the top iTunes hit is unverified. So `links.apple` is left unset, `withSearchFallbacks` fills an Apple Music *search* URL for the title, and the row reads SEARCH. The artist is `''`.
- **The "Wrong Apple match?" alt picker is replaced by an artist picker.** Candidates are the iTunes results deduplicated by artist, in iTunes order. Each candidate carries that artist's first matching result (title and Apple URL). When the user chooses one, the artist and the Apple link are set, Apple is tagged EXACT (the user confirmed it), and the YouTube Music and Spotify search links plus the share text are rebuilt with the artist. The picker stays visible, and the chosen candidate is marked `aria-pressed="true"`, so the user can change their mind. This is the same "user-confirmed means EXACT" rule as today's `chooseAlt`.
- **The fixture order for the reported case is inferred.** The user reported that "Samuel Cody Matson" was shown and that the visible alt list (which hides `alts[0]`) was NPD, Matson, NPD (Live), Zach Bryan. With `limit=5`, that means iTunes returned `[Matson, NPD, Matson, NPD (Live), Zach Bryan]`. QA builds the fixture in that order.

## Acceptance criteria
- AC1 (test layout): no `*.test.*` file and no test helper, setup or fixture remains under `src/`, and `src/test/` no longer exists. Every test file sits under `tests/` at the path that mirrors its source file, keeping the `.test.` suffix. Top-level `src/*.test.ts(x)` files go to `tests/`, and helpers, setup and fixtures go to `tests/support/` (fixtures under `tests/support/fixtures/`).
- AC2 (config): `vite.config.ts` `test.setupFiles` is `['tests/support/setup.ts']`, and `tsconfig.json` `include` covers `tests`, so `npm run typecheck` still type-checks every test file. `npm run lint` still lints them.
- AC3 (no regression from the move): `npm test` passes the same 370 pre-existing tests, as the same 18 files, plus QA's new layout test file. `npm run lint`, `npm run typecheck` and `npm run build` pass. No file under `src/` imports from `tests/`, so the production bundle contains no test code.
- AC4 (Odesli retry): when the first Odesli request fails (network error or non-OK status) and the second succeeds, the result is the Odesli result, and no oEmbed or iTunes request is made. Odesli is requested at most twice per lookup. The fallback runs only after both attempts fail, for both Spotify and Apple sources. The Odesli happy path still makes exactly one request.
- AC5 (honest fallback, reported case): for `https://open.spotify.com/track/1yQDTSOyfVTCt9XWKQcnXb`, with Odesli failing twice, the reported oEmbed response and the reported iTunes results:
  - the title is "Ain't Gettin' High" and the art is the oEmbed thumbnail;
  - the artist is blank. "Samuel Cody Matson" is not shown as the artist, and neither is any other name;
  - the Apple Music row links to the Apple Music search for the title alone and is tagged SEARCH. Spotify is the canonical track link, tagged EXACT. YouTube Music is a search for the title, tagged SEARCH;
  - the share text's first line is the title alone.
- AC6 (artist candidates): in the Spotify fallback, the candidates are the iTunes results deduplicated by artist name (trimmed, case-insensitive), in first-appearance order. Each candidate keeps that artist's first result's title and its Apple URL, rewritten to `music.apple.com` with `&uo=` removed. Results with an empty artist name or URL are skipped. In the reported case the candidates are Samuel Cody Matson ("Ain't Gettin' High"), The Neon Prairie Dogs ("Ain't Gettin' High") and Zach Bryan ("Younger Years"). With zero results, or a failed iTunes request, there are no candidates and no picker.
- AC7 (artist picker UI): when the result has candidates, the card shows the label "Which artist?" and one button per candidate, named `"<artist> · <title>"`. No button is pressed at first. Clicking one:
  - shows that artist under the title;
  - sets the Apple Music link to the candidate's URL, tagged EXACT;
  - rebuilds the non-exact search links (YouTube Music) with `"<title> <artist>"`;
  - makes the share text start `"<title> — <artist>"` and list the new links;
  - marks that button `aria-pressed="true"` and the others `"false"`.
  
  Clicking another candidate switches to it. Odesli results and Apple-source results never show the picker, and the "Wrong Apple match?" block no longer exists.
- AC8 (unchanged paths): Odesli success, the Apple-source iTunes lookup fallback, short-link resolution, the error messages and `?u=` handling behave as before, apart from the extra Odesli attempt in AC4.

## Out of scope
- Getting the artist from somewhere other than Odesli or iTunes (such as scraping the Spotify page or using the Spotify Web API, which needs auth).
- Filtering candidates by title similarity. "Younger Years · Zach Bryan" stays in the list, and the button name shows the title so the user can see that it doesn't match.
- A retry delay or backoff, and retrying oEmbed or iTunes.
- Remembering a user's artist choice across lookups.
- Changing Apple-source fallback behavior (the iTunes lookup by ID is exact and stays exact).
- Changing tests' content beyond what the move and the new behavior require.

## Tasks

### T1 · Move tests under tests/ mirroring src
- complexity: low
- sets_pattern: true
- assignee: engineer
- depends_on: []
- covers: [AC1, AC2, AC3]
- interface:
  - Layout after the move (QA does every `git mv`):
    - `src/App.test.tsx`, `src/constants.test.ts`, `src/deploy.test.ts`, `src/literals.test.ts`, `src/pageShell.test.ts` → `tests/<same name>`
    - `src/components/*.test.tsx` → `tests/components/`
    - `src/hooks/*.test.ts` → `tests/hooks/`
    - `src/lib/*.test.ts` (including `purity.test.ts`) → `tests/lib/`
    - `src/test/{setup,clipboard,dom,network,storage,systemTheme,fixtures}.ts` → `tests/support/`, and `src/test/fixtures/*.json` → `tests/support/fixtures/`
  - Config the implementer sets:
    - `vite.config.ts`: `test.setupFiles: ['tests/support/setup.ts']`
    - `tsconfig.json`: `"include": ["src", "tests", "vite.config.ts"]`
  - New QA test `tests/layout.test.ts` (reads files from `process.cwd()`, the same pattern as `deploy.test.ts`). It asserts:
    - (a) no file under `src/` matches `.test.` or `.spec.`, and `src/test` does not exist;
    - (b) every `tests/**/*.test.ts(x)` other than `layout.test.ts` has a matching source file at the mirrored `src/` path, or is one of the repo-level checks (`deploy`, `pageShell`, `literals`, `constants`, the last of which mirrors `src/constants.ts`); keep that allow-list explicit;
    - (c) the `vite.config.ts` text names `tests/support/setup.ts` as the setup file;
    - (d) the `tsconfig.json` `include` contains `"tests"`;
    - (e) no file under `src/` imports from a `tests/` path.
- notes:
  - **QA:** do the move and add `tests/layout.test.ts` in one commit. Rewrite relative imports, e.g. `./App` → `../src/App`, `../lib/api` → `../../src/lib/api`, `./test/fixtures` → `./support/fixtures`, `../test/network` → `../support/network`. Change the fixture loader in `tests/support/fixtures.ts` to read `tests/support/fixtures`, and fix the path comments that name `src/test/`. Tests that read source files by path (`literals.test.ts`, `lib/purity.test.ts`, `deploy.test.ts`, `pageShell.test.ts`) already resolve from `process.cwd()` and keep pointing at `src/...`. Check that they still read the same files. Change no assertions.
  - Expected red state after QA's commit: Vitest cannot find `src/test/setup.ts`, so every file errors. This is the agreed exception to TDD rule 2 for a pure move (see Key decisions). `npm test` must not be run against a half-moved tree; QA verifies the move with a throwaway config at the repo root that is never committed. Vitest has no `--setupFiles` CLI flag, and `mergeConfig` concatenates arrays, so the file spreads the base config instead: `import base from './vite.config'; export default { ...base, test: { ...base.test, setupFiles: ['tests/support/setup.ts'] } }`. QA runs `npx vitest run --config <that file>`, then deletes the file. Expect the 370 existing tests to pass and `layout.test.ts` to fail only on (c) and (d).
  - **Implementer:** edit only `vite.config.ts` and `tsconfig.json`. Don't touch anything under `tests/`. Vitest's default `include` already finds `tests/**/*.test.*`, and `eslint.config.js` already lints `**/*.{ts,tsx}`, so neither needs a change. Run all four gates plus `npm run build`.
  - **Orchestrator, `.team/config.json`:** remove the `"src/test/"` entry from `testPaths`. `"tests/"` already covers `tests/support/`, and keeping `src/test/` would let test helpers creep back under `src/`. Make no other change; `vitest.config.*` etc. stay. Do this before QA starts T1 (nobody commits `.team/`).
  - No new constants: this task changes no production source.

### T2 · Retry Odesli once; honest Spotify fallback with an artist picker
- complexity: medium
- sets_pattern: false
- assignee: sr-engineer
- depends_on: [T1]
- covers: [AC4, AC5, AC6, AC7, AC8]
- preview: ["/"]
- interface:
  - `src/lib/types.ts`: rename `AppleAlt` → `ArtistCandidate = { artist: string; title: string; url: string }`. `Lookup.alts` → `Lookup.candidates?: ArtistCandidate[]` (`Conversion` inherits it).
  - `src/lib/lookup.ts`: `fromSpotifyFallback(oembed, itunesBody, parsed): Lookup` returns `{ title: oembed.title, artist: '', art: oembed.thumbnail_url, links: { spotify: parsed.link }, candidates }`, with candidates as in AC6. It has no `apple` link, and its signature is unchanged.
  - `src/lib/links.ts`: replace `withAppleAlt` with `withArtistChoice(conversion: Conversion, candidate: ArtistCandidate): Conversion`. It returns a new object: `artist` is `candidate.artist`, `links.apple` is `candidate.url` with `exact.apple: true`, the other exact links stay, every non-exact link is rebuilt as a search for `"title artist"`, and `candidates` is unchanged (same order). It does not mutate its input.
  - `src/lib/api.ts`: `lookupLink(parsed)` has the same signature. Odesli is fetched up to twice (AC4) before `viaSource`.
  - `src/hooks/useConversion.ts`: `chooseAlt(alt)` → `chooseArtist(candidate: ArtistCandidate)`, which applies `withArtistChoice` to the current conversion and is a no-op when there is none. The rest of the return shape is unchanged.
  - `src/components/ResultCard.tsx`: props `{ conversion: Conversion; onChooseArtist(candidate: ArtistCandidate): void }`.
    - When `conversion.candidates?.length` is non-zero, it renders a group labelled "Which artist?" with one `<button type="button" aria-pressed={candidate.artist === conversion.artist}>` per candidate, whose text is `"<artist> · <title>"`.
    - The artist line renders `conversion.artist` (empty when blank).
    - There is no "Wrong Apple match?" block any more.
  - `src/App.tsx` passes `chooseArtist` through as `onChooseArtist`.
- notes:
  - **Constants** (`src/constants.ts`): add `ARTIST_PICKER_LABEL = 'Which artist?'`. Delete `WRONG_MATCH_LABEL` (dead after this, [S9]). Reuse `ALT_SEPARATOR` for the button text, but consider renaming it `CANDIDATE_SEPARATOR` since "alt" no longer exists; if you rename it, update every import. Any other literal you add goes there too ([S14]).
  - **Reuse, don't duplicate ([S17]):**
    - Build `withArtistChoice` on `withSearchFallbacks`. Pass it a `Lookup` whose `links` hold only the exact links (keep `links[key]` where `exact[key]`) plus the candidate's Apple URL, then put `candidates` back. Don't re-implement the search-link loop.
    - Keep the iTunes URL clean-up (host rewrite, `&uo=` strip) in its existing spot in `fromSpotifyFallback`.
    - Dedup by artist is feature logic and stays in `lookup.ts`, as a small module-private function next to `fromSpotifyFallback`.
    - The Odesli retry is `fetchJson(url).catch(() => fetchJson(url))` inside `viaOdesliOrSource`. It needs no new retry module ([S2], [S4]).
  - **Honest output ([S18]):** no code path may set `artist` or `links.apple` from an iTunes *search* hit without a user click.
  - **QA, reported-case fixtures**, in the new layout:
    - `tests/support/fixtures/spotify-oembed-aint-gettin-high.json`: the real oEmbed shape, like `spotify-oembed-track.json`, with `title` "Ain't Gettin' High", a `thumbnail_url`, and `iframe_url`/`html` for `embed/track/1yQDTSOyfVTCt9XWKQcnXb`. No artist field, as in the real response.
    - `tests/support/fixtures/itunes-search-aint-gettin-high.json`: the real iTunes Search shape (`resultCount`, `results` with `wrapperType`, `kind`, `artistName`, `trackName`, `collectionName`, `trackViewUrl`/`collectionViewUrl` on `itunes.apple.com` with `&uo=4`, `artworkUrl100`). Order: Samuel Cody Matson "Ain't Gettin' High"; The Neon Prairie Dogs "Ain't Gettin' High" (collection "All Downhill From Here"); Samuel Cody Matson "Ain't Gettin' High" (a second release); The Neon Prairie Dogs "Ain't Gettin' High (Live)"; Zach Bryan "Younger Years".
    - Odesli failure is a `429` response on both attempts. Add one test where the first attempt rejects with `TypeError('Failed to fetch')` and the second returns `odesli-track.json`.
  - **QA, existing tests that encode the old behavior:** update the alt-picker tests (`tests/components/ResultCard.test.tsx`, `tests/hooks/useConversion.test.ts` `chooseAlt`, `tests/App.test.tsx` "alternate Apple matches") and the fallback assertions in `tests/lib/api.test.ts` / `tests/lib/lookup.test.ts`: these expect the top hit's artist or Apple link and `fetchedUrls` with a single Odesli call. Rewrite them for AC4–AC7 rather than deleting coverage. Test every degraded path (TDD rule 7):
    - Odesli fails then succeeds;
    - Odesli fails twice, then oEmbed + iTunes with results;
    - with zero results;
    - with the iTunes JSONP failing;
    - with oEmbed failing;
    - the Apple-source path with two Odesli failures.
  - **Risk:** the `literals.test.ts` and `purity.test.ts` checks run over `src/components` and `src/lib`. Keep all new text in constants and keep `lookup.ts`/`links.ts` pure.
  - The `.alts` CSS class can be reused or renamed in `src/styles.css`; no new styles are expected beyond `[aria-pressed="true"]` emphasis.
