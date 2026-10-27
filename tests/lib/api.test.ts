import { describe, expect, it, vi } from 'vitest'
import { jsonp, lookupLink } from '../../src/lib/api'
import { withSearchFallbacks } from '../../src/lib/links'
import {
  fromItunesLookup,
  fromSpotifyOembed,
  itunesLookupUrl,
  itunesSearchUrl,
  spotifyOembedUrl,
} from '../../src/lib/lookup'
import type { Conversion, ParsedLink } from '../../src/lib/types'
import {
  APPLE_ALBUM,
  APPLE_TRACK,
  REPORTED,
  REPORTED_CANDIDATES,
  REPORTED_THUMB,
  REPORTED_TITLE,
  SPOTIFY_SHORT,
  SPOTIFY_TRACK,
  UNIQUE,
  UNIQUE_CANDIDATES,
  UNIQUE_TITLE,
  mockAppleCase,
  mockReportedCase,
  mockSpotifyCase,
  mockUniqueCase,
} from '../support/cases'
import { fixture } from '../support/fixtures'
import {
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
// PLAN-004 AC1: no lookup requests a service other than oEmbed and iTunes.
// PLAN-004 AC2-AC4: the Apple and Spotify paths and their degraded paths.
// The mapping rules themselves are tested in lookup.test.ts and links.test.ts;
// here each link type's whole result is checked once.

const JSONP_TIMEOUT = 8000
const ITUNES_URL = 'https://itunes.apple.com/search?term=queen&entity=song'

const NOTHING_LIKELY = { apple: false, spotify: false, ytm: false }

// What the Spotify track link converts to, with the track oEmbed and the songs
// search: Queen and The Petersens both match, so no artist is picked.
const SPOTIFY_TRACK_CONVERSION: Conversion = {
  title: 'Bohemian Rhapsody - Remastered 2011',
  artist: '',
  art: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02ce4f1737bc8a646c8c4bd25a',
  links: {
    apple: 'https://music.apple.com/us/search?term=Bohemian%20Rhapsody%20-%20Remastered%202011',
    spotify: SPOTIFY_TRACK.link,
    ytm: 'https://music.youtube.com/search?q=Bohemian%20Rhapsody%20-%20Remastered%202011',
  },
  candidates: [
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
  ],
  exact: { apple: false, spotify: true, ytm: false },
  likely: NOTHING_LIKELY,
}

const callbackRegistered = (name: string) => name in window

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
    it('make one iTunes lookup over JSONP and no fetch', async () => {
      const { fetchMock, loads } = mockAppleCase()
      await lookupLink(APPLE_TRACK)
      expect(fetchedUrls(fetchMock)).toEqual([])
      expect(loads.map((l) => l.src.startsWith(itunesLookupUrl(APPLE_TRACK)))).toEqual([true])
    })

    it('make one iTunes album lookup and no fetch for an Apple album link', async () => {
      const { fetchMock, loads } = mockAppleCase({ data: fixture('itunes-lookup-album.json') })
      await lookupLink(APPLE_ALBUM)
      expect(fetchedUrls(fetchMock)).toEqual([])
      expect(loads.map((l) => l.src.startsWith(itunesLookupUrl(APPLE_ALBUM)))).toEqual([true])
    })

    // PLAN-004 AC6/AC8: Apple-source lookups never show LIKELY.
    it('return the lookup with the input link as the exact Apple link, "title artist" searches and nothing likely', async () => {
      mockAppleCase()
      expect(await lookupLink(APPLE_TRACK)).toEqual({
        parsed: APPLE_TRACK,
        conversion: {
          title: 'Bohemian Rhapsody',
          artist: 'Queen',
          art: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/27/0d/0e/270d0e2b/source/300x300bb.jpg',
          links: {
            apple: 'https://music.apple.com/us/album/bohemian-rhapsody/1440806041?i=1440806768',
            spotify: 'https://open.spotify.com/search/Bohemian%20Rhapsody%20Queen',
            ytm: 'https://music.youtube.com/search?q=Bohemian%20Rhapsody%20Queen',
          },
          exact: { apple: true, spotify: false, ytm: false },
          likely: NOTHING_LIKELY,
          spotifyAppSearch: 'spotify:search:Bohemian%20Rhapsody%20Queen',
        },
      })
    })

    it('treat a failed iTunes JSONP load as no results and use the slug as the title', async () => {
      mockAppleCase('error')
      const { conversion } = await lookupLink(APPLE_TRACK)
      expect(conversion).toEqual(withSearchFallbacks(fromItunesLookup(null, APPLE_TRACK)))
      expect(conversion?.title).toBe('Bohemian Rhapsody')
      expect(conversion?.artist).toBe('')
    })

    it('treat an iTunes JSONP timeout as no results', async () => {
      vi.useFakeTimers()
      mockAppleCase('hang')
      const result = lookupLink(APPLE_TRACK)
      await vi.advanceTimersByTimeAsync(JSONP_TIMEOUT)
      const { conversion } = await result
      expect(conversion).toEqual(withSearchFallbacks(fromItunesLookup(null, APPLE_TRACK)))
    })

    it('use the slug as the title and a blank artist when iTunes returns no results', async () => {
      mockAppleCase({ data: fixture('itunes-lookup-empty.json') })
      const { conversion } = await lookupLink(APPLE_TRACK)
      expect(conversion?.title).toBe('Bohemian Rhapsody')
      expect(conversion?.artist).toBe('')
      expect(conversion?.links.apple).toBe(APPLE_TRACK.link)
      expect(conversion?.exact.apple).toBe(true)
    })

    it('make no further request after a failed iTunes load', async () => {
      const { fetchMock, loads } = mockAppleCase('error')
      await lookupLink(APPLE_TRACK)
      expect(fetchedUrls(fetchMock)).toEqual([])
      expect(loads).toHaveLength(1)
    })

    it('return a null conversion when there is no title from iTunes or the slug', async () => {
      const noSlug: ParsedLink = { ...APPLE_TRACK, slug: '' }
      mockAppleCase({ data: fixture('itunes-lookup-empty.json') })
      const { conversion } = await lookupLink(noSlug)
      expect(conversion).toBeNull()
    })
  })

  describe('Spotify links', () => {
    it('fetch only the oEmbed for the link, once', async () => {
      const { fetchMock } = mockSpotifyCase()
      await lookupLink(SPOTIFY_TRACK)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_TRACK.link)])
    })

    it('search iTunes over JSONP for the oEmbed title', async () => {
      const { loads } = mockSpotifyCase()
      await lookupLink(SPOTIFY_TRACK)
      const expected = itunesSearchUrl('Bohemian Rhapsody - Remastered 2011', 'track')
      expect(loads.map((l) => l.src.startsWith(expected))).toEqual([true])
    })

    // PLAN-004 AC6: two artists match after cleaning, so nothing is likely.
    it('return the oEmbed title and art, the exact Spotify link, title searches, the candidates and nothing likely', async () => {
      mockSpotifyCase()
      expect(await lookupLink(SPOTIFY_TRACK)).toEqual({
        parsed: SPOTIFY_TRACK,
        conversion: SPOTIFY_TRACK_CONVERSION,
      })
    })

    it('treat a failed iTunes JSONP load as no results', async () => {
      mockFetchOnly({ [spotifyOembedUrl(SPOTIFY_TRACK.link)]: answerJson(fixture('spotify-oembed-track.json')) })
      mockJsonp(() => 'error')
      const { conversion } = await lookupLink(SPOTIFY_TRACK)
      expect(conversion).toEqual(
        withSearchFallbacks(fromSpotifyOembed(fixture('spotify-oembed-track.json'), null, SPOTIFY_TRACK)),
      )
      expect(conversion?.exact.apple).toBe(false)
    })

    it('return a null conversion when the oEmbed request fails', async () => {
      mockSpotifyCase(SPOTIFY_TRACK.link, failsToFetch)
      const { conversion } = await lookupLink(SPOTIFY_TRACK)
      expect(conversion).toBeNull()
    })

    it.each([404, 429, 500])(
      'return a null conversion when oEmbed answers %i',
      async (status) => {
        mockSpotifyCase(SPOTIFY_TRACK.link, answerJson({}, status))
        const { conversion } = await lookupLink(SPOTIFY_TRACK)
        expect(conversion).toBeNull()
      },
    )

    it('make exactly one request and no iTunes request when the oEmbed request fails', async () => {
      const { fetchMock, loads } = mockSpotifyCase(SPOTIFY_TRACK.link, failsToFetch)
      await lookupLink(SPOTIFY_TRACK)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_TRACK.link)])
      expect(loads).toHaveLength(0)
    })

    it.each([404, 429, 500])(
      'make exactly one request and no iTunes request when oEmbed answers %i',
      async (status) => {
        const { fetchMock, loads } = mockSpotifyCase(SPOTIFY_TRACK.link, answerJson({}, status))
        await lookupLink(SPOTIFY_TRACK)
        expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_TRACK.link)])
        expect(loads).toHaveLength(0)
      },
    )

    it('return the parsed link they were given when the oEmbed request fails', async () => {
      mockSpotifyCase(SPOTIFY_TRACK.link, failsToFetch)
      const { parsed } = await lookupLink(SPOTIFY_TRACK)
      expect(parsed).toEqual(SPOTIFY_TRACK)
    })

    // MR-011 N2 / PLAN-004 AC6: a blank oEmbed title ends in NOT_FOUND, with
    // no iTunes search.
    it.each(['', '   '])(
      'return a null conversion after one request and no iTunes search when the oEmbed title is %j',
      async (title) => {
        const { fetchMock, loads } = mockSpotifyCase(
          SPOTIFY_TRACK.link,
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
      const { loads } = mockSpotifyCase(SPOTIFY_TRACK.link, answerJson(untitled))
      const { conversion } = await lookupLink(SPOTIFY_TRACK)
      expect(conversion).toBeNull()
      expect(loads).toHaveLength(0)
    })
  })

  // PLAN-004 AC5: a Spotify track whose iTunes results have exactly one
  // artist with the same cleaned title.
  describe('a Spotify link with a unique iTunes match', () => {
    it('fetches the oEmbed once, then makes one iTunes search for the original title', async () => {
      const { fetchMock, loads } = mockUniqueCase()
      await lookupLink(UNIQUE)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(UNIQUE.link)])
      expect(loads.map((l) => l.src.startsWith(itunesSearchUrl(UNIQUE_TITLE, 'track')))).toEqual([true])
    })

    it("returns the matching artist, that artist's song as the likely Apple link, the exact Spotify link and a \"title artist\" YouTube Music search", async () => {
      mockUniqueCase()
      expect(await lookupLink(UNIQUE)).toEqual({
        parsed: UNIQUE,
        conversion: {
          title: "Rollin' Down To Memphis - Remastered 2015",
          artist: 'Marlow Vance',
          art: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02f0e1d2c3b4a5968778695a4b',
          links: {
            apple: 'https://music.apple.com/us/album/rollin-down-to-memphis/1587654321?i=1587654329',
            spotify: UNIQUE.link,
            ytm: "https://music.youtube.com/search?q=Rollin'%20Down%20To%20Memphis%20-%20Remastered%202015%20Marlow%20Vance",
          },
          candidates: UNIQUE_CANDIDATES,
          exact: { apple: false, spotify: true, ytm: false },
          likely: { apple: true, spotify: false, ytm: false },
        },
      })
    })
  })

  describe('Spotify short links', () => {
    it('fetch only the oEmbed for the short link, once', async () => {
      const { fetchMock } = mockSpotifyCase(SPOTIFY_SHORT.link)
      await lookupLink(SPOTIFY_SHORT)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_SHORT.link)])
    })

    it('return the parsed link resolved from the oEmbed player URL and its conversion, with the canonical link as the exact Spotify link', async () => {
      mockSpotifyCase(SPOTIFY_SHORT.link)
      expect(await lookupLink(SPOTIFY_SHORT)).toEqual({
        parsed: SPOTIFY_TRACK,
        conversion: SPOTIFY_TRACK_CONVERSION,
      })
    })

    it('search iTunes albums when the short link resolves to an album', async () => {
      const { loads } = mockSpotifyCase(SPOTIFY_SHORT.link, answerJson(fixture('spotify-oembed-album.json')))
      await lookupLink(SPOTIFY_SHORT)
      const expected = itunesSearchUrl('A Night At The Opera (2011 Remaster)', 'album')
      expect(loads.map((l) => l.src.startsWith(expected))).toEqual([true])
    })

    it('return a null conversion and the unresolved link when oEmbed has no player', async () => {
      const { fetchMock, loads } = mockSpotifyCase(
        SPOTIFY_SHORT.link,
        answerJson(fixture('spotify-oembed-no-player.json')),
      )
      const { conversion, parsed } = await lookupLink(SPOTIFY_SHORT)
      expect(conversion).toBeNull()
      expect(parsed).toEqual(SPOTIFY_SHORT)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_SHORT.link)])
      expect(loads).toHaveLength(0)
    })

    it('return a null conversion and the unresolved link when the oEmbed request fails', async () => {
      const { fetchMock, loads } = mockSpotifyCase(SPOTIFY_SHORT.link, failsToFetch)
      const { conversion, parsed } = await lookupLink(SPOTIFY_SHORT)
      expect(conversion).toBeNull()
      expect(parsed).toEqual(SPOTIFY_SHORT)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_SHORT.link)])
      expect(loads).toHaveLength(0)
    })
  })

  // PLAN-004 AC3/AC4: the reported link, looked up with oEmbed and iTunes only.
  describe('the reported Spotify link', () => {
    it('fetches the oEmbed once, then makes one iTunes search over JSONP for the title, in that order', async () => {
      // Records every request, fetch or JSONP, in order.
      const requests: string[] = []
      const oembed = answerJson(fixture('spotify-oembed-aint-gettin-high.json'))
      const fetchMock = mockFetchOnly({
        [spotifyOembedUrl(REPORTED.link)]: () => {
          requests.push(`fetch ${spotifyOembedUrl(REPORTED.link)}`)
          return oembed()
        },
      })
      const loads = mockJsonp((src) => {
        requests.push(`jsonp ${src}`)
        return { data: fixture('itunes-search-aint-gettin-high.json') }
      })
      await lookupLink(REPORTED)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(REPORTED.link)])
      expect(loads.map((l) => l.src.startsWith(itunesSearchUrl(REPORTED_TITLE, 'track')))).toEqual([true])
      expect(requests).toEqual([`fetch ${spotifyOembedUrl(REPORTED.link)}`, `jsonp ${loads[0].src}`])
    })

    // PLAN-004 AC6: two artists have the title, so nothing is likely.
    it('returns the oEmbed title and art, a blank artist, title-only searches, the exact Spotify link, the candidates and nothing likely', async () => {
      mockReportedCase()
      expect(await lookupLink(REPORTED)).toEqual({
        parsed: REPORTED,
        conversion: {
          title: "Ain't Gettin' High",
          artist: '',
          art: REPORTED_THUMB,
          links: {
            apple: "https://music.apple.com/us/search?term=Ain't%20Gettin'%20High",
            spotify: REPORTED.link,
            ytm: "https://music.youtube.com/search?q=Ain't%20Gettin'%20High",
          },
          candidates: REPORTED_CANDIDATES,
          exact: { apple: false, spotify: true, ytm: false },
          likely: NOTHING_LIKELY,
        },
      })
    })

    it('offers no candidates and still a title-only Apple search when iTunes finds nothing', async () => {
      mockReportedCase({ data: fixture('itunes-search-empty.json') })
      const { conversion } = await lookupLink(REPORTED)
      expect(conversion?.title).toBe(REPORTED_TITLE)
      expect(conversion?.artist).toBe('')
      expect(conversion?.candidates ?? []).toEqual([])
      expect(conversion?.links.apple).toBe("https://music.apple.com/us/search?term=Ain't%20Gettin'%20High")
      expect(conversion?.exact.apple).toBe(false)
    })

    it('offers no candidates and still a title-only Apple search when the iTunes JSONP load fails', async () => {
      mockReportedCase('error')
      const { conversion } = await lookupLink(REPORTED)
      expect(conversion?.title).toBe(REPORTED_TITLE)
      expect(conversion?.artist).toBe('')
      expect(conversion?.candidates ?? []).toEqual([])
      expect(conversion?.links.apple).toBe("https://music.apple.com/us/search?term=Ain't%20Gettin'%20High")
      expect(conversion?.exact.apple).toBe(false)
    })

    it('offers no candidates and still a title-only Apple search when the iTunes JSONP load times out', async () => {
      vi.useFakeTimers()
      const { fetchMock, loads } = mockReportedCase('hang')
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
      const { fetchMock, loads } = mockReportedCase('error')
      await lookupLink(REPORTED)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(REPORTED.link)])
      expect(loads).toHaveLength(1)
    })

    it('returns a null conversion after exactly one request when the oEmbed request fails', async () => {
      const { fetchMock, loads } = mockSpotifyCase(REPORTED.link, failsToFetch)
      const { conversion } = await lookupLink(REPORTED)
      expect(conversion).toBeNull()
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(REPORTED.link)])
      expect(loads).toHaveLength(0)
    })
  })
})
