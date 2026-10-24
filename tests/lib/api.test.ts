import { describe, expect, it, vi } from 'vitest'
import { SPOTIFY_OEMBED_URL } from '../../src/constants'
import { jsonp, lookupLink } from '../../src/lib/api'
import { withSearchFallbacks } from '../../src/lib/links'
import {
  fromItunesLookup,
  fromOdesli,
  fromSpotifyFallback,
  itunesLookupUrl,
  itunesSearchUrl,
  odesliUrl,
  spotifyOembedUrl,
} from '../../src/lib/lookup'
import type { ParsedLink } from '../../src/lib/types'
import { fixture } from '../support/fixtures'
import {
  type JsonpOutcome,
  fetchedUrls,
  jsonResponse,
  jsonpScriptsInDocument,
  mockFetch,
  mockJsonp,
} from '../support/network'

// AC9: lookupLink tries Odesli, falls back by source, fills search links,
// and JSONP times out after 8 s and always cleans up.
// PLAN-002 AC4: Odesli gets one immediate retry before the fallback.
// AC5/AC6: the Spotify fallback leaves the artist blank and offers candidates.

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

const callbackRegistered = (name: string) => name in window

const odesliFails = () => jsonResponse({}, 500)
const odesliRateLimited = () => jsonResponse({}, 429)

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
  describe('when Odesli answers', () => {
    it('returns the Odesli result with search fallbacks filled in', async () => {
      mockFetch((url) => {
        if (url === odesliUrl(SPOTIFY_TRACK.link)) return jsonResponse(fixture('odesli-track.json'))
        throw new Error(`unexpected fetch ${url}`)
      })
      const { conversion } = await lookupLink(SPOTIFY_TRACK)
      expect(conversion).toEqual(withSearchFallbacks(fromOdesli(fixture('odesli-track.json'))))
    })

    it('makes no fallback requests', async () => {
      const fetchMock = mockFetch(() => jsonResponse(fixture('odesli-track.json')))
      const loads = mockJsonp(() => ({ data: {} }))
      await lookupLink(SPOTIFY_TRACK)
      expect(fetchedUrls(fetchMock)).toEqual([odesliUrl(SPOTIFY_TRACK.link)])
      expect(loads).toHaveLength(0)
    })

    it('fills search links for the platforms Odesli has no link for', async () => {
      const partial = fixture<object>('odesli-partial.json')
      mockFetch(() =>
        jsonResponse({
          ...partial,
          entitiesByUniqueId: {
            'SPOTIFY_SONG::0000000000000000000000': { title: 'Song', artistName: 'Band' },
          },
        }),
      )
      const { conversion } = await lookupLink(SPOTIFY_TRACK)
      expect(conversion?.exact).toEqual({ apple: false, spotify: true, ytm: false })
      expect(conversion?.links.ytm).toBe('https://music.youtube.com/search?q=Song%20Band')
    })

    it('returns the parsed link it was given', async () => {
      mockFetch(() => jsonResponse(fixture('odesli-track.json')))
      const { parsed } = await lookupLink(SPOTIFY_TRACK)
      expect(parsed).toEqual(SPOTIFY_TRACK)
    })

    it('returns a null conversion when Odesli gives no title', async () => {
      mockFetch(() => jsonResponse(fixture('odesli-empty.json')))
      const { conversion } = await lookupLink(SPOTIFY_TRACK)
      expect(conversion).toBeNull()
    })
  })

  describe('Apple links when Odesli fails', () => {
    it('fall back to an iTunes lookup over JSONP after an Odesli error status', async () => {
      mockFetch(odesliFails)
      const loads = mockJsonp(() => ({ data: fixture('itunes-lookup-song.json') }))
      const { conversion } = await lookupLink(APPLE_TRACK)
      expect(loads.map((l) => l.src.startsWith(itunesLookupUrl(APPLE_TRACK)))).toEqual([true])
      expect(conversion).toEqual(
        withSearchFallbacks(fromItunesLookup(fixture('itunes-lookup-song.json'), APPLE_TRACK)),
      )
    })

    it('fall back to an iTunes lookup when the Odesli request itself fails', async () => {
      mockFetch(() => {
        throw new TypeError('Failed to fetch')
      })
      mockJsonp(() => ({ data: fixture('itunes-lookup-song.json') }))
      const { conversion } = await lookupLink(APPLE_TRACK)
      expect(conversion).toEqual(
        withSearchFallbacks(fromItunesLookup(fixture('itunes-lookup-song.json'), APPLE_TRACK)),
      )
    })

    it('request Odesli twice and do not request Spotify oEmbed', async () => {
      const fetchMock = mockFetch(odesliFails)
      mockJsonp(() => ({ data: fixture('itunes-lookup-song.json') }))
      await lookupLink(APPLE_TRACK)
      expect(fetchedUrls(fetchMock)).toEqual([odesliUrl(APPLE_TRACK.link), odesliUrl(APPLE_TRACK.link)])
    })

    it('fall back to the exact iTunes lookup after two Odesli 429s', async () => {
      const fetchMock = mockFetch(odesliRateLimited)
      const loads = mockJsonp(() => ({ data: fixture('itunes-lookup-song.json') }))
      const { conversion } = await lookupLink(APPLE_TRACK)
      expect(fetchedUrls(fetchMock)).toHaveLength(2)
      expect(loads).toHaveLength(1)
      expect(conversion?.artist).toBe('Queen')
      expect(conversion?.links.apple).toBe(APPLE_TRACK.link)
      expect(conversion?.exact.apple).toBe(true)
    })

    it('offer no artist candidates', async () => {
      mockFetch(odesliRateLimited)
      mockJsonp(() => ({ data: fixture('itunes-lookup-song.json') }))
      const { conversion } = await lookupLink(APPLE_TRACK)
      expect(conversion?.candidates ?? []).toEqual([])
    })

    it('treat a failed iTunes JSONP load as no results and use the slug as the title', async () => {
      mockFetch(odesliFails)
      mockJsonp(() => 'error')
      const { conversion } = await lookupLink(APPLE_TRACK)
      expect(conversion).toEqual(withSearchFallbacks(fromItunesLookup(null, APPLE_TRACK)))
      expect(conversion?.title).toBe('Bohemian Rhapsody')
    })

    it('treat an iTunes JSONP timeout as no results', async () => {
      vi.useFakeTimers()
      mockFetch(odesliFails)
      mockJsonp(() => 'hang')
      const result = lookupLink(APPLE_TRACK)
      await vi.advanceTimersByTimeAsync(JSONP_TIMEOUT)
      const { conversion } = await result
      expect(conversion).toEqual(withSearchFallbacks(fromItunesLookup(null, APPLE_TRACK)))
    })

    it('return a null conversion when there is no title from iTunes or the slug', async () => {
      const noSlug: ParsedLink = { ...APPLE_TRACK, slug: '' }
      mockFetch(odesliFails)
      mockJsonp(() => ({ data: fixture('itunes-lookup-empty.json') }))
      const { conversion } = await lookupLink(noSlug)
      expect(conversion).toBeNull()
    })
  })

  describe('Spotify links when Odesli fails', () => {
    const oembedThen = (body: unknown) => (url: string) =>
      url === odesliUrl(SPOTIFY_TRACK.link) || url === odesliUrl(SPOTIFY_SHORT.link)
        ? odesliFails()
        : url === spotifyOembedUrl(SPOTIFY_TRACK.link) || url === spotifyOembedUrl(SPOTIFY_SHORT.link)
          ? jsonResponse(body)
          : Promise.reject(new Error(`unexpected fetch ${url}`))

    it('fetch oEmbed after both Odesli attempts, in that order', async () => {
      const fetchMock = mockFetch(oembedThen(fixture('spotify-oembed-track.json')))
      mockJsonp(() => ({ data: fixture('itunes-search-songs.json') }))
      await lookupLink(SPOTIFY_TRACK)
      expect(fetchedUrls(fetchMock)).toEqual([
        odesliUrl(SPOTIFY_TRACK.link),
        odesliUrl(SPOTIFY_TRACK.link),
        spotifyOembedUrl(SPOTIFY_TRACK.link),
      ])
    })

    it('search iTunes over JSONP for the oEmbed title', async () => {
      mockFetch(oembedThen(fixture('spotify-oembed-track.json')))
      const loads = mockJsonp(() => ({ data: fixture('itunes-search-songs.json') }))
      await lookupLink(SPOTIFY_TRACK)
      const expected = itunesSearchUrl('Bohemian Rhapsody - Remastered 2011', 'track')
      expect(loads.map((l) => l.src.startsWith(expected))).toEqual([true])
    })

    it('return the Spotify fallback result with search fallbacks filled in', async () => {
      mockFetch(oembedThen(fixture('spotify-oembed-track.json')))
      mockJsonp(() => ({ data: fixture('itunes-search-songs.json') }))
      const { conversion } = await lookupLink(SPOTIFY_TRACK)
      expect(conversion).toEqual(
        withSearchFallbacks(
          fromSpotifyFallback(
            fixture('spotify-oembed-track.json'),
            fixture('itunes-search-songs.json'),
            SPOTIFY_TRACK,
          ),
        ),
      )
    })

    it('treat a failed iTunes JSONP load as no results', async () => {
      mockFetch(oembedThen(fixture('spotify-oembed-track.json')))
      mockJsonp(() => 'error')
      const { conversion } = await lookupLink(SPOTIFY_TRACK)
      expect(conversion).toEqual(
        withSearchFallbacks(fromSpotifyFallback(fixture('spotify-oembed-track.json'), null, SPOTIFY_TRACK)),
      )
      expect(conversion?.exact.apple).toBe(false)
    })

    it('return a null conversion when the oEmbed request fails', async () => {
      mockFetch((url) =>
        url === odesliUrl(SPOTIFY_TRACK.link) ? odesliFails() : Promise.reject(new TypeError('Failed to fetch')),
      )
      mockJsonp(() => ({ data: fixture('itunes-search-songs.json') }))
      const { conversion } = await lookupLink(SPOTIFY_TRACK)
      expect(conversion).toBeNull()
    })

    it('make no iTunes request when the oEmbed request fails after two Odesli failures', async () => {
      const fetchMock = mockFetch((url) =>
        url === odesliUrl(SPOTIFY_TRACK.link)
          ? odesliRateLimited()
          : Promise.reject(new TypeError('Failed to fetch')),
      )
      const loads = mockJsonp(() => ({ data: fixture('itunes-search-songs.json') }))
      await lookupLink(SPOTIFY_TRACK)
      expect(fetchedUrls(fetchMock)).toEqual([
        odesliUrl(SPOTIFY_TRACK.link),
        odesliUrl(SPOTIFY_TRACK.link),
        spotifyOembedUrl(SPOTIFY_TRACK.link),
      ])
      expect(loads).toHaveLength(0)
    })
  })

  describe('Spotify short links when Odesli fails', () => {
    const shortLinkFetch = (oembed: unknown) => (url: string) =>
      url === odesliUrl(SPOTIFY_SHORT.link)
        ? odesliFails()
        : url === spotifyOembedUrl(SPOTIFY_SHORT.link)
          ? jsonResponse(oembed)
          : Promise.reject(new Error(`unexpected fetch ${url}`))

    it('return the parsed link resolved from the oEmbed player URL', async () => {
      mockFetch(shortLinkFetch(fixture('spotify-oembed-track.json')))
      mockJsonp(() => ({ data: fixture('itunes-search-songs.json') }))
      const { parsed } = await lookupLink(SPOTIFY_SHORT)
      expect(parsed).toEqual(SPOTIFY_TRACK)
    })

    it('use the resolved canonical link as the exact Spotify link', async () => {
      mockFetch(shortLinkFetch(fixture('spotify-oembed-track.json')))
      mockJsonp(() => ({ data: fixture('itunes-search-songs.json') }))
      const { conversion } = await lookupLink(SPOTIFY_SHORT)
      expect(conversion?.links.spotify).toBe(SPOTIFY_TRACK.link)
      expect(conversion?.exact.spotify).toBe(true)
    })

    it('search iTunes albums when the short link resolves to an album', async () => {
      mockFetch(shortLinkFetch(fixture('spotify-oembed-album.json')))
      const loads = mockJsonp(() => ({ data: fixture('itunes-search-albums.json') }))
      await lookupLink(SPOTIFY_SHORT)
      const expected = itunesSearchUrl('A Night At The Opera (2011 Remaster)', 'album')
      expect(loads.map((l) => l.src.startsWith(expected))).toEqual([true])
    })

    it('return a null conversion and the unresolved link when oEmbed has no player', async () => {
      mockFetch(shortLinkFetch(fixture('spotify-oembed-no-player.json')))
      const loads = mockJsonp(() => ({ data: fixture('itunes-search-songs.json') }))
      const { conversion, parsed } = await lookupLink(SPOTIFY_SHORT)
      expect(conversion).toBeNull()
      expect(parsed).toEqual(SPOTIFY_SHORT)
      expect(loads).toHaveLength(0)
    })
  })

  describe('Odesli retry', () => {
    // First Odesli attempt fails as `first` does; every later one answers.
    function odesliFailsOnce(first: () => Response | Promise<Response>) {
      let calls = 0
      return mockFetch((url) => {
        if (url.startsWith(SPOTIFY_OEMBED_URL)) {
          return Promise.reject(new Error(`unexpected fetch ${url}`))
        }
        calls += 1
        return calls === 1 ? first() : jsonResponse(fixture('odesli-track.json'))
      })
    }

    it('returns the Odesli result when the first attempt is a 429 and the second succeeds', async () => {
      odesliFailsOnce(odesliRateLimited)
      mockJsonp(() => ({ data: fixture('itunes-search-songs.json') }))
      const { conversion } = await lookupLink(SPOTIFY_TRACK)
      expect(conversion).toEqual(withSearchFallbacks(fromOdesli(fixture('odesli-track.json'))))
    })

    it('returns the Odesli result when the first attempt fails to fetch and the second succeeds', async () => {
      odesliFailsOnce(() => Promise.reject(new TypeError('Failed to fetch')))
      mockJsonp(() => ({ data: fixture('itunes-search-songs.json') }))
      const { conversion } = await lookupLink(SPOTIFY_TRACK)
      expect(conversion).toEqual(withSearchFallbacks(fromOdesli(fixture('odesli-track.json'))))
    })

    it('makes no oEmbed or iTunes request when the second attempt succeeds', async () => {
      const fetchMock = odesliFailsOnce(() => Promise.reject(new TypeError('Failed to fetch')))
      const loads = mockJsonp(() => ({ data: fixture('itunes-search-songs.json') }))
      await lookupLink(SPOTIFY_TRACK)
      expect(fetchedUrls(fetchMock)).toEqual([odesliUrl(SPOTIFY_TRACK.link), odesliUrl(SPOTIFY_TRACK.link)])
      expect(loads).toHaveLength(0)
    })

    it('retries an Apple link the same way before the iTunes lookup', async () => {
      const fetchMock = odesliFailsOnce(odesliRateLimited)
      const loads = mockJsonp(() => ({ data: fixture('itunes-lookup-song.json') }))
      const { conversion } = await lookupLink(APPLE_TRACK)
      expect(fetchedUrls(fetchMock)).toEqual([odesliUrl(APPLE_TRACK.link), odesliUrl(APPLE_TRACK.link)])
      expect(loads).toHaveLength(0)
      expect(conversion).toEqual(withSearchFallbacks(fromOdesli(fixture('odesli-track.json'))))
    })

    it('requests Odesli no more than twice when both attempts fail', async () => {
      const fetchMock = mockFetch((url) =>
        url.startsWith(SPOTIFY_OEMBED_URL)
          ? jsonResponse(fixture('spotify-oembed-track.json'))
          : odesliRateLimited(),
      )
      mockJsonp(() => ({ data: fixture('itunes-search-songs.json') }))
      await lookupLink(SPOTIFY_TRACK)
      const odesliCalls = fetchedUrls(fetchMock).filter((u) => u === odesliUrl(SPOTIFY_TRACK.link))
      expect(odesliCalls).toHaveLength(2)
    })
  })

  describe('the reported Spotify link when Odesli is rate-limited twice', () => {
    // Odesli answers 429 twice, oEmbed answers with the reported response and
    // iTunes search answers with `itunes`.
    function reportedCase(itunes: JsonpOutcome = { data: fixture('itunes-search-aint-gettin-high.json') }) {
      const fetchMock = mockFetch((url) =>
        url === odesliUrl(REPORTED.link)
          ? odesliRateLimited()
          : url === spotifyOembedUrl(REPORTED.link)
            ? jsonResponse(fixture('spotify-oembed-aint-gettin-high.json'))
            : Promise.reject(new Error(`unexpected fetch ${url}`)),
      )
      const loads = mockJsonp(() => itunes)
      return { fetchMock, loads }
    }

    it('requests Odesli twice, then oEmbed, then searches iTunes for the title', async () => {
      const { fetchMock, loads } = reportedCase()
      await lookupLink(REPORTED)
      expect(fetchedUrls(fetchMock)).toEqual([
        odesliUrl(REPORTED.link),
        odesliUrl(REPORTED.link),
        spotifyOembedUrl(REPORTED.link),
      ])
      expect(loads.map((l) => l.src.startsWith(itunesSearchUrl(REPORTED_TITLE, 'track')))).toEqual([true])
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

    it('returns a null conversion when the oEmbed request fails too', async () => {
      mockFetch((url) =>
        url === odesliUrl(REPORTED.link) ? odesliRateLimited() : Promise.reject(new TypeError('Failed to fetch')),
      )
      mockJsonp(() => ({ data: fixture('itunes-search-aint-gettin-high.json') }))
      const { conversion } = await lookupLink(REPORTED)
      expect(conversion).toBeNull()
    })
  })
})
