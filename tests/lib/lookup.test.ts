import { describe, expect, it } from 'vitest'
import {
  fromItunesLookup,
  fromOdesli,
  fromSpotifyFallback,
  itunesLookupUrl,
  itunesSearchUrl,
  odesliHopUrl,
  odesliUrl,
  resolveSpotifyShortLink,
  spotifyOembedUrl,
  withHopLinks,
} from '../../src/lib/lookup'
import type { Lookup, OdesliResponse, ParsedLink } from '../../src/lib/types'
import { fixture, odesliEntityWith, odesliWithout, ytmDirtWith } from '../support/fixtures'

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

describe('odesliUrl', () => {
  it('points at the Odesli links endpoint with userCountry=US', () => {
    const url = new URL(odesliUrl(SPOTIFY_TRACK.link))
    expect(url.origin + url.pathname).toBe('https://api.song.link/v1-alpha.1/links')
    expect(url.searchParams.get('userCountry')).toBe('US')
  })

  it('passes the link as the url param, encoded so its own query survives', () => {
    const url = new URL(odesliUrl(APPLE_TRACK.link))
    expect(url.searchParams.get('url')).toBe(APPLE_TRACK.link)
    expect(url.searchParams.has('i')).toBe(false)
  })
})

describe('fromOdesli', () => {
  it('maps the entity title, artist and thumbnail and the three platform links', () => {
    expect(fromOdesli(fixture('odesli-track.json'))).toEqual({
      title: 'Bohemian Rhapsody - Remastered 2011',
      artist: 'Queen',
      art: 'https://i.scdn.co/image/ab67616d0000b273ce4f1737bc8a646c8c4bd25a',
      links: {
        apple:
          'https://geo.music.apple.com/us/album/_/1440806041?i=1440806768&mt=1&app=music&ls=1&at=1000lHKX&ct=api_http&itscg=30200&itsct=odsl_m',
        spotify: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv',
        ytm: 'https://music.youtube.com/watch?v=fJ9rUzIMcZQ',
      },
    })
  })

  it('gives undefined title, artist and art when the entity is missing', () => {
    const lookup = fromOdesli(fixture('odesli-partial.json'))
    expect(lookup.title).toBeUndefined()
    expect(lookup.artist).toBeUndefined()
    expect(lookup.art).toBeUndefined()
  })

  it('gives undefined for platforms that have no link', () => {
    const lookup = fromOdesli(fixture('odesli-partial.json'))
    expect(lookup.links.spotify).toBe('https://open.spotify.com/track/0000000000000000000000')
    expect(lookup.links.apple).toBeUndefined()
    expect(lookup.links.ytm).toBeUndefined()
  })

  it('does not throw on an empty body', () => {
    expect(() => fromOdesli(fixture('odesli-empty.json'))).not.toThrow()
    const lookup = fromOdesli(fixture('odesli-empty.json'))
    expect(lookup.title).toBeUndefined()
    expect(lookup.links.apple).toBeUndefined()
    expect(lookup.links.spotify).toBeUndefined()
    expect(lookup.links.ytm).toBeUndefined()
  })
})

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
  // The reported case: Odesli was down, oEmbed has no artist, and the iTunes
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

// PLAN-003 T1: one Odesli hop to fill missing platform links.
// From odesli-apple-dirt.json (the reported case) and odesli-ytm-dirt.json.
const DIRT_APPLE =
  'https://geo.music.apple.com/us/album/_/6811936164?i=6811936165&mt=1&app=music&ls=1&at=1000lHKX&ct=api_http&itscg=30200&itsct=odsl_m'
const DIRT_YTM = 'https://music.youtube.com/watch?v=PLCHLDRdirt'
const DIRT_YOUTUBE = 'https://www.youtube.com/watch?v=PLCHLDRdirt'
const DIRT_SPOTIFY = 'https://open.spotify.com/track/0PlaceholderDirtTrack0'
const DIRT_ART =
  'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/aa/bb/cc/aabbccdd-placeholder/source/512x512bb.jpg'

const HOP_SOURCE_URLS = {
  youtubeMusic: 'https://music.youtube.com/watch?v=hopYtMusic1',
  youtube: 'https://www.youtube.com/watch?v=hopYouTube01',
  deezer: 'https://www.deezer.com/track/1234567890',
  tidal: 'https://listen.tidal.com/track/123456789',
  amazonMusic: 'https://music.amazon.com/albums/B0PLACEHOLD?trackAsin=B0PLACETRAK',
}

