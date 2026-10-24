import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useConversion } from '../../src/hooks/useConversion'
import { withSearchFallbacks } from '../../src/lib/links'
import { SPOTIFY_OEMBED_URL } from '../../src/constants'
import { fromOdesli, odesliUrl } from '../../src/lib/lookup'
import type { ArtistCandidate, ParsedLink } from '../../src/lib/types'
import { fixture } from '../support/fixtures'
import {
  type Deferred,
  deferred,
  fetchedUrls,
  jsonResponse,
  jsonpScriptsInDocument,
  mockFetch,
  mockJsonp,
} from '../support/network'

// AC10 (conversion state) and, from PLAN-002, AC7 (choosing an artist candidate).
// The task interface names the result `conversion` and adds `isError`.

const INVALID_LINK_MESSAGE = 'That link isn’t a Spotify or Apple Music track or album.'
const LOOKING_UP_MESSAGE = 'Looking it up…'
const SHORT_LINK_MESSAGE =
  'Couldn’t open that short link. In Spotify, tap Share → Copy link, then paste the full open.spotify.com link.'
const NOT_FOUND_MESSAGE = 'Couldn’t find that one. Check the link and try again.'

const SPOTIFY_TRACK: ParsedLink = {
  src: 'spotify',
  kind: 'track',
  id: '4u7EnebtmKWzUH433cf5Qv',
  link: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv',
}
const SPOTIFY_TRACK_RAW = 'https://open.spotify.com/intl-de/track/4u7EnebtmKWzUH433cf5Qv?si=abc'
const APPLE_ALBUM_LINK = 'https://music.apple.com/us/album/a-night-at-the-opera-2011-remaster/1440806041'
const SHORT_LINK = 'https://spotify.link/aBcD1234'

const odesliFails = () => jsonResponse({}, 500)
const sharedLink = () => new URLSearchParams(window.location.search).get('u')

const ODESLI_TRACK = () => withSearchFallbacks(fromOdesli(fixture('odesli-track.json')))

// Odesli fails, oEmbed returns `oembed`, iTunes search returns the songs fixture.
function spotifyFallback(oembed: unknown) {
  mockFetch((url) =>
    url.startsWith(SPOTIFY_OEMBED_URL) ? jsonResponse(oembed) : odesliFails(),
  )
  mockJsonp(() => ({ data: fixture('itunes-search-songs.json') }))
}

async function convertAndSettle(raw: string) {
  const hook = renderHook(() => useConversion())
  act(() => hook.result.current.convert(raw))
  await waitFor(() => expect(hook.result.current.status).not.toBe('busy'))
  return hook
}

