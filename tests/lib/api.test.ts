import { describe, expect, it, vi } from 'vitest'
import { jsonp, lookupLink } from '../../src/lib/api'
import { spotifyAppSearchUri, withSearchFallbacks } from '../../src/lib/links'
import {
  fromItunesLookup,
  fromSpotifyOembed,
  itunesLookupUrl,
  itunesSearchUrl,
  spotifyOembedUrl,
} from '../../src/lib/lookup'
import type { ParsedLink } from '../../src/lib/types'
import { fixture } from '../support/fixtures'
import {
  type FetchAnswer,
  type JsonpOutcome,
  answerJson,
  failsToFetch,
  fetchedUrls,
  jsonpScriptsInDocument,
  mockFetchOnly,
  mockJsonp,
} from '../support/network'

// lookupLink goes by source: an Apple link is one iTunes lookup over JSONP;
// a Spotify link is one oEmbed fetch, then one iTunes search over JSONP. It
// fills search links, never retries and never rejects. JSONP times out after
// 8 s and always cleans up.
// PLAN-004 AC1: no lookup requests Odesli.
// PLAN-004 AC2-AC4: the Apple and Spotify paths and their degraded paths.

const JSONP_TIMEOUT = 8000
const ITUNES_URL = 'https://itunes.apple.com/search?term=queen&entity=song'

const SPOTIFY_TRACK: ParsedLink = {
  src: 'spotify',
  kind: 'track',
  id: '4u7EnebtmKWzUH433cf5Qv',
  link: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv',
}
const SPOTIFY_SHORT: ParsedLink = { src: 'spotify', link: 'https://spotify.link/aBcD1234' }
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

const callbackRegistered = (name: string) => name in window

// The reported case.
const REPORTED: ParsedLink = {
  src: 'spotify',
  kind: 'track',
  id: '1yQDTSOyfVTCt9XWKQcnXb',
  link: 'https://open.spotify.com/track/1yQDTSOyfVTCt9XWKQcnXb',
}
const REPORTED_TITLE = "Ain't Gettin' High"
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

describe('jsonp', () => {
  it('resolves with the data passed to its callback', async () => {
    mockJsonp(() => ({ data: { results: [1, 2] } }))
    await expect(jsonp(ITUNES_URL)).resolves.toEqual({ results: [1, 2] })
  })

  it('loads a script at the given URL with a callback param added', async () => {
    const loads = mockJsonp(() => ({ data: {} }))
    await jsonp(ITUNES_URL)
    expect(loads).toHaveLength(1)
    expect(loads[0].src.startsWith(ITUNES_URL)).toBe(true)
    expect(loads[0].callback).not.toBe('')
  })

  it('removes its script tag and callback after a response', async () => {
    const loads = mockJsonp(() => ({ data: {} }))
    await jsonp(ITUNES_URL)
    expect(jsonpScriptsInDocument()).toHaveLength(0)
    expect(callbackRegistered(loads[0].callback)).toBe(false)
  })

  it('rejects with Error("network") when the script fails to load', async () => {
    mockJsonp(() => 'error')
    await expect(jsonp(ITUNES_URL)).rejects.toThrow(new Error('network'))
  })

  it('removes its script tag and callback after a load failure', async () => {
    const loads = mockJsonp(() => 'error')
    await jsonp(ITUNES_URL).catch(() => {})
    expect(jsonpScriptsInDocument()).toHaveLength(0)
    expect(callbackRegistered(loads[0].callback)).toBe(false)
  })

  it('is still waiting just before 8 s without a response', async () => {
    vi.useFakeTimers()
    mockJsonp(() => 'hang')
    let settled = false
    jsonp(ITUNES_URL).then(
      () => (settled = true),
      () => (settled = true),
    )
    await vi.advanceTimersByTimeAsync(JSONP_TIMEOUT - 1)
    expect(settled).toBe(false)
  })

  it('rejects with Error("timeout") after 8 s without a response', async () => {
    vi.useFakeTimers()
    mockJsonp(() => 'hang')
    const result = jsonp(ITUNES_URL)
    const assertion = expect(result).rejects.toThrow(new Error('timeout'))
    await vi.advanceTimersByTimeAsync(JSONP_TIMEOUT)
    await assertion
  })

  it('removes its script tag and callback after a timeout', async () => {
    vi.useFakeTimers()
    const loads = mockJsonp(() => 'hang')
    const result = jsonp(ITUNES_URL).catch(() => {})
    await vi.advanceTimersByTimeAsync(JSONP_TIMEOUT)
    await result
    expect(loads).toHaveLength(1)
    expect(jsonpScriptsInDocument()).toHaveLength(0)
    expect(callbackRegistered(loads[0].callback)).toBe(false)
  })
})