const BODY_URLS: Record<string, string> = {
  ...HOP_SOURCE_URLS,
  appleMusic: DIRT_APPLE,
  spotify: DIRT_SPOTIFY,
}

// An Odesli body with a title and exactly the given platform links.
const odesliBody = (...platforms: string[]): OdesliResponse =>
  ({
    entityUniqueId: 'X',
    entitiesByUniqueId: { X: { title: 'Song', artistName: 'Band' } },
    linksByPlatform: Object.fromEntries(platforms.map((p) => [p, { url: BODY_URLS[p] }])),
  }) as OdesliResponse

describe('odesliHopUrl', () => {
  it("returns the Odesli URL for the YouTube Music link in the reported Apple response, which lacks Spotify", () => {
    expect(odesliHopUrl(fixture('odesli-apple-dirt.json'))).toBe(odesliUrl(DIRT_YTM))
  })

  it('returns the Odesli URL for the YouTube Music link when a Spotify response lacks Apple Music', () => {
    expect(odesliHopUrl(fixture('odesli-spotify-dirt-no-apple.json'))).toBe(odesliUrl(DIRT_YTM))
  })

  it('returns null when the response has Apple Music, Spotify and YouTube Music links', () => {
    expect(odesliHopUrl(fixture('odesli-track.json'))).toBeNull()
  })

  it('returns null when a platform is missing but there is no hop-source link', () => {
    expect(odesliHopUrl(fixture('odesli-partial.json'))).toBeNull()
  })

  it('returns null for an empty body', () => {
    expect(odesliHopUrl(fixture('odesli-empty.json'))).toBeNull()
  })

  it('prefers youtubeMusic over youtube, deezer, tidal and amazonMusic', () => {
    const body = odesliBody('appleMusic', 'amazonMusic', 'tidal', 'deezer', 'youtube', 'youtubeMusic')
    expect(odesliHopUrl(body)).toBe(odesliUrl(HOP_SOURCE_URLS.youtubeMusic))
  })

  it('uses youtube when there is no youtubeMusic link', () => {
    const body = odesliBody('appleMusic', 'amazonMusic', 'tidal', 'deezer', 'youtube')
    expect(odesliHopUrl(body)).toBe(odesliUrl(HOP_SOURCE_URLS.youtube))
  })

  it('uses the youtube link from the reported response when its youtubeMusic link is removed', () => {
    const body = odesliWithout<OdesliResponse>('odesli-apple-dirt.json', 'youtubeMusic')
    expect(odesliHopUrl(body)).toBe(odesliUrl(DIRT_YOUTUBE))
  })

  it('uses deezer when there is no YouTube link of either kind', () => {
    const body = odesliBody('appleMusic', 'amazonMusic', 'tidal', 'deezer')
    expect(odesliHopUrl(body)).toBe(odesliUrl(HOP_SOURCE_URLS.deezer))
  })

  it('uses tidal before amazonMusic', () => {
    const body = odesliBody('appleMusic', 'amazonMusic', 'tidal')
    expect(odesliHopUrl(body)).toBe(odesliUrl(HOP_SOURCE_URLS.tidal))
  })

  it('uses amazonMusic when it is the only hop-source link', () => {
    const body = odesliBody('appleMusic', 'amazonMusic')
    expect(odesliHopUrl(body)).toBe(odesliUrl(HOP_SOURCE_URLS.amazonMusic))
  })

  it('never uses the appleMusic or spotify link as the hop source', () => {
    expect(odesliHopUrl(odesliBody('appleMusic', 'spotify'))).toBeNull()
  })

  it('returns null when the reported response has no YouTube links either', () => {
    const body = odesliWithout<OdesliResponse>('odesli-apple-dirt.json', 'youtubeMusic', 'youtube')
    expect(odesliHopUrl(body)).toBeNull()
  })

  it('hops when only YouTube Music is missing and another hop source exists', () => {
    const body = odesliBody('appleMusic', 'spotify', 'deezer')
    expect(odesliHopUrl(body)).toBe(odesliUrl(HOP_SOURCE_URLS.deezer))
  })
})

