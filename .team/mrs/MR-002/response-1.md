### B1 · fixed · bae9967
The query-param names now live in `src/constants.ts`: `ODESLI_COUNTRY_PARAM`, `URL_PARAM`, `ITUNES_ID_PARAM`, `ITUNES_ENTITY_PARAM`, `ITUNES_COUNTRY_PARAM`, `ITUNES_TERM_PARAM` and `ITUNES_LIMIT_PARAM`. `lookup.ts` builds every param object with computed keys. The Odesli and Spotify oEmbed calls both use `URL_PARAM`, because both endpoints take the link under the same name.

### N1 · kept, no change
I kept `''` as the fallback title for an alternate. The old script would give `undefined` here, and the UI would print "undefined · Artist", which is a display bug rather than intended behavior. Matching it would mean making `AppleAlt.title` optional, and every consumer would then need its own check. The case is practically unreachable, because an iTunes song or album result always has `trackName` or `collectionName`. I am flagging it for the T4 alternates work.
