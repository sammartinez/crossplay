import { describe, expect, it } from 'vitest'
import {
  fromItunesLookup,
  fromOdesli,
  fromSpotifyFallback,
  itunesLookupUrl,
  itunesSearchUrl,
  odesliUrl,
  resolveSpotifyShortLink,
  spotifyOembedUrl,
} from './lookup'
import type { ParsedLink } from './types'
import { fixture } from '../test/fixtures'

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
  it('takes the title and artwork from oEmbed and the Spotify link from the parsed link', () => {
    const lookup = fromSpotifyFallback(
      fixture('spotify-oembed-track.json'),
      fixture('itunes-search-songs.json'),
      SPOTIFY_TRACK,
    )
    expect(lookup.title).toBe('Bohemian Rhapsody - Remastered 2011')
    expect(lookup.art).toBe(OEMBED_THUMB)
    expect(lookup.links.spotify).toBe(SPOTIFY_TRACK.link)
  })

  it('maps every iTunes match to an alternate with a music.apple.com URL stripped of &uo=', () => {
    const lookup = fromSpotifyFallback(
      fixture('spotify-oembed-track.json'),
      fixture('itunes-search-songs.json'),
      SPOTIFY_TRACK,
    )
    expect(lookup.alts).toEqual([
      {
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
        url: 'https://music.apple.com/us/album/bohemian-rhapsody/1440806041?i=1440806768',
      },
      {
        title: 'Bohemian Rhapsody (Live Aid)',
        artist: 'Queen',
        url: 'https://music.apple.com/us/album/bohemian-rhapsody-live-aid/1440650428?i=1440650711',
      },
      {
        title: 'Bohemian Rhapsody',
        artist: 'The Petersens',
        url: 'https://music.apple.com/us/album/bohemian-rhapsody/1564530719?i=1564530724',
      },
    ])
  })

  it('uses the first alternate for the artist and the Apple link', () => {
    const lookup = fromSpotifyFallback(
      fixture('spotify-oembed-track.json'),
      fixture('itunes-search-songs.json'),
      SPOTIFY_TRACK,
    )
    expect(lookup.artist).toBe('Queen')
    expect(lookup.links.apple).toBe(
      'https://music.apple.com/us/album/bohemian-rhapsody/1440806041?i=1440806768',
    )
  })

  it('uses the collection name and collection URL for album matches', () => {
    const lookup = fromSpotifyFallback(
      fixture('spotify-oembed-album.json'),
      fixture('itunes-search-albums.json'),
      SPOTIFY_ALBUM,
    )
    expect(lookup.alts).toEqual([
      {
        title: 'A Night At The Opera (2011 Remaster)',
        artist: 'Queen',
        url: 'https://music.apple.com/us/album/a-night-at-the-opera-2011-remaster/1440806041',
      },
    ])
    expect(lookup.links).toEqual({
      spotify: SPOTIFY_ALBUM.link,
      apple: 'https://music.apple.com/us/album/a-night-at-the-opera-2011-remaster/1440806041',
    })
  })

  it('gives an empty artist, no Apple link and no alternates when the search finds nothing', () => {
    const lookup = fromSpotifyFallback(
      fixture('spotify-oembed-track.json'),
      fixture('itunes-search-empty.json'),
      SPOTIFY_TRACK,
    )
    expect(lookup.title).toBe('Bohemian Rhapsody - Remastered 2011')
    expect(lookup.artist).toBe('')
    expect(lookup.links.spotify).toBe(SPOTIFY_TRACK.link)
    expect(lookup.links.apple).toBeUndefined()
    expect(lookup.alts).toEqual([])
  })

  it('handles a null iTunes body the same as no results', () => {
    const lookup = fromSpotifyFallback(fixture('spotify-oembed-track.json'), null, SPOTIFY_TRACK)
    expect(lookup.artist).toBe('')
    expect(lookup.links.apple).toBeUndefined()
    expect(lookup.alts).toEqual([])
  })
})