// PLAN-003 AC3 (amended, escalation ruling): withHopLinks takes the raw hop
// body and fills a platform only when the entity behind that platform's link
// is the same song as the first lookup, never judged by the hop's main entity.
describe('withHopLinks', () => {
  const first = () => fromOdesli(fixture('odesli-apple-dirt.json'))
  const ytmDirt = () => fixture<OdesliResponse>('odesli-ytm-dirt.json')
  const mismatchHop = () => fixture<OdesliResponse>('odesli-ytm-dirt-mismatch.json')
  const SPOTIFY_ENTITY = 'SPOTIFY_SONG::0PlaceholderDirtTrack0'
  const LIVE_SPOTIFY_ENTITY = 'SPOTIFY_SONG::0PlaceholderDirtLive00'
  const LIVE_SPOTIFY = 'https://open.spotify.com/track/0PlaceholderDirtLive00'

  it('fills the Spotify link the first lookup lacks from the hop', () => {
    const merged = withHopLinks(first(), ytmDirt())
    expect(merged.links).toEqual({ apple: DIRT_APPLE, spotify: DIRT_SPOTIFY, ytm: DIRT_YTM })
  })

  // The hop's main entity is the YouTube video, whose artist is the channel
  // "Placeholder Artist - Topic"; the Spotify link's entity is the song itself.
  it('fills Spotify when the main entity artist is a "- Topic" channel but the Spotify link\'s entity matches', () => {
    const hop = ytmDirt()
    expect(hop.entitiesByUniqueId?.[hop.entityUniqueId!]?.artistName).toBe('Placeholder Artist - Topic')
    expect(withHopLinks(first(), hop).links.spotify).toBe(DIRT_SPOTIFY)
  })

  it('fills nothing when the main entity matches but the Spotify link\'s entity is "Dirt (Live)"', () => {
    const hop = ytmDirtWith<OdesliResponse>({ title: 'Dirt (Live)' }, SPOTIFY_ENTITY)
    expect(withHopLinks(first(), hop)).toEqual(first())
  })

  it('keeps the first Apple Music and YouTube Music links when the hop has different ones', () => {
    const hop = odesliEntityWith<OdesliResponse>(
      'odesli-ytm-dirt-mismatch.json',
      { title: 'Dirt', artistName: 'Placeholder Artist' },
      LIVE_SPOTIFY_ENTITY,
    )
    const merged = withHopLinks(first(), hop)
    expect(merged.links).toEqual({ apple: DIRT_APPLE, spotify: LIVE_SPOTIFY, ytm: DIRT_YTM })
  })

  it("keeps the first lookup's title, artist and art when the hop's differ in case and art", () => {
    const hop = ytmDirtWith<OdesliResponse>({ title: 'DIRT', artistName: 'placeholder artist' })
    const merged = withHopLinks(first(), hop)
    expect(merged.title).toBe('Dirt')
    expect(merged.artist).toBe('Placeholder Artist')
    expect(merged.art).toBe(DIRT_ART)
  })

  it('fills nothing from a hop for a different song (odesli-ytm-dirt-mismatch.json)', () => {
    expect(withHopLinks(first(), mismatchHop())).toEqual(first())
  })

  it("keeps the first lookup's title, artist and art when the hop is for a different song", () => {
    const merged = withHopLinks(first(), mismatchHop())
    expect(merged.title).toBe('Dirt')
    expect(merged.artist).toBe('Placeholder Artist')
    expect(merged.art).toBe(DIRT_ART)
  })

  it('fills nothing when the hop title differs, even with the same artist', () => {
    const hop = ytmDirtWith<OdesliResponse>({ title: 'Dirt (Live)' })
    expect(withHopLinks(first(), hop)).toEqual(first())
  })

  it('fills nothing when both artists are given and differ, even with the same title', () => {
    const hop = ytmDirtWith<OdesliResponse>({ artistName: 'Some Other Artist' })
    expect(withHopLinks(first(), hop)).toEqual(first())
  })

  it.each([
    ['upper case', 'DIRT'],
    ['lower case', 'dirt'],
    ['punctuation', 'Dirt!'],
    ['surrounding whitespace', '  Dirt  '],
  ])('fills the missing link when the hop title differs only by %s', (_, title) => {
    const merged = withHopLinks(first(), ytmDirtWith<OdesliResponse>({ title }))
    expect(merged.links.spotify).toBe(DIRT_SPOTIFY)
  })

  it('fills the missing link when the hop artist differs only by case, punctuation and repeated spaces', () => {
    const hop = ytmDirtWith<OdesliResponse>({ artistName: 'PLACEHOLDER   artist.' })
    expect(withHopLinks(first(), hop).links.spotify).toBe(DIRT_SPOTIFY)
  })

  it("matches \"Ain't\" in the first title with \"Aint\" in the hop's", () => {
    const aint: Lookup = { title: "Ain't Gettin' High", artist: 'Placeholder Artist', links: {} }
    const merged = withHopLinks(aint, ytmDirtWith<OdesliResponse>({ title: 'Aint Gettin High' }))
    expect(merged.links.spotify).toBe(DIRT_SPOTIFY)
  })

  it('compares titles only when the first lookup has no artist', () => {
    const hop = ytmDirtWith<OdesliResponse>({ artistName: 'Some Other Artist' })
    const merged = withHopLinks({ ...first(), artist: '' }, hop)
    expect(merged.links.spotify).toBe(DIRT_SPOTIFY)
  })

  it('compares titles only when the hop has no artist', () => {
    const merged = withHopLinks(first(), ytmDirtWith<OdesliResponse>({ artistName: '' }))
    expect(merged.links.spotify).toBe(DIRT_SPOTIFY)
  })

  it("fills nothing when the link's entity is missing", () => {
    const hop = { ...ytmDirt(), entitiesByUniqueId: undefined }
    expect(withHopLinks(first(), hop)).toEqual(first())
  })

  it('fills nothing when the link names no entity', () => {
    const hop = ytmDirt()
    const linksByPlatform = { ...hop.linksByPlatform, spotify: { url: DIRT_SPOTIFY } }
    expect(withHopLinks(first(), { ...hop, linksByPlatform })).toEqual(first())
  })

  it("fills nothing when the link's entity has no title", () => {
    const hop = ytmDirtWith<OdesliResponse>({ title: undefined }, SPOTIFY_ENTITY)
    expect(withHopLinks(first(), hop)).toEqual(first())
  })

  it('fills nothing when the first lookup has no title', () => {
    const bare: Lookup = { links: { apple: DIRT_APPLE } }
    expect(withHopLinks(bare, ytmDirt())).toEqual(bare)
  })

  it("keeps the first lookup's candidates", () => {
    const candidates = [{ artist: 'Placeholder Artist', title: 'Dirt', url: DIRT_APPLE }]
    const merged = withHopLinks({ ...first(), candidates }, ytmDirt())
    expect(merged.candidates).toEqual(candidates)
  })

  it('leaves a platform missing when the hop lacks it too', () => {
    const merged = withHopLinks(first(), odesliWithout<OdesliResponse>('odesli-ytm-dirt.json', 'spotify'))
    expect(merged.links.spotify).toBeUndefined()
    expect(merged.links.apple).toBe(DIRT_APPLE)
    expect(merged.links.ytm).toBe(DIRT_YTM)
  })

  it('fills a missing Apple Music link for a Spotify-source lookup', () => {
    const spotifyFirst = fromOdesli(fixture('odesli-spotify-dirt-no-apple.json'))
    const merged = withHopLinks(spotifyFirst, ytmDirt())
    expect(merged.links).toEqual({ apple: DIRT_APPLE, spotify: DIRT_SPOTIFY, ytm: DIRT_YTM })
  })

  it('fills no Apple Music link for a Spotify-source lookup from a hop for a different song', () => {
    const spotifyFirst = fromOdesli(fixture('odesli-spotify-dirt-no-apple.json'))
    expect(withHopLinks(spotifyFirst, mismatchHop())).toEqual(spotifyFirst)
  })

  it('returns the first lookup unchanged when the hop has no links', () => {
    expect(withHopLinks(first(), fixture<OdesliResponse>('odesli-empty.json'))).toEqual(first())
  })

  it('does not mutate either input', () => {
    const a = first()
    const b = ytmDirt()
    const aBefore = structuredClone(a)
    const bBefore = structuredClone(b)
    withHopLinks(a, b)
    expect(a).toEqual(aBefore)
    expect(b).toEqual(bBefore)
  })
})
