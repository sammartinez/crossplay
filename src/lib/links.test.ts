import { describe, expect, it } from 'vitest'
import { canonicalSpotifyLink, parseLink, searchUrl, withSearchFallbacks } from './links'
import type { Lookup } from './types'

const TRACK_ID = '4u7EnebtmKWzUH433cf5Qv'
const ALBUM_ID = '1GbtB4zTqAsyfZEsm1RZfx'

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
    expect(parseLink(`  https://open.spotify.com/track/${TRACK_ID}\n`)).toEqual({
      src: 'spotify',
      kind: 'track',
      id: TRACK_ID,
      link: `https://open.spotify.com/track/${TRACK_ID}`,
    })
  })

  it('turns a Spotify track link into a canonical link without the query string', () => {
    expect(parseLink(`https://open.spotify.com/track/${TRACK_ID}?si=8a1f2b3c4d5e6f70`)).toEqual({
      src: 'spotify',
      kind: 'track',
      id: TRACK_ID,
      link: `https://open.spotify.com/track/${TRACK_ID}`,
    })
  })

  it('turns a Spotify album link into a canonical album link', () => {
    expect(parseLink(`https://open.spotify.com/album/${ALBUM_ID}?si=abc`)).toEqual({
      src: 'spotify',
      kind: 'album',
      id: ALBUM_ID,
      link: `https://open.spotify.com/album/${ALBUM_ID}`,
    })
  })

  it('drops a locale segment from a Spotify link', () => {
    expect(parseLink(`https://open.spotify.com/intl-de/track/${TRACK_ID}?si=x`)).toEqual({
      src: 'spotify',
      kind: 'track',
      id: TRACK_ID,
      link: `https://open.spotify.com/track/${TRACK_ID}`,
    })
  })

  it('canonicalizes a link from another spotify.com subdomain to open.spotify.com', () => {
    expect(parseLink(`https://play.spotify.com/track/${TRACK_ID}`)).toEqual({
      src: 'spotify',
      kind: 'track',
      id: TRACK_ID,
      link: `https://open.spotify.com/track/${TRACK_ID}`,
    })
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
    ).toEqual({
      src: 'apple',
      kind: 'track',
      id: '1440806768',
      slug: 'bohemian rhapsody',
      link: 'https://music.apple.com/us/album/bohemian-rhapsody/1440806041?i=1440806768',
    })
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
    ).toEqual({
      src: 'apple',
      kind: 'album',
      id: '1440806041',
      slug: 'a night at the opera 2011 remaster',
      link: 'https://music.apple.com/us/album/a-night-at-the-opera-2011-remaster/1440806041',
    })
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

describe('searchUrl', () => {
  it('builds a Spotify search URL with the query URI-encoded', () => {
    expect(searchUrl('spotify', 'Bohemian Rhapsody Queen')).toBe(
      'https://open.spotify.com/search/Bohemian%20Rhapsody%20Queen',
    )
  })

  it('builds an Apple Music search URL with the query URI-encoded', () => {
    expect(searchUrl('apple', 'Bohemian Rhapsody Queen')).toBe(
      'https://music.apple.com/us/search?term=Bohemian%20Rhapsody%20Queen',
    )
  })

  it('builds a YouTube Music search URL with the query URI-encoded', () => {
    expect(searchUrl('ytm', 'Bohemian Rhapsody Queen')).toBe(
      'https://music.youtube.com/search?q=Bohemian%20Rhapsody%20Queen',
    )
  })

  it('encodes reserved characters in the query', () => {
    expect(searchUrl('ytm', 'Highway to Hell AC/DC & co?')).toBe(
      'https://music.youtube.com/search?q=Highway%20to%20Hell%20AC%2FDC%20%26%20co%3F',
    )
  })
})

describe('withSearchFallbacks', () => {
  const exactLinks = {
    apple: 'https://music.apple.com/us/album/bohemian-rhapsody/1440806041?i=1440806768',
    spotify: `https://open.spotify.com/track/${TRACK_ID}`,
    ytm: 'https://music.youtube.com/watch?v=fJ9rUzIMcZQ',
  }

  it('keeps every given link and marks all of them exact', () => {
    const result = withSearchFallbacks({ title: 'Bohemian Rhapsody', artist: 'Queen', links: exactLinks })
    expect(result.links).toEqual(exactLinks)
    expect(result.exact).toEqual({ apple: true, spotify: true, ytm: true })
  })

  it('fills missing links with a search for "title artist" and marks them not exact', () => {
    const result = withSearchFallbacks({
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      links: { spotify: exactLinks.spotify },
    })
    expect(result.links).toEqual({
      spotify: exactLinks.spotify,
      apple: 'https://music.apple.com/us/search?term=Bohemian%20Rhapsody%20Queen',
      ytm: 'https://music.youtube.com/search?q=Bohemian%20Rhapsody%20Queen',
    })
    expect(result.exact).toEqual({ apple: false, spotify: true, ytm: false })
  })

  it('searches for the title alone when the artist is empty', () => {
    const result = withSearchFallbacks({
      title: 'Bohemian Rhapsody',
      artist: '',
      links: { apple: exactLinks.apple },
    })
    expect(result.links.spotify).toBe('https://open.spotify.com/search/Bohemian%20Rhapsody')
    expect(result.links.ytm).toBe('https://music.youtube.com/search?q=Bohemian%20Rhapsody')
  })

  it('searches for the title alone when the artist is missing', () => {
    const result = withSearchFallbacks({ title: 'Bohemian Rhapsody', links: {} })
    expect(result.links.apple).toBe('https://music.apple.com/us/search?term=Bohemian%20Rhapsody')
  })

  it('keeps the title, artist, artwork and alternates', () => {
    const alts = [{ title: 'Bohemian Rhapsody', artist: 'Queen', url: exactLinks.apple }]
    const result = withSearchFallbacks({
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      art: 'https://i.scdn.co/image/ab67616d0000b273ce4f1737bc8a646c8c4bd25a',
      links: { spotify: exactLinks.spotify },
      alts,
    })
    expect(result.title).toBe('Bohemian Rhapsody')
    expect(result.artist).toBe('Queen')
    expect(result.art).toBe('https://i.scdn.co/image/ab67616d0000b273ce4f1737bc8a646c8c4bd25a')
    expect(result.alts).toEqual(alts)
  })

  it('does not mutate the lookup it is given', () => {
    const lookup: Lookup = { title: 'Bohemian Rhapsody', artist: 'Queen', links: { spotify: exactLinks.spotify } }
    const before = structuredClone(lookup)
    const result = withSearchFallbacks(lookup)
    expect(lookup).toEqual(before)
    expect(lookup).not.toHaveProperty('exact')
    expect(result).not.toBe(lookup)
    expect(result.links).not.toBe(lookup.links)
  })
})
