import {
  APPLE_ALBUM_SEGMENT,
  APPLE_MUSIC_HOST,
  APPLE_SONG_PARAM,
  APPLE_SONG_SEGMENT,
  KIND_ALBUM,
  KIND_TRACK,
  PATH_SEPARATOR,
  PLATFORM_APPLE,
  PLATFORM_SPOTIFY,
  SLUG_SEPARATOR_RE,
  SPOTIFY_HOST_RE,
  SPOTIFY_ORIGIN,
  SPOTIFY_SHORT_HOST,
  WORD_SEPARATOR,
} from '../constants'
import type { Kind, ParsedLink } from './types'

const isKind = (segment: string): segment is Kind =>
  segment === KIND_TRACK || segment === KIND_ALBUM

export const canonicalSpotifyLink = (kind: Kind, id: string): string =>
  [SPOTIFY_ORIGIN, kind, id].join(PATH_SEPARATOR)

export const spotifyParsedLink = (kind: Kind, id: string): ParsedLink => ({
  src: PLATFORM_SPOTIFY,
  kind,
  id,
  link: canonicalSpotifyLink(kind, id),
})

function parseSpotify(u: URL, parts: string[]): ParsedLink | null {
  const i = parts.findIndex(isKind)
  if (i < 0) {
    return u.hostname.endsWith(SPOTIFY_SHORT_HOST) ? { src: PLATFORM_SPOTIFY, link: u.href } : null
  }
  return spotifyParsedLink(parts[i] as Kind, parts[i + 1])
}

function parseApple(u: URL, parts: string[]): ParsedLink | null {
  const song = u.searchParams.get(APPLE_SONG_PARAM)
  const kind: Kind | null =
    song || parts.includes(APPLE_SONG_SEGMENT)
      ? KIND_TRACK
      : parts.includes(APPLE_ALBUM_SEGMENT)
        ? KIND_ALBUM
        : null
  if (!kind) return null
  const id = song || parts[parts.length - 1]
  const slug = (parts[parts.length - 2] || '').replace(SLUG_SEPARATOR_RE, WORD_SEPARATOR)
  const link = new URL(u.origin + u.pathname)
  if (song) link.searchParams.set(APPLE_SONG_PARAM, song)
  return { src: PLATFORM_APPLE, kind, id, slug, link: link.href }
}

export function parseLink(raw: string): ParsedLink | null {
  let u: URL
  try {
    u = new URL(raw.trim())
  } catch {
    return null
  }
  const parts = u.pathname.split(PATH_SEPARATOR).filter(Boolean)
  if (SPOTIFY_HOST_RE.test(u.hostname)) return parseSpotify(u, parts)
  if (u.hostname === APPLE_MUSIC_HOST) return parseApple(u, parts)
  return null
}
