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
import { fixture, odesliWithout } from '../support/fixtures'
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

// PLAN-003 T1 (AC1–AC5, AC8): one Odesli hop fills the platforms the first
// Odesli response lacks. The reported case is an Apple link to "Dirt" whose
// Odesli response has no Spotify link (odesli-apple-dirt.json); Odesli's
// answer for its YouTube Music link has one (odesli-ytm-dirt.json).
describe('lookupLink Odesli hop', () => {
  const DIRT: ParsedLink = {
    src: 'apple',
    kind: 'track',
    id: '6811936165',
    slug: 'dirt',
    link: 'https://music.apple.com/us/album/dirt/6811936164?i=6811936165',
  }
  const DIRT_FROM_SPOTIFY: ParsedLink = {
    src: 'spotify',
    kind: 'track',
    id: '0PlaceholderDirtTrack0',
    link: 'https://open.spotify.com/track/0PlaceholderDirtTrack0',
  }
  const DIRT_APPLE =
    'https://geo.music.apple.com/us/album/_/6811936164?i=6811936165&mt=1&app=music&ls=1&at=1000lHKX&ct=api_http&itscg=30200&itsct=odsl_m'
  const DIRT_YTM = 'https://music.youtube.com/watch?v=PLCHLDRdirt'
  const DIRT_YOUTUBE = 'https://www.youtube.com/watch?v=PLCHLDRdirt'
  const DIRT_SPOTIFY = 'https://open.spotify.com/track/0PlaceholderDirtTrack0'
  const DIRT_ARTIST = 'Placeholder Artist'
  const DIRT_ART =
    'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/aa/bb/cc/aabbccdd-placeholder/source/512x512bb.jpg'
  const DIRT_SPOTIFY_SEARCH = 'https://open.spotify.com/search/Dirt%20Placeholder%20Artist'
  const DIRT_APPLE_SEARCH = 'https://music.apple.com/us/search?term=Dirt%20Placeholder%20Artist'
  const HOP_URL = odesliUrl(DIRT_YTM)

  type Answer = () => Response | Promise<Response>
  const answer = (name: string): Answer => () => jsonResponse(fixture(name))
  const answerBody = (body: unknown): Answer => () => jsonResponse(body)
  const failsToFetch: Answer = () => Promise.reject(new TypeError('Failed to fetch'))

  // Odesli answers the source link with `first` and the hop URL with `hop`.
  // Any other request is unexpected; iTunes would answer if asked.
  function odesli(
    first: Answer,
    hop: Answer,
    { source = DIRT, hopUrl = HOP_URL }: { source?: ParsedLink; hopUrl?: string } = {},
  ) {
    const fetchMock = mockFetch((url) =>
      url === odesliUrl(source.link)
        ? first()
        : url === hopUrl
          ? hop()
          : Promise.reject(new Error(`unexpected fetch ${url}`)),
    )
    const loads = mockJsonp(() => ({ data: fixture('itunes-lookup-song.json') }))
    return { fetchMock, loads }
  }

  const reportedCase = (hop: Answer = answer('odesli-ytm-dirt.json')) =>
    odesli(answer('odesli-apple-dirt.json'), hop)

  describe('the reported Apple link, whose Odesli response lacks Spotify', () => {
    it("requests Odesli for the Apple link, then once for the first response's YouTube Music link", async () => {
      const { fetchMock } = reportedCase()
      await lookupLink(DIRT)
      expect(fetchedUrls(fetchMock)).toEqual([odesliUrl(DIRT.link), HOP_URL])
    })

    it('makes no oEmbed or iTunes request', async () => {
      const { fetchMock, loads } = reportedCase()
      await lookupLink(DIRT)
      expect(fetchedUrls(fetchMock).every((u) => u.startsWith('https://api.song.link/'))).toBe(true)
      expect(loads).toHaveLength(0)
    })

    it("links Spotify to the hop response's Spotify track, tagged exact", async () => {
      reportedCase()
      const { conversion } = await lookupLink(DIRT)
      expect(conversion?.links.spotify).toBe(DIRT_SPOTIFY)
      expect(conversion?.exact.spotify).toBe(true)
    })

    it("keeps the first response's Apple Music and YouTube Music links, tagged exact", async () => {
      reportedCase()
      const { conversion } = await lookupLink(DIRT)
      expect(conversion?.links.apple).toBe(DIRT_APPLE)
      expect(conversion?.links.ytm).toBe(DIRT_YTM)
      expect(conversion?.exact.apple).toBe(true)
      expect(conversion?.exact.ytm).toBe(true)
    })

    it("takes the title, artist and art from the first response's entity", async () => {
      reportedCase()
      const { conversion } = await lookupLink(DIRT)
      expect(conversion?.title).toBe('Dirt')
      expect(conversion?.artist).toBe(DIRT_ARTIST)
      expect(conversion?.art).toBe(DIRT_ART)
    })

    it('returns the parsed link it was given', async () => {
      reportedCase()
      const { parsed } = await lookupLink(DIRT)
      expect(parsed).toEqual(DIRT)
    })
  })

  describe('when the hop fails', () => {
    const failures: [string, Answer][] = [
      ['fails to fetch', failsToFetch],
      ['answers 429', odesliRateLimited],
      ['has no Spotify link', answerBody(odesliWithout('odesli-ytm-dirt.json', 'spotify'))],
    ]

    it.each(failures)('makes no further request of any kind when the hop %s', async (_, hop) => {
      const { fetchMock, loads } = reportedCase(hop)
      await lookupLink(DIRT)
      expect(fetchedUrls(fetchMock)).toEqual([odesliUrl(DIRT.link), HOP_URL])
      expect(loads).toHaveLength(0)
    })

    it.each(failures)('returns the first response with search fallbacks when the hop %s', async (_, hop) => {
      reportedCase(hop)
      const { conversion } = await lookupLink(DIRT)
      expect(conversion).toEqual(withSearchFallbacks(fromOdesli(fixture('odesli-apple-dirt.json'))))
    })

    it.each(failures)('links Spotify to a search, not tagged exact, when the hop %s', async (_, hop) => {
      reportedCase(hop)
      const { conversion } = await lookupLink(DIRT)
      expect(conversion?.links.spotify).toBe(DIRT_SPOTIFY_SEARCH)
      expect(conversion?.exact.spotify).toBe(false)
    })
  })

  describe('when the hop response disagrees with the first', () => {
    const mismatch = () => reportedCase(answer('odesli-ytm-dirt-mismatch.json'))

    it("keeps the first response's Apple Music and YouTube Music links", async () => {
      mismatch()
      const { conversion } = await lookupLink(DIRT)
      expect(conversion?.links.apple).toBe(DIRT_APPLE)
      expect(conversion?.links.ytm).toBe(DIRT_YTM)
    })

    it("keeps the first response's title, artist and art", async () => {
      mismatch()
      const { conversion } = await lookupLink(DIRT)
      expect(conversion?.title).toBe('Dirt')
      expect(conversion?.artist).toBe(DIRT_ARTIST)
      expect(conversion?.art).toBe(DIRT_ART)
    })

    it('fills only the Spotify link the first response lacked', async () => {
      mismatch()
      const { conversion } = await lookupLink(DIRT)
      expect(conversion?.links.spotify).toBe('https://open.spotify.com/track/0PlaceholderDirtLive00')
      expect(conversion?.exact).toEqual({ apple: true, spotify: true, ytm: true })
    })
  })

  describe('choosing the hop source', () => {
    it('hops on the youtube link when the first response has no youtubeMusic link', async () => {
      const first = odesliWithout('odesli-apple-dirt.json', 'youtubeMusic')
      const youtubeHop = odesliUrl(DIRT_YOUTUBE)
      const { fetchMock } = odesli(answerBody(first), answer('odesli-ytm-dirt.json'), {
        hopUrl: youtubeHop,
      })
      const { conversion } = await lookupLink(DIRT)
      expect(fetchedUrls(fetchMock)).toEqual([odesliUrl(DIRT.link), youtubeHop])
      expect(conversion?.links.spotify).toBe(DIRT_SPOTIFY)
      expect(conversion?.exact.spotify).toBe(true)
    })

    it('makes one Odesli request and links Spotify to a search when there is no hop source', async () => {
      const first = odesliWithout('odesli-apple-dirt.json', 'youtubeMusic', 'youtube')
      const { fetchMock, loads } = odesli(answerBody(first), answer('odesli-ytm-dirt.json'))
      const { conversion } = await lookupLink(DIRT)
      expect(fetchedUrls(fetchMock)).toEqual([odesliUrl(DIRT.link)])
      expect(loads).toHaveLength(0)
      expect(conversion?.links.spotify).toBe(DIRT_SPOTIFY_SEARCH)
      expect(conversion?.exact.spotify).toBe(false)
    })

    it('makes one Odesli request for odesli-partial.json, which has no hop source', async () => {
      const partial = fixture<object>('odesli-partial.json')
      const fetchMock = mockFetch(() =>
        jsonResponse({
          ...partial,
          entitiesByUniqueId: {
            'SPOTIFY_SONG::0000000000000000000000': { title: 'Song', artistName: 'Band' },
          },
        }),
      )
      const { conversion } = await lookupLink(SPOTIFY_TRACK)
      expect(fetchedUrls(fetchMock)).toEqual([odesliUrl(SPOTIFY_TRACK.link)])
      expect(conversion?.exact).toEqual({ apple: false, spotify: true, ytm: false })
    })
  })

  describe('a Spotify link whose Odesli response lacks Apple Music', () => {
    const spotifyCase = (hop: Answer = answer('odesli-ytm-dirt.json')) =>
      odesli(answer('odesli-spotify-dirt-no-apple.json'), hop, { source: DIRT_FROM_SPOTIFY })

    it("requests Odesli for the Spotify link, then for the first response's YouTube Music link", async () => {
      const { fetchMock, loads } = spotifyCase()
      await lookupLink(DIRT_FROM_SPOTIFY)
      expect(fetchedUrls(fetchMock)).toEqual([odesliUrl(DIRT_FROM_SPOTIFY.link), HOP_URL])
      expect(loads).toHaveLength(0)
    })

    it("links Apple Music to the hop response's Apple Music URL, tagged exact", async () => {
      spotifyCase()
      const { conversion } = await lookupLink(DIRT_FROM_SPOTIFY)
      expect(conversion?.links.apple).toBe(DIRT_APPLE)
      expect(conversion?.exact.apple).toBe(true)
    })

    it('keeps the Spotify link from the first response', async () => {
      spotifyCase()
      const { conversion } = await lookupLink(DIRT_FROM_SPOTIFY)
      expect(conversion?.links.spotify).toBe(DIRT_SPOTIFY)
      expect(conversion?.exact.spotify).toBe(true)
    })

    it('links Apple Music to a search, not tagged exact, when the hop has no Apple Music link', async () => {
      spotifyCase(answerBody(odesliWithout('odesli-ytm-dirt.json', 'appleMusic')))
      const { conversion } = await lookupLink(DIRT_FROM_SPOTIFY)
      expect(conversion?.links.apple).toBe(DIRT_APPLE_SEARCH)
      expect(conversion?.exact.apple).toBe(false)
    })
  })

  describe('when no hop happens', () => {
    it('makes one Odesli request for an Apple link whose response has all three platforms', async () => {
      const fetchMock = mockFetch(() => jsonResponse(fixture('odesli-track.json')))
      const loads = mockJsonp(() => ({ data: {} }))
      await lookupLink(APPLE_TRACK)
      expect(fetchedUrls(fetchMock)).toEqual([odesliUrl(APPLE_TRACK.link)])
      expect(loads).toHaveLength(0)
    })

    it('makes no hop request on the iTunes fallback after two Odesli failures', async () => {
      const { fetchMock, loads } = odesli(odesliRateLimited, answer('odesli-ytm-dirt.json'))
      const { conversion } = await lookupLink(DIRT)
      expect(fetchedUrls(fetchMock)).toEqual([odesliUrl(DIRT.link), odesliUrl(DIRT.link)])
      expect(loads.map((l) => l.src.startsWith(itunesLookupUrl(DIRT)))).toEqual([true])
      expect(conversion?.links.apple).toBe(DIRT.link)
    })
  })

  describe('after the Odesli retry', () => {
    // The first Odesli attempt answers 429; later ones answer the reported response.
    function retryThenHop(hop: Answer) {
      let attempts = 0
      return odesli(() => {
        attempts += 1
        return attempts === 1 ? odesliRateLimited() : jsonResponse(fixture('odesli-apple-dirt.json'))
      }, hop)
    }

    it('hops once after a successful retry and links Spotify exactly', async () => {
      const { fetchMock, loads } = retryThenHop(answer('odesli-ytm-dirt.json'))
      const { conversion } = await lookupLink(DIRT)
      expect(fetchedUrls(fetchMock)).toEqual([odesliUrl(DIRT.link), odesliUrl(DIRT.link), HOP_URL])
      expect(loads).toHaveLength(0)
      expect(conversion?.links.spotify).toBe(DIRT_SPOTIFY)
      expect(conversion?.exact.spotify).toBe(true)
    })

    it('requests Odesli at most three times when the hop fails too', async () => {
      const { fetchMock, loads } = retryThenHop(odesliRateLimited)
      const { conversion } = await lookupLink(DIRT)
      expect(fetchedUrls(fetchMock)).toEqual([odesliUrl(DIRT.link), odesliUrl(DIRT.link), HOP_URL])
      expect(loads).toHaveLength(0)
      expect(conversion).toEqual(withSearchFallbacks(fromOdesli(fixture('odesli-apple-dirt.json'))))
    })
  })
})
