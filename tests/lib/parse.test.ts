import { describe, expect, it } from 'vitest'
import { canonicalSpotifyLink, parseLink } from '../../src/lib/parse'
import { APPLE_ALBUM, APPLE_TRACK, SPOTIFY_ALBUM, SPOTIFY_TRACK } from '../support/cases'

const TRACK_ID = SPOTIFY_TRACK.id!
const ALBUM_ID = SPOTIFY_ALBUM.id!

describe('parseLink', () => {
  it('returns null for text that is not a URL', () => {
    expect(parseLink('bohemian rhapsody')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parseLink('')).toBeNull()
  })

  it('returns null for whitespace only', () => {
    expect(parseLink('   ')).toBeNull()
  })

  it('trims surrounding whitespace before parsing', () => {
    expect(parseLink(`  https://open.spotify.com/track/${TRACK_ID}\n`)).toEqual(SPOTIFY_TRACK)
  })

  it('turns a Spotify track link into a canonical link without the query string', () => {
    expect(parseLink(`https://open.spotify.com/track/${TRACK_ID}?si=8a1f2b3c4d5e6f70`)).toEqual(SPOTIFY_TRACK)
  })

  it('turns a Spotify album link into a canonical album link', () => {
    expect(parseLink(`https://open.spotify.com/album/${ALBUM_ID}?si=abc`)).toEqual(SPOTIFY_ALBUM)
  })

  it('drops a locale segment from a Spotify link', () => {
    expect(parseLink(`https://open.spotify.com/intl-de/track/${TRACK_ID}?si=x`)).toEqual(SPOTIFY_TRACK)
  })

  it('canonicalizes a link from another spotify.com subdomain to open.spotify.com', () => {
    expect(parseLink(`https://play.spotify.com/track/${TRACK_ID}`)).toEqual(SPOTIFY_TRACK)
  })

  it('returns a spotify.link short link as-is with no kind or id', () => {
    const parsed = parseLink('https://spotify.link/AbCdEf12345')
    expect(parsed).toEqual({ src: 'spotify', link: 'https://spotify.link/AbCdEf12345' })
    expect(parsed?.kind).toBeUndefined()
    expect(parsed?.id).toBeUndefined()
  })

  it('returns null for a Spotify playlist link', () => {
    expect(parseLink('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')).toBeNull()
  })

  it('returns null for a Spotify artist link', () => {
    expect(parseLink('https://open.spotify.com/artist/1dfeR4HaWDbWqFHLkxsg1d')).toBeNull()
  })

  it('returns null for a host that only ends in "spotify.com"', () => {
    expect(parseLink(`https://notspotify.com/track/${TRACK_ID}`)).toBeNull()
  })

  it('parses an Apple album link with ?i= as a track identified by the i param', () => {
    expect(
      parseLink('https://music.apple.com/us/album/bohemian-rhapsody/1440806041?i=1440806768'),
    ).toEqual(APPLE_TRACK)
  })

  it('keeps only the i param in an Apple track link', () => {
    expect(
      parseLink(
        'https://music.apple.com/us/album/bohemian-rhapsody/1440806041?i=1440806768&uo=4&ls=1',
      )?.link,
    ).toBe('https://music.apple.com/us/album/bohemian-rhapsody/1440806041?i=1440806768')
  })

  it('parses an Apple /song/ link as a track identified by the last path segment', () => {
    expect(parseLink('https://music.apple.com/us/song/bohemian-rhapsody/1440806768')).toEqual({
      src: 'apple',
      kind: 'track',
      id: '1440806768',
      slug: 'bohemian rhapsody',
      link: 'https://music.apple.com/us/song/bohemian-rhapsody/1440806768',
    })
  })

  it('parses an Apple album link as an album and drops its query string', () => {
    expect(
      parseLink('https://music.apple.com/us/album/a-night-at-the-opera-2011-remaster/1440806041?ls=1'),
    ).toEqual(APPLE_ALBUM)
  })

  it('returns null for an Apple artist link', () => {
    expect(parseLink('https://music.apple.com/us/artist/queen/3296287')).toBeNull()
  })

  it('returns null for an Apple link on a host other than music.apple.com', () => {
    expect(
      parseLink('https://itunes.apple.com/us/album/bohemian-rhapsody/1440806041?i=1440806768'),
    ).toBeNull()
  })

  it('returns null for an unrelated host', () => {
    expect(parseLink('https://music.youtube.com/watch?v=fJ9rUzIMcZQ')).toBeNull()
  })
})

describe('canonicalSpotifyLink', () => {
  it('builds an open.spotify.com track link', () => {
    expect(canonicalSpotifyLink('track', TRACK_ID)).toBe(`https://open.spotify.com/track/${TRACK_ID}`)
  })

  it('builds an open.spotify.com album link', () => {
    expect(canonicalSpotifyLink('album', ALBUM_ID)).toBe(`https://open.spotify.com/album/${ALBUM_ID}`)
  })
})