describe('lookupLink', () => {
  describe('Apple links', () => {
    // No fetch is expected at all; iTunes answers the JSONP load with `itunes`.
    function appleCase(itunes: JsonpOutcome = { data: fixture('itunes-lookup-song.json') }) {
      const fetchMock = mockFetchOnly({})
      const loads = mockJsonp(() => itunes)
      return { fetchMock, loads }
    }

    it('make one iTunes lookup over JSONP and no fetch', async () => {
      const { fetchMock, loads } = appleCase()
      await lookupLink(APPLE_TRACK)
      expect(fetchedUrls(fetchMock)).toEqual([])
      expect(loads.map((l) => l.src.startsWith(itunesLookupUrl(APPLE_TRACK)))).toEqual([true])
    })

    it('make one iTunes album lookup and no fetch for an Apple album link', async () => {
      const { fetchMock, loads } = appleCase({ data: fixture('itunes-lookup-album.json') })
      await lookupLink(APPLE_ALBUM)
      expect(fetchedUrls(fetchMock)).toEqual([])
      expect(loads.map((l) => l.src.startsWith(itunesLookupUrl(APPLE_ALBUM)))).toEqual([true])
    })

    it('return the iTunes lookup result with search fallbacks filled in', async () => {
      appleCase()
      const { conversion } = await lookupLink(APPLE_TRACK)
      expect(conversion).toEqual(
        withSearchFallbacks(fromItunesLookup(fixture('itunes-lookup-song.json'), APPLE_TRACK)),
      )
    })

    it('take the title, artist and art from the lookup', async () => {
      appleCase()
      const { conversion } = await lookupLink(APPLE_TRACK)
      expect(conversion?.title).toBe('Bohemian Rhapsody')
      expect(conversion?.artist).toBe('Queen')
      expect(conversion?.art).toBe(
        'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/27/0d/0e/270d0e2b/source/300x300bb.jpg',
      )
    })

    it('link Apple Music to the input link, tagged exact', async () => {
      appleCase()
      const { conversion } = await lookupLink(APPLE_TRACK)
      expect(conversion?.links.apple).toBe(APPLE_TRACK.link)
      expect(conversion?.exact.apple).toBe(true)
    })

    it('link Spotify and YouTube Music to searches for "title artist", not exact', async () => {
      appleCase()
      const { conversion } = await lookupLink(APPLE_TRACK)
      expect(conversion?.links.spotify).toBe('https://open.spotify.com/search/Bohemian%20Rhapsody%20Queen')
      expect(conversion?.links.ytm).toBe('https://music.youtube.com/search?q=Bohemian%20Rhapsody%20Queen')
      expect(conversion?.exact.spotify).toBe(false)
      expect(conversion?.exact.ytm).toBe(false)
    })

    it('give a "Search in Spotify app" link for "title artist"', async () => {
      appleCase()
      const { conversion } = await lookupLink(APPLE_TRACK)
      expect(conversion?.spotifyAppSearch).toBe(spotifyAppSearchUri('Bohemian Rhapsody Queen'))
    })

    // PLAN-004 AC6/AC8: Apple-source lookups never show LIKELY.
    it('mark no platform likely', async () => {
      appleCase()
      const { conversion } = await lookupLink(APPLE_TRACK)
      expect(conversion?.likely).toEqual({ apple: false, spotify: false, ytm: false })
    })

    it('offer no artist candidates', async () => {
      appleCase()
      const { conversion } = await lookupLink(APPLE_TRACK)
      expect(conversion?.candidates ?? []).toEqual([])
    })

    it('return the parsed link they were given', async () => {
      appleCase()
      const { parsed } = await lookupLink(APPLE_TRACK)
      expect(parsed).toEqual(APPLE_TRACK)
    })

    it('treat a failed iTunes JSONP load as no results and use the slug as the title', async () => {
      appleCase('error')
      const { conversion } = await lookupLink(APPLE_TRACK)
      expect(conversion).toEqual(withSearchFallbacks(fromItunesLookup(null, APPLE_TRACK)))
      expect(conversion?.title).toBe('Bohemian Rhapsody')
      expect(conversion?.artist).toBe('')
    })

    it('treat an iTunes JSONP timeout as no results', async () => {
      vi.useFakeTimers()
      appleCase('hang')
      const result = lookupLink(APPLE_TRACK)
      await vi.advanceTimersByTimeAsync(JSONP_TIMEOUT)
      const { conversion } = await result
      expect(conversion).toEqual(withSearchFallbacks(fromItunesLookup(null, APPLE_TRACK)))
    })

    it('use the slug as the title and a blank artist when iTunes returns no results', async () => {
      appleCase({ data: fixture('itunes-lookup-empty.json') })
      const { conversion } = await lookupLink(APPLE_TRACK)
      expect(conversion?.title).toBe('Bohemian Rhapsody')
      expect(conversion?.artist).toBe('')
      expect(conversion?.links.apple).toBe(APPLE_TRACK.link)
      expect(conversion?.exact.apple).toBe(true)
    })

    it('make no further request after a failed iTunes load', async () => {
      const { fetchMock, loads } = appleCase('error')
      await lookupLink(APPLE_TRACK)
      expect(fetchedUrls(fetchMock)).toEqual([])
      expect(loads).toHaveLength(1)
    })

    it('return a null conversion when there is no title from iTunes or the slug', async () => {
      const noSlug: ParsedLink = { ...APPLE_TRACK, slug: '' }
      appleCase({ data: fixture('itunes-lookup-empty.json') })
      const { conversion } = await lookupLink(noSlug)
      expect(conversion).toBeNull()
    })
  })

  describe('Spotify links', () => {
    // oEmbed answers as `oembed`; any other fetch fails the test.
    function spotifyCase(
      oembed: FetchAnswer = answerJson(fixture('spotify-oembed-track.json')),
      itunes: JsonpOutcome = { data: fixture('itunes-search-songs.json') },
    ) {
      const fetchMock = mockFetchOnly({ [spotifyOembedUrl(SPOTIFY_TRACK.link)]: oembed })
      const loads = mockJsonp(() => itunes)
      return { fetchMock, loads }
    }

    it('fetch only the oEmbed for the link, once', async () => {
      const { fetchMock } = spotifyCase()
      await lookupLink(SPOTIFY_TRACK)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_TRACK.link)])
    })

    it('search iTunes over JSONP for the oEmbed title', async () => {
      const { loads } = spotifyCase()
      await lookupLink(SPOTIFY_TRACK)
      const expected = itunesSearchUrl('Bohemian Rhapsody - Remastered 2011', 'track')
      expect(loads.map((l) => l.src.startsWith(expected))).toEqual([true])
    })

    it('return the Spotify fallback result with search fallbacks filled in', async () => {
      spotifyCase()
      const { conversion } = await lookupLink(SPOTIFY_TRACK)
      expect(conversion).toEqual(
        withSearchFallbacks(
          fromSpotifyOembed(
            fixture('spotify-oembed-track.json'),
            fixture('itunes-search-songs.json'),
            SPOTIFY_TRACK,
          ),
        ),
      )
    })

    it('return the parsed link they were given', async () => {
      spotifyCase()
      const { parsed } = await lookupLink(SPOTIFY_TRACK)
      expect(parsed).toEqual(SPOTIFY_TRACK)
    })

    it('treat a failed iTunes JSONP load as no results', async () => {
      spotifyCase(answerJson(fixture('spotify-oembed-track.json')), 'error')
      const { conversion } = await lookupLink(SPOTIFY_TRACK)
      expect(conversion).toEqual(
        withSearchFallbacks(fromSpotifyOembed(fixture('spotify-oembed-track.json'), null, SPOTIFY_TRACK)),
      )
      expect(conversion?.exact.apple).toBe(false)
    })

    it('return a null conversion when the oEmbed request fails', async () => {
      spotifyCase(failsToFetch)
      const { conversion } = await lookupLink(SPOTIFY_TRACK)
      expect(conversion).toBeNull()
    })

    it.each([404, 429, 500])(
      'return a null conversion when oEmbed answers %i',
      async (status) => {
        spotifyCase(answerJson({}, status))
        const { conversion } = await lookupLink(SPOTIFY_TRACK)
        expect(conversion).toBeNull()
      },
    )

    it('make exactly one request and no iTunes request when the oEmbed request fails', async () => {
      const { fetchMock, loads } = spotifyCase(failsToFetch)
      await lookupLink(SPOTIFY_TRACK)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_TRACK.link)])
      expect(loads).toHaveLength(0)
    })

    it.each([404, 429, 500])(
      'make exactly one request and no iTunes request when oEmbed answers %i',
      async (status) => {
        const { fetchMock, loads } = spotifyCase(answerJson({}, status))
        await lookupLink(SPOTIFY_TRACK)
        expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_TRACK.link)])
        expect(loads).toHaveLength(0)
      },
    )

    it('return the parsed link they were given when the oEmbed request fails', async () => {
      spotifyCase(failsToFetch)
      const { parsed } = await lookupLink(SPOTIFY_TRACK)
      expect(parsed).toEqual(SPOTIFY_TRACK)
    })

    // MR-011 N2 / PLAN-004 AC6: a blank oEmbed title ends in NOT_FOUND, with
    // no iTunes search.
    it.each(['', '   '])(
      'return a null conversion after one request and no iTunes search when the oEmbed title is %j',
      async (title) => {
        const { fetchMock, loads } = spotifyCase(
          answerJson({ ...fixture<object>('spotify-oembed-track.json'), title }),
        )
        const { conversion } = await lookupLink(SPOTIFY_TRACK)
        expect(conversion).toBeNull()
        expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_TRACK.link)])
        expect(loads).toHaveLength(0)
      },
    )

    it('return a null conversion and no iTunes search when the oEmbed has no title', async () => {
      const untitled = fixture<Record<string, unknown>>('spotify-oembed-track.json')
      delete untitled.title
      const { loads } = spotifyCase(answerJson(untitled))
      const { conversion } = await lookupLink(SPOTIFY_TRACK)
      expect(conversion).toBeNull()
      expect(loads).toHaveLength(0)
    })

    // PLAN-004 AC6: two artists match after cleaning, so nothing is likely.
    it('mark no platform likely when Queen and The Petersens both match', async () => {
      spotifyCase()
      const { conversion } = await lookupLink(SPOTIFY_TRACK)
      expect(conversion?.artist).toBe('')
      expect(conversion?.likely).toEqual({ apple: false, spotify: false, ytm: false })
    })
  })

  // PLAN-004 AC5: a Spotify track whose iTunes results have exactly one
  // artist with the same cleaned title.
  describe('a Spotify link with a unique iTunes match', () => {
    const UNIQUE: ParsedLink = {
      src: 'spotify',
      kind: 'track',
      id: '3kVr8XqPz2LmNw7TyB5hJd',
      link: 'https://open.spotify.com/track/3kVr8XqPz2LmNw7TyB5hJd',
    }
    const UNIQUE_TITLE = "Rollin' Down To Memphis - Remastered 2015"
    const MARLOW_MATCH_URL =
      'https://music.apple.com/us/album/rollin-down-to-memphis/1587654321?i=1587654329'

    function uniqueCase() {
      const fetchMock = mockFetchOnly({
        [spotifyOembedUrl(UNIQUE.link)]: answerJson(fixture('spotify-oembed-unique-match.json')),
      })
      const loads = mockJsonp(() => ({ data: fixture('itunes-search-unique-match.json') }))
      return { fetchMock, loads }
    }

    it('fetches the oEmbed once, then makes one iTunes search for the original title', async () => {
      const { fetchMock, loads } = uniqueCase()
      await lookupLink(UNIQUE)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(UNIQUE.link)])
      expect(loads.map((l) => l.src.startsWith(itunesSearchUrl(UNIQUE_TITLE, 'track')))).toEqual([true])
    })

    it('sets the artist to the matching artist', async () => {
      uniqueCase()
      const { conversion } = await lookupLink(UNIQUE)
      expect(conversion?.title).toBe(UNIQUE_TITLE)
      expect(conversion?.artist).toBe('Marlow Vance')
    })

    it("links Apple Music to that artist's matching result, likely and not exact", async () => {
      uniqueCase()
      const { conversion } = await lookupLink(UNIQUE)
      expect(conversion?.links.apple).toBe(MARLOW_MATCH_URL)
      expect(conversion?.likely.apple).toBe(true)
      expect(conversion?.exact.apple).toBe(false)
    })

    it('keeps the canonical Spotify link exact and not likely', async () => {
      uniqueCase()
      const { conversion } = await lookupLink(UNIQUE)
      expect(conversion?.links.spotify).toBe(UNIQUE.link)
      expect(conversion?.exact.spotify).toBe(true)
      expect(conversion?.likely.spotify).toBe(false)
    })

    it('links YouTube Music to a search for "title artist", neither exact nor likely', async () => {
      uniqueCase()
      const { conversion } = await lookupLink(UNIQUE)
      expect(conversion?.links.ytm).toBe(
        "https://music.youtube.com/search?q=Rollin'%20Down%20To%20Memphis%20-%20Remastered%202015%20Marlow%20Vance",
      )
      expect(conversion?.exact.ytm).toBe(false)
      expect(conversion?.likely.ytm).toBe(false)
    })

    it('marks only Apple Music likely', async () => {
      uniqueCase()
      const { conversion } = await lookupLink(UNIQUE)
      expect(conversion?.likely).toEqual({ apple: true, spotify: false, ytm: false })
    })
  })

  describe('Spotify short links', () => {
    // oEmbed answers the short link as `oembed`; any other fetch fails the test.
    function shortLinkCase(
      oembed: FetchAnswer,
      itunes: JsonpOutcome = { data: fixture('itunes-search-songs.json') },
    ) {
      const fetchMock = mockFetchOnly({ [spotifyOembedUrl(SPOTIFY_SHORT.link)]: oembed })
      const loads = mockJsonp(() => itunes)
      return { fetchMock, loads }
    }

    it('fetch only the oEmbed for the short link, once', async () => {
      const { fetchMock } = shortLinkCase(answerJson(fixture('spotify-oembed-track.json')))
      await lookupLink(SPOTIFY_SHORT)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_SHORT.link)])
    })

    it('return the parsed link resolved from the oEmbed player URL', async () => {
      shortLinkCase(answerJson(fixture('spotify-oembed-track.json')))
      const { parsed } = await lookupLink(SPOTIFY_SHORT)
      expect(parsed).toEqual(SPOTIFY_TRACK)
    })

    it('use the resolved canonical link as the exact Spotify link', async () => {
      shortLinkCase(answerJson(fixture('spotify-oembed-track.json')))
      const { conversion } = await lookupLink(SPOTIFY_SHORT)
      expect(conversion?.links.spotify).toBe(SPOTIFY_TRACK.link)
      expect(conversion?.exact.spotify).toBe(true)
    })

    it('search iTunes albums when the short link resolves to an album', async () => {
      const { loads } = shortLinkCase(answerJson(fixture('spotify-oembed-album.json')), {
        data: fixture('itunes-search-albums.json'),
      })
      await lookupLink(SPOTIFY_SHORT)
      const expected = itunesSearchUrl('A Night At The Opera (2011 Remaster)', 'album')
      expect(loads.map((l) => l.src.startsWith(expected))).toEqual([true])
    })

    it('return a null conversion and the unresolved link when oEmbed has no player', async () => {
      const { fetchMock, loads } = shortLinkCase(answerJson(fixture('spotify-oembed-no-player.json')))
      const { conversion, parsed } = await lookupLink(SPOTIFY_SHORT)
      expect(conversion).toBeNull()
      expect(parsed).toEqual(SPOTIFY_SHORT)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_SHORT.link)])
      expect(loads).toHaveLength(0)
    })

    it('return a null conversion and the unresolved link when the oEmbed request fails', async () => {
      const { fetchMock, loads } = shortLinkCase(failsToFetch)
      const { conversion, parsed } = await lookupLink(SPOTIFY_SHORT)
      expect(conversion).toBeNull()
      expect(parsed).toEqual(SPOTIFY_SHORT)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_SHORT.link)])
      expect(loads).toHaveLength(0)
    })
  })

  // PLAN-004 AC3/AC4: the reported link, now with no Odesli in front of it.
  describe('the reported Spotify link', () => {
    // oEmbed answers with the reported response and iTunes search answers with
    // `itunes`. `requests` records every request, fetch or JSONP, in order.
    function reportedCase(
      itunes: JsonpOutcome = { data: fixture('itunes-search-aint-gettin-high.json') },
      oembed: FetchAnswer = answerJson(fixture('spotify-oembed-aint-gettin-high.json')),
    ) {
      const requests: string[] = []
      const fetchMock = mockFetchOnly({
        [spotifyOembedUrl(REPORTED.link)]: () => {
          requests.push(`fetch ${spotifyOembedUrl(REPORTED.link)}`)
          return oembed()
        },
      })
      const loads = mockJsonp((src) => {
        requests.push(`jsonp ${src}`)
        return itunes
      })
      return { fetchMock, loads, requests }
    }

    it('fetches the oEmbed once, then makes one iTunes search over JSONP for the title, in that order', async () => {
      const { fetchMock, loads, requests } = reportedCase()
      await lookupLink(REPORTED)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(REPORTED.link)])
      expect(loads.map((l) => l.src.startsWith(itunesSearchUrl(REPORTED_TITLE, 'track')))).toEqual([true])
      expect(requests).toEqual([`fetch ${spotifyOembedUrl(REPORTED.link)}`, `jsonp ${loads[0].src}`])
    })

    it('takes the title and artwork from oEmbed', async () => {
      reportedCase()
      const { conversion } = await lookupLink(REPORTED)
      expect(conversion?.title).toBe(REPORTED_TITLE)
      expect(conversion?.art).toBe(REPORTED_THUMB)
    })

    it('leaves the artist blank instead of using the top iTunes hit', async () => {
      reportedCase()
      const { conversion } = await lookupLink(REPORTED)
      expect(conversion?.artist).toBe('')
    })

    it('links Apple Music to a search for the title alone, not exact', async () => {
      reportedCase()
      const { conversion } = await lookupLink(REPORTED)
      expect(conversion?.links.apple).toBe("https://music.apple.com/us/search?term=Ain't%20Gettin'%20High")
      expect(conversion?.exact.apple).toBe(false)
    })

    it('keeps the canonical Spotify track link as exact', async () => {
      reportedCase()
      const { conversion } = await lookupLink(REPORTED)
      expect(conversion?.links.spotify).toBe(REPORTED.link)
      expect(conversion?.exact.spotify).toBe(true)
    })

    it('links YouTube Music to a search for the title alone, not exact', async () => {
      reportedCase()
      const { conversion } = await lookupLink(REPORTED)
      expect(conversion?.links.ytm).toBe("https://music.youtube.com/search?q=Ain't%20Gettin'%20High")
      expect(conversion?.exact.ytm).toBe(false)
    })

    it('marks no platform likely, since two artists have the title', async () => {
      reportedCase()
      const { conversion } = await lookupLink(REPORTED)
      expect(conversion?.likely).toEqual({ apple: false, spotify: false, ytm: false })
    })

    it('offers the iTunes artists as candidates, one per artist, in iTunes order', async () => {
      reportedCase()
      const { conversion } = await lookupLink(REPORTED)
      expect(conversion?.candidates).toEqual(REPORTED_CANDIDATES)
    })

    it('offers no candidates and still a title-only Apple search when iTunes finds nothing', async () => {
      reportedCase({ data: fixture('itunes-search-empty.json') })
      const { conversion } = await lookupLink(REPORTED)
      expect(conversion?.title).toBe(REPORTED_TITLE)
      expect(conversion?.artist).toBe('')
      expect(conversion?.candidates ?? []).toEqual([])
      expect(conversion?.links.apple).toBe("https://music.apple.com/us/search?term=Ain't%20Gettin'%20High")
      expect(conversion?.exact.apple).toBe(false)
    })

    it('offers no candidates and still a title-only Apple search when the iTunes JSONP load fails', async () => {
      reportedCase('error')
      const { conversion } = await lookupLink(REPORTED)
      expect(conversion?.title).toBe(REPORTED_TITLE)
      expect(conversion?.artist).toBe('')
      expect(conversion?.candidates ?? []).toEqual([])
      expect(conversion?.links.apple).toBe("https://music.apple.com/us/search?term=Ain't%20Gettin'%20High")
      expect(conversion?.exact.apple).toBe(false)
    })

    it('offers no candidates and still a title-only Apple search when the iTunes JSONP load times out', async () => {
      vi.useFakeTimers()
      const { fetchMock, loads } = reportedCase('hang')
      const result = lookupLink(REPORTED)
      await vi.advanceTimersByTimeAsync(JSONP_TIMEOUT)
      const { conversion } = await result
      expect(conversion?.title).toBe(REPORTED_TITLE)
      expect(conversion?.artist).toBe('')
      expect(conversion?.candidates ?? []).toEqual([])
      expect(conversion?.exact.apple).toBe(false)
      expect(fetchedUrls(fetchMock)).toHaveLength(1)
      expect(loads).toHaveLength(1)
    })

    it('makes no further request after a failed iTunes load', async () => {
      const { fetchMock, loads } = reportedCase('error')
      await lookupLink(REPORTED)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(REPORTED.link)])
      expect(loads).toHaveLength(1)
    })

    it('returns a null conversion after exactly one request when the oEmbed request fails', async () => {
      const { fetchMock, loads } = reportedCase(undefined, failsToFetch)
      const { conversion } = await lookupLink(REPORTED)
      expect(conversion).toBeNull()
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(REPORTED.link)])
      expect(loads).toHaveLength(0)
    })
  })
})
