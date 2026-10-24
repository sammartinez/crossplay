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
  ODESLI_API_URL,
  ODESLI_COUNTRY,
  ODESLI_COUNTRY_PARAM,
  ODESLI_HOP_PLATFORMS,
  ODESLI_PLATFORM_KEYS,
  ODESLI_URL_PARAM,
  OEMBED_URL_PARAM,
  PLATFORMS,
  SPOTIFY_EMBED_RE,
  SPOTIFY_OEMBED_URL,
} from '../constants'
import { spotifyParsedLink } from './links'
import { sameText, titleCase } from './text'
import { withParams } from './url'
import type {
  ArtistCandidate,
  ItunesResponse,
  Kind,
  Lookup,
  OdesliEntity,
  OdesliResponse,
  ParsedLink,
  SpotifyOembed,
} from './types'

const itunesEntity = (kind?: Kind): string =>
  kind === KIND_ALBUM ? ITUNES_ENTITY_ALBUM : ITUNES_ENTITY_SONG

export const odesliUrl = (link: string): string =>
  withParams(ODESLI_API_URL, { [ODESLI_COUNTRY_PARAM]: ODESLI_COUNTRY, [ODESLI_URL_PARAM]: link })

const odesliEntity = (body: OdesliResponse, id?: string): OdesliEntity | undefined =>
  id ? body.entitiesByUniqueId?.[id] : undefined

export function fromOdesli(body: OdesliResponse): Lookup {
  const entity = odesliEntity(body, body.entityUniqueId)
  return {
    title: entity?.title,
    artist: entity?.artistName,
    art: entity?.thumbnailUrl,
    links: Object.fromEntries(
      PLATFORMS.map(({ key }) => [key, body.linksByPlatform?.[ODESLI_PLATFORM_KEYS[key]]?.url]),
    ),
  }
}

export function odesliHopUrl(body: OdesliResponse): string | null {
  const { links } = fromOdesli(body)
  if (PLATFORMS.every(({ key }) => links[key])) return null
  const source = ODESLI_HOP_PLATFORMS.map((p) => body.linksByPlatform?.[p]?.url).find(Boolean)
  return source ? odesliUrl(source) : null
}

// Artists are compared only when both are known; a title match alone is
// enough when one side has no artist.
function sameSong(first: Lookup, entity?: OdesliEntity): boolean {
  if (!first.title || !entity?.title || !sameText(first.title, entity.title)) return false
  return !first.artist || !entity.artistName || sameText(first.artist, entity.artistName)
}

// Each link is judged by its own entity, not the hop's main one: for a YouTube
// source that is a video whose artist is a channel name ("X - Topic").
export function withHopLinks(first: Lookup, hop: OdesliResponse): Lookup {
  const links = { ...first.links }
  for (const { key } of PLATFORMS) {
    const hopLink = hop.linksByPlatform?.[ODESLI_PLATFORM_KEYS[key]]
    if (!links[key] && hopLink && sameSong(first, odesliEntity(hop, hopLink.entityUniqueId))) {
      links[key] = hopLink.url
    }
  }
  return { ...first, links }
}

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

function firstPerArtist(candidates: ArtistCandidate[]): ArtistCandidate[] {
  const seen = new Set<string>()
  return candidates.filter(({ artist }) => {
    const key = artist.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// oEmbed has no artist and a title search can't confirm one, so the artist
// stays blank and the search hits are only offered as candidates to pick.
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
  return {
    title: oembed.title,
    artist: '',
    art: oembed.thumbnail_url,
    links: { spotify: p.link },
    candidates: firstPerArtist(searchHits.filter(({ artist, url }) => artist && url)),
  }
}
