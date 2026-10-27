### T2 · Auto-pick a unique iTunes match as LIKELY
- complexity: medium
- sets_pattern: true
- assignee: engineer
- depends_on: [T1]
- covers: [AC3, AC5, AC6, AC7, AC8, AC10, AC11]
- preview: ["/"]
- interface:
  - `src/lib/text.ts`, pure:
    - `cleanTitle(title: string): string` applies every pattern in `TITLE_NOISE_RES` (replace with `''`), repeating until the string stops changing, then trims;
    - `sameTitle(a: string, b: string): boolean` is `false` when either cleaned title is blank, and `sameText(cleanTitle(a), cleanTitle(b))` otherwise.
  - `src/lib/types.ts`:
    - `Lookup` gains `likely?: Partial<Record<Platform, boolean>>`;
    - `Conversion` gains `likely: Record<Platform, boolean>`.
  - `src/lib/lookup.ts`: `fromSpotifyFallback(oembed, itunesBody, parsed): Lookup` keeps its signature.
    - Candidates are deduped as today, except that each artist keeps its first `sameTitle`-matching result when it has one (AC6).
    - When exactly one candidate's title is `sameTitle`-equal to `oembed.title`, it returns `artist: candidate.artist`, `links: { spotify: parsed.link, apple: candidate.url }` and `likely: { apple: true }`.
    - Otherwise it returns today's result (`artist: ''`, no `apple`, no `likely`).
  - `src/lib/links.ts`:
    - `withSearchFallbacks(lookup)` sets, for each platform, `exact[key] = !!given && !lookup.likely?.[key]` and `likely[key] = !!given && !!lookup.likely?.[key]`. It always assigns `likely`, the same "always assign the key" rule as `spotifyAppSearch`.
    - `withArtistChoice(conversion, candidate)` keeps its signature. It keeps only EXACT links (as today), so a LIKELY Apple link is dropped. The `Lookup` it passes to `withSearchFallbacks` must have `likely` cleared: the spread of `conversion` brings in the old record, and leaving it in would make the user's choice LIKELY (AC7).
  - `src/components/ResultCard.tsx`: props unchanged. Each row's tag shows `TAG_EXACT`, `TAG_LIKELY` or `TAG_SEARCH`, from `exact[key]`/`likely[key]`, with class `TAG_EXACT_CLASS`, `TAG_LIKELY_CLASS` or `TAG_CLASS`. The picker is unchanged: `aria-pressed` already follows `conversion.artist`, so the auto-picked button is pressed.
  - `src/styles.css`: `.tag.likely` gets its own color, distinct from `.tag` (muted) and `.tag.exact` (`--ok`) in both themes. Use `--accent`, or add a token defined in both palettes.
