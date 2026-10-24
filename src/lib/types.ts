import type {
  KIND_ALBUM,
  KIND_TRACK,
  PLATFORM_APPLE,
  PLATFORM_SPOTIFY,
  PLATFORMS,
} from '../constants'

export type Platform = (typeof PLATFORMS)[number]['key']
export type Kind = typeof KIND_TRACK | typeof KIND_ALBUM

// A Spotify short link has no kind or id until it is resolved.
export type ParsedLink = {
  src: typeof PLATFORM_SPOTIFY | typeof PLATFORM_APPLE
  kind?: Kind
  id?: string
  slug?: string
  link: string
}

export type AppleAlt = { title: string; artist: string; url: string }

export type Lookup = {
  title?: string
  artist?: string
  art?: string
  links: Partial<Record<Platform, string>>
  alts?: AppleAlt[]
}

export type Conversion = Lookup & {
  links: Record<Platform, string>
  exact: Record<Platform, boolean>
}

// Response shapes below list only the fields the mappers read.

type OdesliEntity = { title?: string; artistName?: string; thumbnailUrl?: string }
type OdesliPlatformLink = { url: string }

export type OdesliResponse = {
  entityUniqueId?: string
  entitiesByUniqueId?: Record<string, OdesliEntity>
  linksByPlatform?: {
    appleMusic?: OdesliPlatformLink
    spotify?: OdesliPlatformLink
    youtubeMusic?: OdesliPlatformLink
  }
}

type ItunesResult = {
  trackName?: string
  collectionName?: string
  artistName?: string
  artworkUrl100?: string
  trackViewUrl?: string
  collectionViewUrl?: string
}

export type ItunesResponse = { results?: ItunesResult[] }

export type SpotifyOembed = {
  title?: string
  thumbnail_url?: string
  iframe_url?: string
  html?: string
}
