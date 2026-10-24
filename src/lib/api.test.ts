import { describe, expect, it, vi } from 'vitest'
import { jsonp, lookupLink } from './api'
import { withSearchFallbacks } from './links'
import {
  fromItunesLookup,
  fromOdesli,
  fromSpotifyFallback,
  itunesLookupUrl,
  itunesSearchUrl,
  odesliUrl,
  spotifyOembedUrl,
} from './lookup'
import type { ParsedLink } from './types'
import { fixture } from '../test/fixtures'
import {
  fetchedUrls,
  jsonResponse,
  jsonpScriptsInDocument,
  mockFetch,
  mockJsonp,
} from '../test/network'

// AC9: lookupLink tries Odesli, falls back by source, fills search links,
// and JSONP times out after 8 s and always cleans up.

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

    it('do not request Spotify oEmbed', async () => {
      const fetchMock = mockFetch(odesliFails)
      mockJsonp(() => ({ data: fixture('itunes-lookup-song.json') }))
      await lookupLink(APPLE_TRACK)
      expect(fetchedUrls(fetchMock)).toEqual([odesliUrl(APPLE_TRACK.link)])
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

    it('fetch oEmbed after Odesli, in that order', async () => {
      const fetchMock = mockFetch(oembedThen(fixture('spotify-oembed-track.json')))
      mockJsonp(() => ({ data: fixture('itunes-search-songs.json') }))
      await lookupLink(SPOTIFY_TRACK)
      expect(fetchedUrls(fetchMock)).toEqual([
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
})