describe('useConversion', () => {
  it('starts idle with no conversion, no message and no error', () => {
    const { result } = renderHook(() => useConversion())
    expect(result.current.status).toBe('idle')
    expect(result.current.conversion).toBeNull()
    expect(result.current.message).toBe('')
    expect(result.current.isError).toBe(false)
  })

  describe('with input that does not parse', () => {
    it('sets the invalid-link error', () => {
      mockFetch(() => jsonResponse(fixture('odesli-track.json')))
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert('not a link'))
      expect(result.current.status).toBe('error')
      expect(result.current.isError).toBe(true)
      expect(result.current.message).toBe(INVALID_LINK_MESSAGE)
      expect(result.current.conversion).toBeNull()
    })

    it('makes no request', () => {
      const fetchMock = mockFetch(() => jsonResponse(fixture('odesli-track.json')))
      const loads = mockJsonp(() => ({ data: {} }))
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert('https://example.com/track/123'))
      expect(fetchMock).not.toHaveBeenCalled()
      expect(loads).toHaveLength(0)
      expect(jsonpScriptsInDocument()).toHaveLength(0)
    })

    it('treats empty input as invalid', () => {
      const fetchMock = mockFetch(() => jsonResponse(fixture('odesli-track.json')))
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(''))
      expect(result.current.message).toBe(INVALID_LINK_MESSAGE)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('while a lookup is running', () => {
    it('is busy with the looking-up message and no error', () => {
      mockFetch(() => deferred<Response>().promise)
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      expect(result.current.status).toBe('busy')
      expect(result.current.message).toBe(LOOKING_UP_MESSAGE)
      expect(result.current.isError).toBe(false)
    })

    it('looks up the canonical link', () => {
      const fetchMock = mockFetch(() => deferred<Response>().promise)
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      expect(fetchedUrls(fetchMock)).toEqual([odesliUrl(SPOTIFY_TRACK.link)])
    })
  })

  describe('on success', () => {
    it('is done with the conversion, an empty message and no error', async () => {
      mockFetch(() => jsonResponse(fixture('odesli-track.json')))
      const { result } = await convertAndSettle(SPOTIFY_TRACK_RAW)
      expect(result.current.status).toBe('done')
      expect(result.current.conversion).toEqual(ODESLI_TRACK())
      expect(result.current.message).toBe('')
      expect(result.current.isError).toBe(false)
    })

    it('replaces the page URL with ?u=<canonical link>', async () => {
      mockFetch(() => jsonResponse(fixture('odesli-track.json')))
      const historyLength = window.history.length
      await convertAndSettle(SPOTIFY_TRACK_RAW)
      expect(sharedLink()).toBe(SPOTIFY_TRACK.link)
      expect(window.history.length).toBe(historyLength)
    })

    it('shares the resolved canonical link for a short link', async () => {
      spotifyFallback(fixture('spotify-oembed-track.json'))
      const { result } = await convertAndSettle(SHORT_LINK)
      expect(result.current.status).toBe('done')
      expect(sharedLink()).toBe(SPOTIFY_TRACK.link)
    })
  })

  describe('on failure', () => {
    it('shows the short-link message when a spotify.link URL could not be resolved', async () => {
      spotifyFallback(fixture('spotify-oembed-no-player.json'))
      const { result } = await convertAndSettle(SHORT_LINK)
      expect(result.current.status).toBe('error')
      expect(result.current.isError).toBe(true)
      expect(result.current.message).toBe(SHORT_LINK_MESSAGE)
      expect(result.current.conversion).toBeNull()
    })

    it('shows the not-found message for a full link with no result', async () => {
      mockFetch((url) =>
        url === odesliUrl(SPOTIFY_TRACK.link) ? odesliFails() : Promise.reject(new TypeError('Failed to fetch')),
      )
      const { result } = await convertAndSettle(SPOTIFY_TRACK_RAW)
      expect(result.current.status).toBe('error')
      expect(result.current.isError).toBe(true)
      expect(result.current.message).toBe(NOT_FOUND_MESSAGE)
      expect(result.current.conversion).toBeNull()
    })

    it('shows the not-found message when Odesli answers with no title', async () => {
      mockFetch(() => jsonResponse(fixture('odesli-empty.json')))
      const { result } = await convertAndSettle(SPOTIFY_TRACK_RAW)
      expect(result.current.message).toBe(NOT_FOUND_MESSAGE)
    })

    it('leaves the page URL unchanged', async () => {
      mockFetch(() => jsonResponse(fixture('odesli-empty.json')))
      await convertAndSettle(SPOTIFY_TRACK_RAW)
      expect(sharedLink()).toBeNull()
    })
  })

  describe('with overlapping lookups', () => {
    // Each link's Odesli request waits on its own deferred response.
    function deferOdesli() {
      const pending = new Map<string, Deferred<Response>>()
      const fetchMock = mockFetch((url) => {
        const d = deferred<Response>()
        pending.set(url, d)
        return d.promise
      })
      const respond = (link: string, body: unknown) =>
        act(async () => pending.get(odesliUrl(link))!.resolve(jsonResponse(body)))
      return { fetchMock, respond }
    }

    const APPLE_ALBUM_ODESLI = {
      entityUniqueId: 'ITUNES_ALBUM::1440806041',
      entitiesByUniqueId: {
        'ITUNES_ALBUM::1440806041': { title: 'A Night At The Opera', artistName: 'Queen' },
      },
      linksByPlatform: { appleMusic: { url: APPLE_ALBUM_LINK } },
    }

    it('drops an older response that arrives after the newer one', async () => {
      const { respond } = deferOdesli()
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      act(() => result.current.convert(APPLE_ALBUM_LINK))
      await respond(APPLE_ALBUM_LINK, APPLE_ALBUM_ODESLI)
      await respond(SPOTIFY_TRACK.link, fixture('odesli-track.json'))
      expect(result.current.status).toBe('done')
      expect(result.current.conversion?.title).toBe('A Night At The Opera')
      expect(sharedLink()).toBe(APPLE_ALBUM_LINK)
    })

    it('stays busy when an older response arrives before the newer one', async () => {
      const { respond } = deferOdesli()
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      act(() => result.current.convert(APPLE_ALBUM_LINK))
      await respond(SPOTIFY_TRACK.link, fixture('odesli-track.json'))
      expect(result.current.status).toBe('busy')
      expect(result.current.conversion).toBeNull()
      expect(result.current.message).toBe(LOOKING_UP_MESSAGE)
      expect(sharedLink()).toBeNull()
    })

    it('shows the newer result once it arrives after an older one', async () => {
      const { respond } = deferOdesli()
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      act(() => result.current.convert(APPLE_ALBUM_LINK))
      await respond(SPOTIFY_TRACK.link, fixture('odesli-track.json'))
      await respond(APPLE_ALBUM_LINK, APPLE_ALBUM_ODESLI)
      expect(result.current.status).toBe('done')
      expect(result.current.conversion?.title).toBe('A Night At The Opera')
    })

    it('stays busy with the invalid-link error when invalid input arrives during a lookup', () => {
      deferOdesli()
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      act(() => result.current.convert('not a link'))
      expect(result.current.status).toBe('busy')
      expect(result.current.isError).toBe(true)
      expect(result.current.message).toBe(INVALID_LINK_MESSAGE)
      expect(result.current.conversion).toBeNull()
    })

    it('settles on the pending lookup result after invalid input arrived during it', async () => {
      const { respond } = deferOdesli()
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      act(() => result.current.convert('not a link'))
      await respond(SPOTIFY_TRACK.link, fixture('odesli-track.json'))
      expect(result.current.status).toBe('done')
      expect(result.current.conversion).toEqual(ODESLI_TRACK())
      expect(result.current.message).toBe('')
      expect(result.current.isError).toBe(false)
    })

    it('ignores a repeat convert of the same link while it is busy', () => {
      const { fetchMock } = deferOdesli()
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      act(() => result.current.convert(SPOTIFY_TRACK.link))
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(result.current.status).toBe('busy')
    })

    it('looks the same link up again once the earlier lookup has finished', async () => {
      const { fetchMock, respond } = deferOdesli()
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      await respond(SPOTIFY_TRACK.link, fixture('odesli-track.json'))
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(result.current.status).toBe('busy')
    })
  })

  describe('after unmount', () => {
    it('does not replace the page URL when the lookup finishes', async () => {
      const pending = deferred<Response>()
      mockFetch(() => pending.promise)
      const { result, unmount } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      unmount()
      await act(async () => pending.resolve(jsonResponse(fixture('odesli-track.json'))))
      expect(sharedLink()).toBeNull()
    })
  })

  describe('chooseArtist', () => {
    // The reported case: Odesli is rate-limited twice, oEmbed has no artist,
    // iTunes search returns several artists.
    const REPORTED_RAW = 'https://open.spotify.com/track/1yQDTSOyfVTCt9XWKQcnXb'
    const NEON: ArtistCandidate = {
      artist: 'The Neon Prairie Dogs',
      title: "Ain't Gettin' High",
      url: 'https://music.apple.com/us/album/aint-gettin-high/1601234567?i=1601234571',
    }
    const ZACH: ArtistCandidate = {
      artist: 'Zach Bryan',
      title: 'Younger Years',
      url: 'https://music.apple.com/us/album/younger-years/1640014741?i=1640014759',
    }

    async function convertedWithCandidates() {
      mockFetch((url) =>
        url.startsWith(SPOTIFY_OEMBED_URL)
          ? jsonResponse(fixture('spotify-oembed-aint-gettin-high.json'))
          : jsonResponse({}, 429),
      )
      mockJsonp(() => ({ data: fixture('itunes-search-aint-gettin-high.json') }))
      return convertAndSettle(REPORTED_RAW)
    }

    it('starts with a blank artist and three candidates', async () => {
      const { result } = await convertedWithCandidates()
      expect(result.current.conversion?.artist).toBe('')
      expect(result.current.conversion?.candidates?.map((c) => c.artist)).toEqual([
        'Samuel Cody Matson',
        'The Neon Prairie Dogs',
        'Zach Bryan',
      ])
    })

    it("sets the artist to the chosen candidate's artist", async () => {
      const { result } = await convertedWithCandidates()
      act(() => result.current.chooseArtist(NEON))
      expect(result.current.conversion?.artist).toBe('The Neon Prairie Dogs')
    })

    it("makes the chosen candidate's URL the exact Apple link", async () => {
      const { result } = await convertedWithCandidates()
      act(() => result.current.chooseArtist(NEON))
      expect(result.current.conversion?.links.apple).toBe(NEON.url)
      expect(result.current.conversion?.exact.apple).toBe(true)
    })

    it('rebuilds the YouTube Music search with the chosen artist', async () => {
      const { result } = await convertedWithCandidates()
      act(() => result.current.chooseArtist(NEON))
      expect(result.current.conversion?.links.ytm).toBe(
        "https://music.youtube.com/search?q=Ain't%20Gettin'%20High%20The%20Neon%20Prairie%20Dogs",
      )
    })

    it('keeps the candidates in the same order', async () => {
      const { result } = await convertedWithCandidates()
      const before = result.current.conversion!.candidates
      act(() => result.current.chooseArtist(NEON))
      expect(result.current.conversion?.candidates).toEqual(before)
    })

    it('switches to another candidate when a second one is chosen', async () => {
      const { result } = await convertedWithCandidates()
      act(() => result.current.chooseArtist(NEON))
      act(() => result.current.chooseArtist(ZACH))
      expect(result.current.conversion?.artist).toBe('Zach Bryan')
      expect(result.current.conversion?.links.apple).toBe(ZACH.url)
    })

    it('leaves the title, the Spotify link and the status as they were', async () => {
      const { result } = await convertedWithCandidates()
      act(() => result.current.chooseArtist(NEON))
      expect(result.current.conversion?.title).toBe("Ain't Gettin' High")
      expect(result.current.conversion?.links.spotify).toBe(REPORTED_RAW)
      expect(result.current.conversion?.exact.spotify).toBe(true)
      expect(result.current.status).toBe('done')
    })

    it('returns a new conversion and does not mutate the previous one', async () => {
      const { result } = await convertedWithCandidates()
      const previous = result.current.conversion!
      const snapshot = structuredClone(previous)
      act(() => result.current.chooseArtist(NEON))
      expect(result.current.conversion).not.toBe(previous)
      expect(previous).toEqual(snapshot)
    })

    it('does nothing when there is no conversion', () => {
      const { result } = renderHook(() => useConversion())
      act(() => result.current.chooseArtist(NEON))
      expect(result.current.conversion).toBeNull()
      expect(result.current.status).toBe('idle')
    })
  })
})