- notes:
  - **Constants** (`src/constants.ts`):
    - `TITLE_NOISE_RES: RegExp[]`, case-insensitive and anchored to the end of the title (`$`), with a one-line *why* comment: these suffixes don't change the recording, and version markers such as Live or Remix are deliberately absent. Roughly:
      - a dash form: `\s*[-–—]\s*(<remaster>|<feat credit>|single version|radio edit|mono|stereo)\s*$`;
      - a bracket form: `\s*[([]\s*(<remaster>|feat\.?|ft\.?|featuring|with …|radio edit|single version|mono|stereo)…[)\]]\s*$`;
      - `<remaster>` is `(\d{4}\s+)?remaster(ed)?(\s+\d{4})?(\s+version)?`.

      The AC11 examples are the contract, not these sketches. Split them into readable named pieces if that helps, all in constants.
    - `TAG_LIKELY = 'LIKELY'`, and `TAG_CLASS = 'tag'`, `TAG_EXACT_CLASS = 'tag exact'`, `TAG_LIKELY_CLASS = 'tag likely'`. The component's existing inline `'tag exact'`/`'tag'` move to constants, since this task rewrites that line ([S14]). QA adds `TAG_LIKELY` to `UI_TEXT` in `tests/literals.test.ts`. Any other literal goes in constants too.
  - **Reuse ([S17]):**
    - Compare titles only through `sameTitle`. Don't add another normalizer, and don't call `cleanTitle` from `lookup.ts` directly.
    - Keep the candidate title/URL mapping and `firstPerArtist` in `lookup.ts`, and extend them rather than adding a second pass that maps iTunes results again.
    - The YouTube Music search and share text need no new code: `withSearchFallbacks` and `shareText` already use `artist`.
  - **Pattern being set:** LIKELY is the first confidence level between EXACT and SEARCH. It is decided by the mapper (`lookup.ts`) as data on `Lookup`, and turned into per-platform flags in one place (`withSearchFallbacks`). Explain that in two sentences in `notes.md`, with the rejected alternative: a `match: 'exact' | 'likely' | 'search'` field replacing `exact`, rejected for now because it rewrites every `exact` test for no behavior change.
  - **Honest output ([S18]):** only `fromSpotifyFallback`'s unique-match branch may set `likely`. Nothing may set `exact.apple` from a search hit without a click.
  - **QA, fixtures:**
    - Reuse `spotify-oembed-aint-gettin-high.json` and `itunes-search-aint-gettin-high.json` unchanged for AC3.
    - Add `spotify-oembed-unique-match.json`, in the real oEmbed shape like `spotify-oembed-track.json`, and `itunes-search-unique-match.json`, in the real iTunes Search shape like `itunes-search-aint-gettin-high.json` (`itunes.apple.com` URLs with `&uo=4`).
    - The search results must include exactly one artist with an exact-title match. Give the oEmbed title a cleanable suffix (e.g. " - Remastered 2015"), and write the iTunes match without it and with different punctuation or case, so the auto-pick needs both cleaning and `sameText`. That artist's *first* result must be a different title, with the match second. Add another artist whose only result is a "(Live)" variant, and one with an unrelated title.
    - Add a top-of-file note saying the values are invented. Live services aren't reachable from here.
  - **QA, existing tests:** the Spotify album short-link/fallback tests using `itunes-search-albums.json` now auto-pick Queen (AC6). Update those expectations and keep what they cover. Tests using `spotify-oembed-track.json` ("- Remastered 2011") with `itunes-search-songs.json` must stay unchanged. After cleaning, Queen and The Petersens both match, so that pair is the cleaned-title ambiguity check (AC6).
  - **QA, levels:**
    - `tests/lib/text.test.ts`: every AC11 example, as a table (`it.each`), for both `cleanTitle` and `sameTitle`;
    - `tests/lib/lookup.test.ts`: AC5 and AC6 on `fromSpotifyFallback`;
    - `tests/lib/links.test.ts`: `likely`/`exact` from `withSearchFallbacks`, and `withArtistChoice` clearing `likely` (AC7);
    - `tests/components/ResultCard.test.tsx`: the three tag texts and classes;
    - `tests/hooks/useConversion.test.ts`: choosing a candidate after an auto-pick;
    - `tests/App.test.tsx`: AC5 and AC7 end to end through `?u=` or the form;
    - `tests/lib/share.test.ts`: AC5's share text.
  - **README:** add one sentence on LIKELY (AC10).
  - **Style:** check the preview at 375px in both themes with an auto-picked result. The row now reads "Apple Music · LIKELY · Copy". It must stay on one line, and LIKELY must be readable against the card in both palettes.

## Acceptance criteria covered
- AC3 (Spotify link, reported ambiguous case): for `https://open.spotify.com/track/1yQDTSOyfVTCt9XWKQcnXb`, with `spotify-oembed-aint-gettin-high.json` and `itunes-search-aint-gettin-high.json`:
  - the requests, in order, are exactly one `fetch` of `spotifyOembedUrl(<link>)`, then one iTunes search JSONP for the title;
  - the title is "Ain't Gettin' High", the art is the oEmbed thumbnail, and the artist is blank;
  - Apple is the Apple Music search for the title, tagged SEARCH. Spotify is the canonical link, tagged EXACT. YouTube Music is a search, tagged SEARCH;
  - the picker shows Samuel Cody Matson, The Neon Prairie Dogs and Zach Bryan, with no button pressed.
  
  Both Matson and the Neon Prairie Dogs have an exact-title result, so nothing is auto-picked.
- AC5 (auto-pick, unique match): for a Spotify track whose iTunes results include exactly one artist with a `sameTitle`-equal title (AC11) (new fixture, see T2):
  - the artist under the title is that artist;
  - Apple Music links to that artist's matching result's URL (`music.apple.com`, `&uo=` stripped), tagged **LIKELY**. Its tag text is "LIKELY", and it is styled differently from both EXACT and SEARCH;
  - Spotify stays EXACT. YouTube Music is a search for `"title artist"`, tagged SEARCH;
  - the share text's first line is `"<title> — <artist>"`, and it lists the LIKELY Apple URL;
  - the picker is shown with that artist's button `aria-pressed="true"` and the others `"false"`.
