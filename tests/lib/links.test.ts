import { describe, expect, it } from 'vitest'
import {
  canonicalSpotifyLink,
  parseLink,
  searchUrl,
  withArtistChoice,
  withSearchFallbacks,
} from '../../src/lib/links'
import type { ArtistCandidate, Lookup } from '../../src/lib/types'

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

  it('keeps the title, artist, artwork and artist candidates', () => {
    const candidates = [{ artist: 'Queen', title: 'Bohemian Rhapsody', url: exactLinks.apple }]
    const result = withSearchFallbacks({
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      art: 'https://i.scdn.co/image/ab67616d0000b273ce4f1737bc8a646c8c4bd25a',
      links: { spotify: exactLinks.spotify },
      candidates,
    })
    expect(result.title).toBe('Bohemian Rhapsody')
    expect(result.artist).toBe('Queen')
    expect(result.art).toBe('https://i.scdn.co/image/ab67616d0000b273ce4f1737bc8a646c8c4bd25a')
    expect(result.candidates).toEqual(candidates)
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

describe('withArtistChoice', () => {
  // The reported Spotify fallback: no artist, Spotify exact, Apple and
  // YouTube Music searches for the title alone.
  const SPOTIFY_LINK = 'https://open.spotify.com/track/1yQDTSOyfVTCt9XWKQcnXb'
  const ART = 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02a1b2c3d4e5f60718293a4b5c'
  const CANDIDATES: ArtistCandidate[] = [
    {
      artist: 'Samuel Cody Matson',
      title: "Ain't Gettin' High",
      url: 'https://music.apple.com/us/album/aint-gettin-high/1712345678?i=1712345680',
    },
    {
      artist: 'The Neon Prairie Dogs',
      title: "Ain't Gettin' High",
      url: 'https://music.apple.com/us/album/aint-gettin-high/1601234567?i=1601234571',
    },
    {
      artist: 'Zach Bryan',
      title: 'Younger Years',
      url: 'https://music.apple.com/us/album/younger-years/1640014741?i=1640014759',
    },
  ]
  const [MATSON, NEON] = CANDIDATES
  const fallback = () =>
    withSearchFallbacks({
      title: "Ain't Gettin' High",
      artist: '',
      art: ART,
      links: { spotify: SPOTIFY_LINK },
      candidates: CANDIDATES,
    })

  it("sets the artist to the candidate's artist", () => {
    expect(withArtistChoice(fallback(), NEON).artist).toBe('The Neon Prairie Dogs')
  })

  it("makes the candidate's URL the Apple link and marks it exact", () => {
    const result = withArtistChoice(fallback(), NEON)
    expect(result.links.apple).toBe(NEON.url)
    expect(result.exact.apple).toBe(true)
  })

  it('keeps the exact Spotify link', () => {
    const result = withArtistChoice(fallback(), NEON)
    expect(result.links.spotify).toBe(SPOTIFY_LINK)
    expect(result.exact.spotify).toBe(true)
  })

  it('rebuilds the YouTube Music search for "title artist" and keeps it not exact', () => {
    const result = withArtistChoice(fallback(), NEON)
    expect(result.links.ytm).toBe(
      "https://music.youtube.com/search?q=Ain't%20Gettin'%20High%20The%20Neon%20Prairie%20Dogs",
    )
    expect(result.exact.ytm).toBe(false)
  })

  it('keeps other exact links as they are', () => {
    const conversion = withSearchFallbacks({
      title: 'Song',
      artist: '',
      links: { spotify: SPOTIFY_LINK, ytm: 'https://music.youtube.com/watch?v=abc' },
      candidates: CANDIDATES,
    })
    const result = withArtistChoice(conversion, NEON)
    expect(result.links.ytm).toBe('https://music.youtube.com/watch?v=abc')
    expect(result.exact).toEqual({ apple: true, spotify: true, ytm: true })
  })

  it('keeps the title, artwork and candidates in the same order', () => {
    const result = withArtistChoice(fallback(), NEON)
    expect(result.title).toBe("Ain't Gettin' High")
    expect(result.art).toBe(ART)
    expect(result.candidates).toEqual(CANDIDATES)
  })

  it('switches every chosen value when a second candidate is chosen', () => {
    const result = withArtistChoice(withArtistChoice(fallback(), NEON), MATSON)
    expect(result.artist).toBe('Samuel Cody Matson')
    expect(result.links.apple).toBe(MATSON.url)
    expect(result.exact.apple).toBe(true)
    expect(result.links.ytm).toBe(
      "https://music.youtube.com/search?q=Ain't%20Gettin'%20High%20Samuel%20Cody%20Matson",
    )
    expect(result.candidates).toEqual(CANDIDATES)
  })

  it('returns a new conversion and does not mutate the one it is given', () => {
    const conversion = fallback()
    const before = structuredClone(conversion)
    const result = withArtistChoice(conversion, NEON)
    expect(conversion).toEqual(before)
    expect(result).not.toBe(conversion)
  })
})
