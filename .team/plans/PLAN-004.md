---
id: PLAN-004
title: Remove Odesli; auto-pick a unique Apple match as LIKELY
status: done
---

## Goal
Odesli's keyless API now answers every request with 401, so remove it completely and make the oEmbed/iTunes path the only lookup path. For Spotify links, when exactly one iTunes artist has a song with the same title (after stripping suffixes such as remaster and featuring credits), pre-select that artist and tag Apple Music LIKELY, so most lookups no longer end at a blank artist.

## Key decisions
- **Two tasks, in order.** T1 is a pure removal: behavior becomes today's fallback, with no Odesli requests in front of it. T2 adds the auto-pick on top. T2 depends on T1 because both rewrite `fromSpotifyFallback`'s tests and `api.test.ts`.
- **`sameText` stays.** After T1 its only caller (`sameSong`) is gone, but T2 uses it in the same release. T1 keeps it and says so in `notes.md`; reviewers don't flag it as [S9] dead code for that reason.
- **LIKELY is carried as data, not worked out in the component.** `Lookup` gains `likely?: Partial<Record<Platform, boolean>>`. `withSearchFallbacks` turns it into `Conversion.likely: Record<Platform, boolean>`. A link given with `likely[key]` set is not exact. Per platform, exactly one of three states holds: EXACT (`exact[key]`), LIKELY (`likely[key]`), or SEARCH (neither). `withSearchFallbacks` is the one place that sets both records, so they can't disagree.
- **Titles are cleaned before they're compared (user decision).** `cleanTitle` in `src/lib/text.ts` strips only suffixes that don't change the recording:
  - remaster markers;
  - featuring credits;
  - "Single Version";
  - "Radio Edit";
  - "(Mono)"/"(Stereo)".

  It is applied to the oEmbed title and to each iTunes title, and the cleaned strings are compared with `sameText` through one helper, `sameTitle`. The patterns live in `src/constants.ts`. Version markers that change the recording are kept, so they still don't match: Live, Acoustic, Remix, Demo, Instrumental, other edits, Re-recorded, Taylor's Version.
  - Mono and Stereo are included: they are mixes of the same recording, and the result is only ever LIKELY, never EXACT.
  - "(with X)" is stripped as the user asked. It can, rarely, hide a different recording ("(with Orchestra)"), but the result is still only LIKELY.

  Cleaning is used only for this comparison. The displayed title, the iTunes search term and the share text keep the original title. It is part of T2: it's one pure helper whose only caller is the auto-pick, and QA tests it on its own in `tests/lib/text.test.ts`.
- **Matching runs over all iTunes hits, not just each artist's first one.** An artist "has a match" when any of its results' title (`trackName || collectionName`) is `sameTitle`-equal to the oEmbed title. The candidate kept for each artist is its first matching result if it has one, otherwise its first result, as today. So the picker button, the auto-pick and the Apple URL always point at the same release. With the existing fixtures, this gives the same candidates as today.
- **Albums too.** A Spotify album link searches iTunes albums and compares `collectionName`. The same rule applies. The existing `itunes-search-albums.json` with `spotify-oembed-album.json` ("A Night At The Opera (2011 Remaster)", Queen only) becomes an auto-pick case.
- **Share text and Copy use the LIKELY Apple URL (decided by the user).** The card shows that URL as the Apple link, and the share text lists the card's links, so the two agree. Share text carries no tags, as today.

## Acceptance criteria
- AC1 (no Odesli): no lookup of any kind requests `api.song.link` or any other Odesli URL. In `src/`, `README.md` and `tests/`, no Odesli constant, type, function, fixture or fixture helper remains: `ODESLI_*`, `OdesliResponse`, `OdesliEntity`, `odesliUrl`, `fromOdesli`, `odesliHopUrl`, `withHopLinks`, `sameSong`, `odesli-*.json`, `odesliWithout`, `odesliEntityWith`, `ytmDirtWith`. `sameText` and its tests remain. A source-text test asserts that `src/` contains neither `song.link` nor `odesli` (case-insensitive).
- AC2 (Apple link): for an Apple track or album link, the only network activity is one iTunes lookup JSONP (`itunesLookupUrl(parsed)`), with no `fetch`. The result is as today's Apple-source fallback:
  - title, artist and art come from the lookup; Apple is the input link, tagged EXACT;
  - Spotify and YouTube Music are searches for `"title artist"`, tagged SEARCH;
  - the "Search in Spotify app" link is shown.
  
  When iTunes fails or returns no results, the title comes from the URL slug and the artist is blank, as today.
- AC3 (Spotify link, reported ambiguous case): for `https://open.spotify.com/track/1yQDTSOyfVTCt9XWKQcnXb`, with `spotify-oembed-aint-gettin-high.json` and `itunes-search-aint-gettin-high.json`:
  - the requests, in order, are exactly one `fetch` of `spotifyOembedUrl(<link>)`, then one iTunes search JSONP for the title;
  - the title is "Ain't Gettin' High", the art is the oEmbed thumbnail, and the artist is blank;
  - Apple is the Apple Music search for the title, tagged SEARCH. Spotify is the canonical link, tagged EXACT. YouTube Music is a search, tagged SEARCH;
  - the picker shows Samuel Cody Matson, The Neon Prairie Dogs and Zach Bryan, with no button pressed.
  
  Both Matson and the Neon Prairie Dogs have an exact-title result, so nothing is auto-picked.
