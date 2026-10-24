import { describe, expect, it } from 'vitest'
import {
  fromItunesLookup,
  fromSpotifyFallback,
  itunesLookupUrl,
  itunesSearchUrl,
  resolveSpotifyShortLink,
  spotifyOembedUrl,
} from '../../src/lib/lookup'
import type { ParsedLink } from '../../src/lib/types'
import { fixture } from '../support/fixtures'

const SPOTIFY_TRACK: ParsedLink = {
  src: 'spotify',
  kind: 'track',
  id: '4u7EnebtmKWzUH433cf5Qv',
  link: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv',
}
const SPOTIFY_ALBUM: ParsedLink = {
  src: 'spotify',
  kind: 'album',
  id: '1GbtB4zTqAsyfZEsm1RZfx',
  link: 'https://open.spotify.com/album/1GbtB4zTqAsyfZEsm1RZfx',
}
const APPLE_TRACK: ParsedLink = {
  src: 'apple',
  kind: 'track',
  id: '1440806768',
  slug: 'bohemian rhapsody',
  link: 'https://music.apple.com/us/album/bohemian-rhapsody/1440806041?i=1440806768',
}
const APPLE_ALBUM: ParsedLink = {
  src: 'apple',
  kind: 'album',
  id: '1440806041',
  slug: 'a night at the opera 2011 remaster',
  link: 'https://music.apple.com/us/album/a-night-at-the-opera-2011-remaster/1440806041',
}

const ARTWORK_100 =
  'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/27/0d/0e/270d0e2b/source/100x100bb.jpg'
const ARTWORK_300 =
  'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/27/0d/0e/270d0e2b/source/300x300bb.jpg'
const OEMBED_THUMB =
  'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02ce4f1737bc8a646c8c4bd25a'

describe('itunesLookupUrl', () => {
  it('looks up a track by id with entity=song in the US store', () => {
    const url = new URL(itunesLookupUrl(APPLE_TRACK))
    expect(url.origin + url.pathname).toBe('https://itunes.apple.com/lookup')
    expect(url.searchParams.get('id')).toBe('1440806768')
    expect(url.searchParams.get('entity')).toBe('song')
    expect(url.searchParams.get('country')).toBe('us')
  })

  it('looks up an album by id with entity=album', () => {
    const url = new URL(itunesLookupUrl(APPLE_ALBUM))
    expect(url.searchParams.get('id')).toBe('1440806041')
    expect(url.searchParams.get('entity')).toBe('album')
  })
})

describe('fromItunesLookup', () => {
  it('maps the track name, artist and upsized artwork, and keeps the Apple link', () => {
    expect(fromItunesLookup(fixture('itunes-lookup-song.json'), APPLE_TRACK)).toEqual({
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      art: ARTWORK_300,
      links: { apple: APPLE_TRACK.link },
    })
  })

  it('upsizes the artwork from 100x100 to 300x300', () => {
    const lookup = fromItunesLookup(fixture('itunes-lookup-song.json'), APPLE_TRACK)
    expect(lookup.art).not.toBe(ARTWORK_100)
    expect(lookup.art).toBe(ARTWORK_300)
  })

  it('falls back to the collection name when there is no track name', () => {
    const lookup = fromItunesLookup(fixture('itunes-lookup-album.json'), APPLE_ALBUM)
    expect(lookup.title).toBe('A Night At The Opera (2011 Remaster)')
    expect(lookup.artist).toBe('Queen')
    expect(lookup.links).toEqual({ apple: APPLE_ALBUM.link })
  })

  it('falls back to the title-cased slug, an empty artist and no art when there are no results', () => {
    expect(fromItunesLookup(fixture('itunes-lookup-empty.json'), APPLE_TRACK)).toEqual({
      title: 'Bohemian Rhapsody',
      artist: '',
      art: undefined,
      links: { apple: APPLE_TRACK.link },
    })
  })

  it('handles a null body the same as no results', () => {
    expect(fromItunesLookup(null, APPLE_ALBUM)).toEqual({
      title: 'A Night At The Opera 2011 Remaster',
      artist: '',
      art: undefined,
      links: { apple: APPLE_ALBUM.link },
    })
  })
})

describe('spotifyOembedUrl', () => {
  it('points at the Spotify oEmbed endpoint with the link as the url param', () => {
    const url = new URL(spotifyOembedUrl('https://spotify.link/AbCdEf12345'))
    expect(url.origin + url.pathname).toBe('https://open.spotify.com/oembed')
    expect(url.searchParams.get('url')).toBe('https://spotify.link/AbCdEf12345')
  })
})

