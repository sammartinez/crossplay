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
  PLATFORM_SPOTIFY,
  SPOTIFY_EMBED_RE,
  SPOTIFY_OEMBED_URL,
  URL_PARAM,
} from '../constants'
import { canonicalSpotifyLink } from './links'
import { titleCase } from './text'
import type {
  AppleAlt,
  ItunesResponse,
  Kind,
  Lookup,
  OdesliResponse,
  ParsedLink,
  SpotifyOembed,
} from './types'

const withParams = (base: string, params: Record<string, string>): string =>
  `${base}?${new URLSearchParams(params)}`

const itunesEntity = (kind?: Kind): string =>
  kind === KIND_ALBUM ? ITUNES_ENTITY_ALBUM : ITUNES_ENTITY_SONG

export const odesliUrl = (link: string): string =>
  withParams(ODESLI_API_URL, { [ODESLI_COUNTRY_PARAM]: ODESLI_COUNTRY, [URL_PARAM]: link })

export function fromOdesli(body: OdesliResponse): Lookup {
  const entity = body.entityUniqueId ? body.entitiesByUniqueId?.[body.entityUniqueId] : undefined
  const platformLinks = body.linksByPlatform
  return {
    title: entity?.title,
    artist: entity?.artistName,
    art: entity?.thumbnailUrl,
    links: {
      apple: platformLinks?.appleMusic?.url,
      spotify: platformLinks?.spotify?.url,
      ytm: platformLinks?.youtubeMusic?.url,
    },
  }
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
  withParams(SPOTIFY_OEMBED_URL, { [URL_PARAM]: link })

export function resolveSpotifyShortLink(oembed: SpotifyOembed): ParsedLink | null {
  const match = (oembed.iframe_url || oembed.html || '').match(SPOTIFY_EMBED_RE)
  if (!match) return null
  const kind = match[1] as Kind
  const id = match[2]
  return { src: PLATFORM_SPOTIFY, kind, id, link: canonicalSpotifyLink(kind, id) }
}

export const itunesSearchUrl = (title: string, kind?: Kind): string =>
  withParams(ITUNES_SEARCH_URL, {
    [ITUNES_TERM_PARAM]: title,
    [ITUNES_ENTITY_PARAM]: itunesEntity(kind),
    [ITUNES_LIMIT_PARAM]: String(ITUNES_SEARCH_LIMIT),
    [ITUNES_COUNTRY_PARAM]: ITUNES_COUNTRY,
  })

export function fromSpotifyFallback(
  oembed: SpotifyOembed,
  itunesBody: ItunesResponse | null,
  p: ParsedLink,
): Lookup {
  const alts: AppleAlt[] = (itunesBody?.results || []).map((r) => ({
    title: r.trackName || r.collectionName || '',
    artist: r.artistName,
    url: (r.trackViewUrl || r.collectionViewUrl || '')
      .replace(ITUNES_HOST, APPLE_MUSIC_HOST)
      .split(ITUNES_TRACKING_PARAM)[0],
  }))
  const top = alts[0]
  return {
    title: oembed.title,
    artist: top?.artist || '',
    art: oembed.thumbnail_url,
    links: { spotify: p.link, apple: top?.url },
    alts,
  }
}