- AC4 (Spotify degraded paths, unchanged):
  - oEmbed rejects or returns non-OK: `NOT_FOUND_MESSAGE`, after exactly one request;
  - an unresolvable short link: `SHORT_LINK_MESSAGE`, as today;
  - an iTunes JSONP error or timeout, or zero results: the AC3 result with no candidates and no picker.
  
  No request is ever retried.
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
- AC9 (unchanged paths): short-link resolution, `?u=` handling, the error messages, "Search in Spotify app" (shown exactly when Spotify is not EXACT), Copy buttons and theme behave as before.
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

## Out of scope
- Any other link-matching service (keyed APIs, a backend, Spotify Web API, MusicBrainz, Deezer).
- Cleaning any suffix not listed in AC11, such as "(Deluxe Edition)", "(Bonus Track)", "- From \"Film\" Soundtrack" or "(Explicit)". Such titles won't auto-pick; they keep today's picker. Extending the list is a constants change.
- Using cleaned titles anywhere other than the auto-pick comparison: display, the iTunes search term, share text, and the "Search in Spotify app" query.
- Fuzzy or partial title matching beyond `sameText` plus cleaning.
- Auto-picking for YouTube Music. It stays a search.
- Showing LIKELY for anything other than the Apple link of a Spotify-source lookup.
- Exact Spotify links for Apple-source lookups. With Odesli gone, Spotify is always a search there, and the "Dirt" case from PLAN-003 is back to a search.
- Remembering choices, ranking candidates, or changing `ITUNES_SEARCH_LIMIT`.

## Tasks

### T1 · Remove Odesli; lookups go straight to oEmbed/iTunes
- complexity: medium
- sets_pattern: false
- assignee: engineer
- depends_on: []
- covers: [AC1, AC2, AC3, AC4, AC9, AC10]
- interface:
  - `src/lib/api.ts`: `lookupLink(parsed): Promise<{ conversion: Conversion | null; parsed: ParsedLink }>` keeps its signature and its never-rejects contract.
    - Its body calls what is `viaSource` today directly. `viaOdesliOrSource`, `withOdesliHop` and the Odesli retry are deleted.
    - `jsonp` and `fetchJson` stay as they are; `fetchJson` is still used for oEmbed.
  - `src/lib/lookup.ts`: delete `odesliUrl`, `odesliEntity`, `fromOdesli`, `odesliHopUrl`, `sameSong` and `withHopLinks`. Every other export keeps its signature and behavior. Drop the `sameText` import (T2 re-imports it).
  - `src/lib/types.ts`: delete `OdesliEntity`, `OdesliPlatformLink`, `OdesliPlatform` and `OdesliResponse`, and the `ODESLI_*` type imports.
  - `src/constants.ts`: delete `ODESLI_API_URL`, `ODESLI_COUNTRY`, `ODESLI_COUNTRY_PARAM`, `ODESLI_URL_PARAM`, `ODESLI_PLATFORM_KEYS` and `ODESLI_HOP_PLATFORMS`, with their comments.
  - `README.md`: rewrite the two "How it works" bullets (lines 37–38) for AC10. This is T1's copy change; T2 adds one sentence for LIKELY.
- notes:
  - **Pure deletion.** Add no new behavior, and no "service unavailable" message. Don't rename `viaSource` or `itunesOrNothing` beyond what the deletion needs. Keep the existing *why* comments on `itunesOrNothing` and `lookupLink`.
  - **Constants:** none added. If an edit leaves a constant unused, delete it ([S9]).
  - **Reuse:** `sameText` and `tests/lib/text.test.ts` stay untouched (see Key decisions).
  - **QA:**
    - Delete `tests/support/fixtures/odesli-*.json` (6 files) and the Odesli helpers in `tests/support/fixtures.ts` (`odesliWithout`, `odesliEntityWith`, `ytmDirtWith` and their types).
    - Delete tests that only cover Odesli: `lookupLink Odesli hop`, the `Odesli retry` block, and the `odesliUrl`/`fromOdesli`/`odesliHopUrl`/`withHopLinks` cases in `tests/lib/lookup.test.ts`.
    - Rewrite tests that reached the source path through "Odesli fails" so they run with no Odesli mock. Keep their assertions on results and on `fetchedUrls`/JSONP loads, now without the Odesli calls. This covers `api.test.ts` "Apple links / Spotify links / Spotify short links / the reported Spotify link when Odesli …", and the `useConversion`, `App` and `ResultCard` tests built on `odesli-track.json`.
    - Tests that only checked the Odesli happy path (all three EXACT) become Apple-source or Spotify-source cases, because no lookup yields three EXACT links any more.
    - Make `mockFetch` in each rewritten test fail on any URL it doesn't expect, so an Odesli request would fail the test (AC1).
    - Add the AC1 source-text check to `tests/lib/purity.test.ts`. It already reads `src/lib` files. Extend it to every file under `src/`, or add a sibling test there; keep it in that file.
  - **Risk:** the size of the test rewrite. Coverage of every remaining degraded path must survive (TDD rule 7). QA lists any deleted test that wasn't Odesli-only in the commit body.

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

## What the user must decide or verify
1. **Before approval:** check the AC11 example lists. Anything you want to move between "matches" and "doesn't match" is a constants change now, and cheaper than later. In particular, Mono/Stereo and "(with X)" are included.
2. **After deploy:** for an Apple link, Spotify is always SEARCH now, including the "Dirt" case PLAN-003 had made EXACT. Check that `?u=<apple link>` shows a result in under a second, and that the "Search in Spotify app" link works.