describe('resolveSpotifyShortLink', () => {
  it('reads the track from the oEmbed iframe_url and returns a canonical parsed link', () => {
    expect(resolveSpotifyShortLink(fixture('spotify-oembed-track.json'))).toEqual(SPOTIFY_TRACK)
  })

  it('resolves an album embed to a canonical album link', () => {
    expect(resolveSpotifyShortLink(fixture('spotify-oembed-album.json'))).toEqual(SPOTIFY_ALBUM)
  })

  it('falls back to the oEmbed html when iframe_url is missing', () => {
    expect(resolveSpotifyShortLink(fixture('spotify-oembed-html-only.json'))).toEqual(SPOTIFY_TRACK)
  })

  it('returns null when the embed is not a track or album', () => {
    expect(resolveSpotifyShortLink(fixture('spotify-oembed-playlist.json'))).toBeNull()
  })

  it('returns null when the oEmbed has neither iframe_url nor html', () => {
    expect(resolveSpotifyShortLink(fixture('spotify-oembed-no-player.json'))).toBeNull()
  })
})

describe('itunesSearchUrl', () => {
  it('searches songs by title, limited to 5 results in the US store', () => {
    const url = new URL(itunesSearchUrl('Bohemian Rhapsody - Remastered 2011', 'track'))
    expect(url.origin + url.pathname).toBe('https://itunes.apple.com/search')
    expect(url.searchParams.get('term')).toBe('Bohemian Rhapsody - Remastered 2011')
    expect(url.searchParams.get('entity')).toBe('song')
    expect(url.searchParams.get('limit')).toBe('5')
    expect(url.searchParams.get('country')).toBe('us')
  })

  it('searches albums when the kind is album', () => {
    const url = new URL(itunesSearchUrl('A Night At The Opera (2011 Remaster)', 'album'))
    expect(url.searchParams.get('entity')).toBe('album')
  })

  it('searches songs when no kind is given', () => {
    const url = new URL(itunesSearchUrl('Bohemian Rhapsody'))
    expect(url.searchParams.get('entity')).toBe('song')
  })

  it('encodes the title so reserved characters stay in the term', () => {
    const url = new URL(itunesSearchUrl('Rock & Roll? #1', 'track'))
    expect(url.searchParams.get('term')).toBe('Rock & Roll? #1')
    expect(url.searchParams.get('entity')).toBe('song')
  })
})

