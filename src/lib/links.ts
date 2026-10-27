import {
  PLATFORM_APPLE,
  PLATFORM_SPOTIFY,
  PLATFORMS,
  SEARCH_URL_BASES,
  SPOTIFY_APP_SEARCH_URI,
  WORD_SEPARATOR,
} from '../constants'
import type { ArtistCandidate, Conversion, Lookup, Platform } from './types'

export const searchUrl = (platform: Platform, query: string): string =>
  SEARCH_URL_BASES[platform] + encodeURIComponent(query)

export const searchQuery = ({ title, artist }: Pick<Lookup, 'title' | 'artist'>): string =>
  [title, artist].filter(Boolean).join(WORD_SEPARATOR)

export const spotifyAppSearchUri = (query: string): string =>
  SPOTIFY_APP_SEARCH_URI + encodeURIComponent(query)

export function withSearchFallbacks(lookup: Lookup): Conversion {
  const query = searchQuery(lookup)
  const links = {} as Conversion['links']
  const exact = {} as Conversion['exact']
  const likely = {} as Conversion['likely']
  for (const { key } of PLATFORMS) {
    const given = lookup.links[key]
    likely[key] = !!given && !!lookup.likely?.[key]
    exact[key] = !!given && !likely[key]
    links[key] = given || searchUrl(key, query)
  }
  const spotifyAppSearch = exact[PLATFORM_SPOTIFY] ? undefined : spotifyAppSearchUri(query)
  return { ...lookup, links, exact, likely, spotifyAppSearch }
}

export function withArtistChoice(conversion: Conversion, candidate: ArtistCandidate): Conversion {
  const exactLinks: Lookup['links'] = {}
  for (const { key } of PLATFORMS) {
    if (conversion.exact[key]) exactLinks[key] = conversion.links[key]
  }
  // The user's click confirms the choice, so the old auto-pick's likely record goes.
  return withSearchFallbacks({
    ...conversion,
    likely: undefined,
    artist: candidate.artist,
    links: { ...exactLinks, [PLATFORM_APPLE]: candidate.url },
  })
}
