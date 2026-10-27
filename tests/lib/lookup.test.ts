import { describe, expect, it } from 'vitest'
import {
  fromItunesLookup,
  fromSpotifyOembed,
  itunesLookupUrl,
  itunesSearchUrl,
  resolveSpotifyShortLink,
  spotifyOembedUrl,
} from '../../src/lib/lookup'
import {
  APPLE_ALBUM,
  APPLE_TRACK,
  REPORTED,
  REPORTED_CANDIDATES,
  REPORTED_THUMB,
  SPOTIFY_ALBUM,
  SPOTIFY_TRACK,
  UNIQUE,
  UNIQUE_CANDIDATES,
} from '../support/cases'
import { fixture } from '../support/fixtures'

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

  // PLAN-004 AC6/AC8: Apple-source lookups never show LIKELY.
  it('marks nothing likely', () => {
    expect(fromItunesLookup(fixture('itunes-lookup-song.json'), APPLE_TRACK).likely).toBeUndefined()
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

describe('fromSpotifyOembed', () => {
  // The reported case: oEmbed has no artist, and the iTunes title search
  // returns several artists.
  const reported = () =>
    fromSpotifyOembed(
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

  // PLAN-004 AC3/AC6: Matson and the Neon Prairie Dogs both have the title,
  // so nothing is auto-picked: no artist, no Apple link, nothing likely.
  it('returns the oEmbed title and art, a blank artist, the Spotify link and the candidates', () => {
    expect(reported()).toEqual({
      title: "Ain't Gettin' High",
      artist: '',
      art: REPORTED_THUMB,
      links: { spotify: REPORTED.link },
      candidates: REPORTED_CANDIDATES,
    })
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
    const lookup = fromSpotifyOembed(
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
    const lookup = fromSpotifyOembed(
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
    const lookup = fromSpotifyOembed(
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
    const lookup = fromSpotifyOembed(
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
  })

  // PLAN-004 AC6: album links follow the same rule against album results.
  it('auto-picks Queen as LIKELY for the album link, whose only album result has the same title', () => {
    const lookup = fromSpotifyOembed(
      fixture('spotify-oembed-album.json'),
      fixture('itunes-search-albums.json'),
      SPOTIFY_ALBUM,
    )
    expect(lookup.artist).toBe('Queen')
    expect(lookup.links).toEqual({
      spotify: SPOTIFY_ALBUM.link,
      apple: 'https://music.apple.com/us/album/a-night-at-the-opera-2011-remaster/1440806041',
    })
    expect(lookup.likely).toEqual({ apple: true })
  })

  it('gives a blank artist, no Apple link and no candidates when the search finds nothing', () => {
    const lookup = fromSpotifyOembed(
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
    const lookup = fromSpotifyOembed(fixture('spotify-oembed-track.json'), null, SPOTIFY_TRACK)
    expect(lookup.artist).toBe('')
    expect(lookup.links).toEqual({ spotify: SPOTIFY_TRACK.link })
    expect(lookup.candidates ?? []).toEqual([])
  })

  // PLAN-004 AC5: exactly one artist has a result whose cleaned title is the
  // oEmbed title's, so that artist is pre-selected and Apple tagged LIKELY.
  describe('with exactly one artist whose title matches', () => {
    const UNIQUE_THUMB =
      'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02f0e1d2c3b4a5968778695a4b'
    const MARLOW_MATCH_URL =
      'https://music.apple.com/us/album/rollin-down-to-memphis/1587654321?i=1587654329'
    const unique = () =>
      fromSpotifyOembed(
        fixture('spotify-oembed-unique-match.json'),
        fixture('itunes-search-unique-match.json'),
        UNIQUE,
      )

    it('returns that artist, its matching result as the Apple link marked likely, and the candidates', () => {
      expect(unique()).toEqual({
        title: "Rollin' Down To Memphis - Remastered 2015",
        artist: 'Marlow Vance',
        art: UNIQUE_THUMB,
        links: { spotify: UNIQUE.link, apple: MARLOW_MATCH_URL },
        candidates: UNIQUE_CANDIDATES,
        likely: { apple: true },
      })
    })

    it('keeps the original oEmbed title, not the cleaned one', () => {
      expect(unique().title).toBe("Rollin' Down To Memphis - Remastered 2015")
    })

    it("keeps an artist's first matching result as its candidate when its first result does not match", () => {
      const marlow = unique().candidates?.find((c) => c.artist === 'Marlow Vance')
      expect(marlow).toEqual({ artist: 'Marlow Vance', title: 'Rollin Down to Memphis', url: MARLOW_MATCH_URL })
    })

    it('counts two matching results by the same artist as one artist', () => {
      const lookup = fromSpotifyOembed(
        fixture('spotify-oembed-unique-match.json'),
        {
          results: [
            song('Marlow Vance', 'Rollin Down to Memphis', 'https://itunes.apple.com/us/album/a/1?i=11&uo=4'),
            song(' MARLOW VANCE ', "Rollin' Down To Memphis", 'https://itunes.apple.com/us/album/b/2?i=22&uo=4'),
            song('Harper Lane', 'Midnight Ferry', 'https://itunes.apple.com/us/album/c/3?i=33&uo=4'),
          ],
        },
        UNIQUE,
      )
      expect(lookup.artist).toBe('Marlow Vance')
      expect(lookup.links.apple).toBe('https://music.apple.com/us/album/a/1?i=11')
      expect(lookup.likely).toEqual({ apple: true })
    })
  })

  // PLAN-004 AC6: the edges of the auto-pick rule.
  describe('auto-pick edges', () => {
    const titled = (title: string) => ({ ...fixture<object>('spotify-oembed-track.json'), title })

    it('matches "Aint Gettin High" with the oEmbed title "Ain\'t Gettin\' High"', () => {
      const lookup = fromSpotifyOembed(
        fixture('spotify-oembed-aint-gettin-high.json'),
        {
          results: [
            song('Samuel Cody Matson', 'Aint Gettin High', 'https://itunes.apple.com/us/album/a/1?i=11&uo=4'),
            song('Zach Bryan', 'Younger Years', 'https://itunes.apple.com/us/album/b/2?i=22&uo=4'),
          ],
        },
        REPORTED,
      )
      expect(lookup.artist).toBe('Samuel Cody Matson')
      expect(lookup.links.apple).toBe('https://music.apple.com/us/album/a/1?i=11')
      expect(lookup.likely).toEqual({ apple: true })
    })

    it('does not match a "(Live)" version, so a live-only artist is not picked', () => {
      const lookup = fromSpotifyOembed(
        fixture('spotify-oembed-aint-gettin-high.json'),
        {
          results: [
            song('The Neon Prairie Dogs', "Ain't Gettin' High (Live)", 'https://itunes.apple.com/us/album/a/1?i=11&uo=4'),
            song('Zach Bryan', 'Younger Years', 'https://itunes.apple.com/us/album/b/2?i=22&uo=4'),
          ],
        },
        REPORTED,
      )
      expect(lookup.artist).toBe('')
      expect(lookup.links).toEqual({ spotify: REPORTED.link })
      expect(lookup.likely).toBeUndefined()
    })

    it('picks nothing for "Bohemian Rhapsody - Remastered 2011", where Queen and The Petersens both match after cleaning', () => {
      const lookup = fromSpotifyOembed(
        fixture('spotify-oembed-track.json'),
        fixture('itunes-search-songs.json'),
        SPOTIFY_TRACK,
      )
      expect(lookup.artist).toBe('')
      expect(lookup.links).toEqual({ spotify: SPOTIFY_TRACK.link })
      expect(lookup.likely).toBeUndefined()
    })

    it('keeps Queen\'s plain "Bohemian Rhapsody" as its candidate, not "Bohemian Rhapsody (Live Aid)"', () => {
      const lookup = fromSpotifyOembed(
        fixture('spotify-oembed-track.json'),
        fixture('itunes-search-songs.json'),
        SPOTIFY_TRACK,
      )
      expect(lookup.candidates).toEqual([
        {
          artist: 'Queen',
          title: 'Bohemian Rhapsody',
          url: 'https://music.apple.com/us/album/bohemian-rhapsody/1440806041?i=1440806768',
        },
        {
          artist: 'The Petersens',
          title: 'Bohemian Rhapsody',
          url: 'https://music.apple.com/us/album/bohemian-rhapsody/1564530719?i=1564530724',
        },
      ])
    })

    it('picks Queen when its only matching result comes after its "(Live Aid)" result', () => {
      const lookup = fromSpotifyOembed(
        fixture('spotify-oembed-track.json'),
        {
          results: [
            song('Queen', 'Bohemian Rhapsody (Live Aid)', 'https://itunes.apple.com/us/album/a/1?i=11&uo=4'),
            song('Queen', 'Bohemian Rhapsody', 'https://itunes.apple.com/us/album/b/2?i=22&uo=4'),
            song('Panic Room', 'Something Else', 'https://itunes.apple.com/us/album/c/3?i=33&uo=4'),
          ],
        },
        SPOTIFY_TRACK,
      )
      expect(lookup.artist).toBe('Queen')
      expect(lookup.links.apple).toBe('https://music.apple.com/us/album/b/2?i=22')
      expect(lookup.candidates?.[0]).toEqual({
        artist: 'Queen',
        title: 'Bohemian Rhapsody',
        url: 'https://music.apple.com/us/album/b/2?i=22',
      })
      expect(lookup.likely).toEqual({ apple: true })
    })

    it('keeps an artist\'s first result as its candidate when none of its results match', () => {
      const lookup = fromSpotifyOembed(
        fixture('spotify-oembed-track.json'),
        {
          results: [
            song('Queen', 'Bohemian Rhapsody (Live Aid)', 'https://itunes.apple.com/us/album/a/1?i=11&uo=4'),
            song('Queen', 'Bohemian Rhapsody (Live)', 'https://itunes.apple.com/us/album/b/2?i=22&uo=4'),
          ],
        },
        SPOTIFY_TRACK,
      )
      expect(lookup.candidates).toEqual([
        {
          artist: 'Queen',
          title: 'Bohemian Rhapsody (Live Aid)',
          url: 'https://music.apple.com/us/album/a/1?i=11',
        },
      ])
      expect(lookup.artist).toBe('')
    })

    it('picks nothing when no artist has a matching title', () => {
      const lookup = fromSpotifyOembed(
        fixture('spotify-oembed-track.json'),
        {
          results: [
            song('Queen', 'Bohemian Rhapsody (Live Aid)', 'https://itunes.apple.com/us/album/a/1?i=11&uo=4'),
            song('Panic Room', 'Something Else', 'https://itunes.apple.com/us/album/b/2?i=22&uo=4'),
          ],
        },
        SPOTIFY_TRACK,
      )
      expect(lookup.artist).toBe('')
      expect(lookup.links).toEqual({ spotify: SPOTIFY_TRACK.link })
      expect(lookup.likely).toBeUndefined()
    })

    it('picks nothing when the oEmbed title is blank, even against a result with no title', () => {
      const lookup = fromSpotifyOembed(
        titled(''),
        {
          results: [
            { artistName: 'Queen', trackViewUrl: 'https://itunes.apple.com/us/album/a/1?i=11&uo=4' },
          ],
        },
        SPOTIFY_TRACK,
      )
      expect(lookup.artist).toBe('')
      expect(lookup.links).toEqual({ spotify: SPOTIFY_TRACK.link })
      expect(lookup.likely).toBeUndefined()
    })

    it('picks nothing when the oEmbed title is only noise, even against the same title', () => {
      const lookup = fromSpotifyOembed(
        titled('(Remastered)'),
        {
          results: [song('Queen', '(Remastered)', 'https://itunes.apple.com/us/album/a/1?i=11&uo=4')],
        },
        SPOTIFY_TRACK,
      )
      expect(lookup.artist).toBe('')
      expect(lookup.likely).toBeUndefined()
    })

    it('picks nothing when iTunes finds nothing', () => {
      const lookup = fromSpotifyOembed(
        fixture('spotify-oembed-track.json'),
        fixture('itunes-search-empty.json'),
        SPOTIFY_TRACK,
      )
      expect(lookup.likely).toBeUndefined()
    })

    it('picks nothing when the iTunes body is null', () => {
      expect(fromSpotifyOembed(fixture('spotify-oembed-track.json'), null, SPOTIFY_TRACK).likely).toBeUndefined()
    })
  })
})