describe('fromSpotifyFallback', () => {
  // The reported case: oEmbed has no artist, and the iTunes
  // title search returns several artists.
  const REPORTED: ParsedLink = {
    src: 'spotify',
    kind: 'track',
    id: '1yQDTSOyfVTCt9XWKQcnXb',
    link: 'https://open.spotify.com/track/1yQDTSOyfVTCt9XWKQcnXb',
  }
  const REPORTED_THUMB =
    'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02a1b2c3d4e5f60718293a4b5c'
  const REPORTED_CANDIDATES = [
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
  const reported = () =>
    fromSpotifyFallback(
      fixture('spotify-oembed-aint-gettin-high.json'),
      fixture('itunes-search-aint-gettin-high.json'),
      REPORTED,
    )

  // One iTunes song result with only the fields the mapper reads.
  const song = (artistName: string, trackName: string, trackViewUrl: string) => ({
    artistName,
    trackName,
    trackViewUrl,
    collectionViewUrl: trackViewUrl,
  })

  it('takes the title and artwork from oEmbed and the Spotify link from the parsed link', () => {
    const lookup = reported()
    expect(lookup.title).toBe("Ain't Gettin' High")
    expect(lookup.art).toBe(REPORTED_THUMB)
    expect(lookup.links.spotify).toBe(REPORTED.link)
  })

  it('leaves the artist blank in the reported case instead of using the top iTunes hit', () => {
    expect(reported().artist).toBe('')
  })

  it('gives no Apple link in the reported case, only the Spotify link', () => {
    expect(reported().links).toEqual({ spotify: REPORTED.link })
  })

  it('returns the oEmbed title and art, a blank artist, the Spotify link and the candidates', () => {
    expect(reported()).toEqual({
      title: "Ain't Gettin' High",
      artist: '',
      art: REPORTED_THUMB,
      links: { spotify: REPORTED.link },
      candidates: REPORTED_CANDIDATES,
    })
  })

  it('offers one candidate per artist in first-appearance order in the reported case', () => {
    expect(reported().candidates).toEqual(REPORTED_CANDIDATES)
  })

  it("keeps each artist's first result, not a later release or live version", () => {
    const neon = reported().candidates?.find((c) => c.artist === 'The Neon Prairie Dogs')
    expect(neon?.title).toBe("Ain't Gettin' High")
    expect(neon?.url).toBe(
      'https://music.apple.com/us/album/aint-gettin-high/1601234567?i=1601234571',
    )
  })

  it('rewrites candidate URLs to music.apple.com and strips &uo=', () => {
    for (const { url } of reported().candidates ?? []) {
      expect(new URL(url).hostname).toBe('music.apple.com')
      expect(url).not.toContain('uo=')
    }
  })

  it('treats artist names that differ only in case or surrounding spaces as one artist', () => {
    const lookup = fromSpotifyFallback(
      fixture('spotify-oembed-track.json'),
      {
        results: [
          song('Queen', 'Bohemian Rhapsody', 'https://itunes.apple.com/us/album/a/1?i=11&uo=4'),
          song(' queen ', 'Bohemian Rhapsody (Live)', 'https://itunes.apple.com/us/album/b/2?i=22&uo=4'),
          song('QUEEN', 'Bohemian Rhapsody (Demo)', 'https://itunes.apple.com/us/album/c/3?i=33&uo=4'),
          song('The Petersens', 'Bohemian Rhapsody', 'https://itunes.apple.com/us/album/d/4?i=44&uo=4'),
        ],
      },
      SPOTIFY_TRACK,
    )
    expect(lookup.candidates).toEqual([
      { artist: 'Queen', title: 'Bohemian Rhapsody', url: 'https://music.apple.com/us/album/a/1?i=11' },
      {
        artist: 'The Petersens',
        title: 'Bohemian Rhapsody',
        url: 'https://music.apple.com/us/album/d/4?i=44',
      },
    ])
  })

  it('skips results with an empty artist name', () => {
    const lookup = fromSpotifyFallback(
      fixture('spotify-oembed-track.json'),
      {
        results: [
          song('', 'Bohemian Rhapsody', 'https://itunes.apple.com/us/album/a/1?i=11&uo=4'),
          song('Queen', 'Bohemian Rhapsody', 'https://itunes.apple.com/us/album/b/2?i=22&uo=4'),
        ],
      },
      SPOTIFY_TRACK,
    )
    expect(lookup.candidates).toEqual([
      { artist: 'Queen', title: 'Bohemian Rhapsody', url: 'https://music.apple.com/us/album/b/2?i=22' },
    ])
  })

  it('skips results with no Apple URL', () => {
    const lookup = fromSpotifyFallback(
      fixture('spotify-oembed-track.json'),
      {
        results: [
          { artistName: 'Queen', trackName: 'Bohemian Rhapsody' },
          song('The Petersens', 'Bohemian Rhapsody', 'https://itunes.apple.com/us/album/b/2?i=22&uo=4'),
        ],
      },
      SPOTIFY_TRACK,
    )
    expect(lookup.candidates).toEqual([
      {
        artist: 'The Petersens',
        title: 'Bohemian Rhapsody',
        url: 'https://music.apple.com/us/album/b/2?i=22',
      },
    ])
  })

  it('uses the collection name and collection URL for album candidates', () => {
    const lookup = fromSpotifyFallback(
      fixture('spotify-oembed-album.json'),
      fixture('itunes-search-albums.json'),
      SPOTIFY_ALBUM,
    )
    expect(lookup.candidates).toEqual([
      {
        artist: 'Queen',
        title: 'A Night At The Opera (2011 Remaster)',
        url: 'https://music.apple.com/us/album/a-night-at-the-opera-2011-remaster/1440806041',
      },
    ])
    expect(lookup.artist).toBe('')
    expect(lookup.links).toEqual({ spotify: SPOTIFY_ALBUM.link })
  })

  it('gives a blank artist, no Apple link and no candidates when the search finds nothing', () => {
    const lookup = fromSpotifyFallback(
      fixture('spotify-oembed-track.json'),
      fixture('itunes-search-empty.json'),
      SPOTIFY_TRACK,
    )
    expect(lookup.title).toBe('Bohemian Rhapsody - Remastered 2011')
    expect(lookup.art).toBe(OEMBED_THUMB)
    expect(lookup.artist).toBe('')
    expect(lookup.links).toEqual({ spotify: SPOTIFY_TRACK.link })
    expect(lookup.candidates ?? []).toEqual([])
  })

  it('handles a null iTunes body the same as no results', () => {
    const lookup = fromSpotifyFallback(fixture('spotify-oembed-track.json'), null, SPOTIFY_TRACK)
    expect(lookup.artist).toBe('')
    expect(lookup.links).toEqual({ spotify: SPOTIFY_TRACK.link })
    expect(lookup.candidates ?? []).toEqual([])
  })
})