- AC6 (auto-pick rule edges):
  - title comparison uses `sameTitle` (AC11): "Aint Gettin High" matches "Ain't Gettin' High", and "Ain't Gettin' High (Live)" does not;
  - `spotify-oembed-track.json` ("Bohemian Rhapsody - Remastered 2011") with `itunes-search-songs.json`: after cleaning, Queen "Bohemian Rhapsody" and The Petersens "Bohemian Rhapsody" both match, so there are two artists and no auto-pick. Queen "Bohemian Rhapsody (Live Aid)" doesn't match;
  - artists are grouped as the candidate dedup groups them (trimmed, case-insensitive). Two matching results by the same artist still count as one artist;
  - an artist whose first result doesn't match but a later one does: its candidate (and the auto-pick, if it is the only matching artist) is the matching result;
  - zero matching artists, two or more, a blank oEmbed title, or no iTunes results: no auto-pick (AC3 behavior);
  - Spotify album links follow the same rule against album results: `spotify-oembed-album.json` with `itunes-search-albums.json` auto-picks Queen;
  - Apple-source lookups never show LIKELY.
- AC7 (user choice overrides the auto-pick): clicking any candidate, the auto-picked one included, sets that artist and Apple URL, tagged **EXACT** (not LIKELY), and the picker presses that button. Choosing another artist after an auto-pick switches the artist, the Apple URL, the YouTube Music search, the share text and the pressed button. No LIKELY tag is left anywhere afterwards.
- AC8 (honest output): EXACT only ever comes from the source link itself or a user's click. LIKELY only ever comes from the AC5 auto-pick, and only on Apple Music. A search URL is never LIKELY or EXACT.
- AC10 (copy): the README's "How it works" section describes the oEmbed/iTunes lookup, the SEARCH and LIKELY tags and the artist picker, and doesn't mention Odesli or song.link. No user-facing string in `src/` mentions song.link.
- AC11 (title cleaning): `cleanTitle(title)` removes the noise suffixes below wherever they sit at the end of the title, in any combination and order, ignoring case. It also trims what's left. `sameTitle(a, b)` is `sameText(cleanTitle(a), cleanTitle(b))`. Each of these matches "Song":
  - Remaster markers:
    - "Song - Remastered 2011"
    - "Song - 2009 Remaster"
    - "Song (2011 Remaster)"
    - "Song - Remastered"
    - "Song [Remastered]"
  - Featuring credits:
    - "Song (feat. X)"
    - "Song (ft. X)"
    - "Song (featuring X & Y)"
    - "Song (with X)"
    - "Song [feat. X]"
    - "Song - feat. X"
  - Other suffixes:
    - "Song - Single Version"
    - "Song (Radio Edit)"
    - "Song - Radio Edit"
    - "Song (Mono)"
    - "Song (Stereo)"
    - "Song - Mono"
  - Combinations:
    - "Song (feat. X) - Remastered 2011"
    - "Song - Radio Edit (feat. X)"

  Each of these does **not** match "Song":
  - "Song (Live)"
  - "Song - Live"
  - "Song - Live / Remastered 2011"
  - "Song (Acoustic)"
  - "Song - Remix"
  - "Song (X Remix)"
  - "Song (Demo)"
  - "Song (Instrumental)"
  - "Song (Extended Edit)"
  - "Song - Edit"
  - "Song (Taylor's Version)"
  - "Song (Re-Recorded)"
  - "Song - Re-recorded 2015"

  Text that isn't a trailing suffix is kept: "Remastered Love" ≠ "Love", and "Feat of Strength" stays as it is. Album titles follow the same rules: "A Night At The Opera (2011 Remaster)" matches "A Night At The Opera". A title that is only noise ("(Remastered)") cleans to `""`, and an empty cleaned title never matches anything, so it can't auto-pick.

## Carried nits from MR-011 review
- N2 (QA + author; refined by Principal on MR-011): a Spotify oEmbed 200 with a blank `title` ends in NOT_FOUND (lookupLink returns null), not a result card — AC6's "blank oEmbed title" case must assert NOT_FOUND. Author: `viaSpotify` returns `{ lookup: null }` before the iTunes search when `oembed.title` is blank, so no iTunes request is made; QA asserts no iTunes request.
- N3 (QA): replace the two `answer` builders and `answersStatus` with one shared `answerJson(body, status?)` in tests/support/network.ts.
- N4 (author): README "How it works" bullet should say what picking an artist does (Apple → that release, EXACT) when rewriting it for LIKELY.
