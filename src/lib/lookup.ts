import {
  ARTWORK_SIZE_LARGE,
  ARTWORK_SIZE_SMALL,
  APPLE_MUSIC_HOST,
  ITUNES_COUNTRY,
  ITUNES_COUNTRY_PARAM,
  ITUNES_ENTITY_PARAM,
  ITUNES_ID_PARAM,
  ITUNES_LIMIT_PARAM,
  ITUNES_TERM_PARAM,
  ITUNES_ENTITY_ALBUM,
  ITUNES_ENTITY_SONG,
  ITUNES_HOST,
  ITUNES_LOOKUP_URL,
  ITUNES_SEARCH_LIMIT,
  ITUNES_SEARCH_URL,
  ITUNES_TRACKING_PARAM,
  KIND_ALBUM,
  OEMBED_URL_PARAM,
  SPOTIFY_EMBED_RE,
  SPOTIFY_OEMBED_URL,
} from '../constants'
import { spotifyParsedLink } from './links'
import { sameTitle, titleCase } from './text'
import { withParams } from './url'
import type {
  ArtistCandidate,
  ItunesResponse,
  Kind,
  Lookup,
  ParsedLink,
  SpotifyOembed,
} from './types'

const itunesEntity = (kind?: Kind): string =>
  kind === KIND_ALBUM ? ITUNES_ENTITY_ALBUM : ITUNES_ENTITY_SONG

// Only called for Apple links, which parseLink always gives an id.
export const itunesLookupUrl = (p: ParsedLink): string =>
  withParams(ITUNES_LOOKUP_URL, {
    [ITUNES_ID_PARAM]: String(p.id),
    [ITUNES_ENTITY_PARAM]: itunesEntity(p.kind),
    [ITUNES_COUNTRY_PARAM]: ITUNES_COUNTRY,
  })

export function fromItunesLookup(body: ItunesResponse | null, p: ParsedLink): Lookup {
  const match = body?.results?.[0]
  return {
    title: match?.trackName || match?.collectionName || titleCase(p.slug),
    artist: match?.artistName || '',
    art: match?.artworkUrl100?.replace(ARTWORK_SIZE_SMALL, ARTWORK_SIZE_LARGE),
    links: { apple: p.link },
  }
}

export const spotifyOembedUrl = (link: string): string =>
  withParams(SPOTIFY_OEMBED_URL, { [OEMBED_URL_PARAM]: link })

export function resolveSpotifyShortLink(oembed: SpotifyOembed): ParsedLink | null {
  const match = (oembed.iframe_url || oembed.html || '').match(SPOTIFY_EMBED_RE)
  return match ? spotifyParsedLink(match[1] as Kind, match[2]) : null
}

export const itunesSearchUrl = (title: string, kind?: Kind): string =>
  withParams(ITUNES_SEARCH_URL, {
    [ITUNES_TERM_PARAM]: title,
    [ITUNES_ENTITY_PARAM]: itunesEntity(kind),
    [ITUNES_LIMIT_PARAM]: String(ITUNES_SEARCH_LIMIT),
    [ITUNES_COUNTRY_PARAM]: ITUNES_COUNTRY,
  })

// Each artist keeps its first result with the wanted title, or else its first
// result, so its button and an auto-pick point at the same release.
function firstPerArtist(candidates: ArtistCandidate[], title: string): ArtistCandidate[] {
  const byArtist = new Map<string, ArtistCandidate>()
  for (const candidate of candidates) {
    const key = candidate.artist.toLowerCase()
    const kept = byArtist.get(key)
    if (!kept || (!sameTitle(kept.title, title) && sameTitle(candidate.title, title))) {
      byArtist.set(key, candidate)
    }
  }
  return [...byArtist.values()]
}

// oEmbed has no artist and a title search can't confirm one. When exactly one
// artist has the title, it is pre-selected and its Apple link marked likely;
// otherwise the artist stays blank and the hits are only offered to pick from.
export function fromSpotifyFallback(
  oembed: SpotifyOembed,
  itunesBody: ItunesResponse | null,
  p: ParsedLink,
): Lookup {
  const searchHits: ArtistCandidate[] = (itunesBody?.results || []).map((r) => ({
    artist: (r.artistName || '').trim(),
    title: r.trackName || r.collectionName || '',
    url: (r.trackViewUrl || r.collectionViewUrl || '')
      .replace(ITUNES_HOST, APPLE_MUSIC_HOST)
      .split(ITUNES_TRACKING_PARAM)[0],
  }))
  const title = oembed.title ?? ''
  const candidates = firstPerArtist(
    searchHits.filter(({ artist, url }) => artist && url),
    title,
  )
  const unpicked: Lookup = {
    title: oembed.title,
    artist: '',
    art: oembed.thumbnail_url,
    links: { spotify: p.link },
    candidates,
  }
  const matches = candidates.filter((candidate) => sameTitle(candidate.title, title))
  if (matches.length !== 1) return unpicked
  const [pick] = matches
  return {
    ...unpicked,
    artist: pick.artist,
    links: { ...unpicked.links, apple: pick.url },
    likely: { apple: true },
  }
}
