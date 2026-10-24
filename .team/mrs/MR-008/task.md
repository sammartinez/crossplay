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

## Acceptance criteria covered
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

## Carried nit from MR-007 (Principal N1)
tests/literals.test.ts:11 — drop the now-dead `!f.includes('.test.')` filter while editing this file for UI_TEXT changes.
