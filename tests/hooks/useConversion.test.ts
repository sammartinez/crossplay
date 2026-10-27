import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useConversion } from '../../src/hooks/useConversion'
import { withSearchFallbacks } from '../../src/lib/links'
import { fromSpotifyOembed, spotifyOembedUrl } from '../../src/lib/lookup'
import {
  APPLE_ALBUM,
  INVALID_LINK_MESSAGE,
  LOOKING_UP_MESSAGE,
  NOT_FOUND_MESSAGE,
  REPORTED,
  REPORTED_CANDIDATES,
  SHORT_LINK_MESSAGE,
  SPOTIFY_ALBUM,
  SPOTIFY_SHORT,
  SPOTIFY_TRACK,
  SPOTIFY_TRACK_RAW,
  UNIQUE,
  UNIQUE_CANDIDATES,
  mockAppleCase,
  mockReportedCase,
  mockSpotifyCase,
  mockUniqueCase,
} from '../support/cases'
import { fixture } from '../support/fixtures'
import {
  type Deferred,
  type JsonpLoad,
  answerJson,
  deferred,
  failsToFetch,
  fetchedUrls,
  jsonResponse,
  jsonpScriptsInDocument,
  mockFetchOnly,
  mockJsonp,
} from '../support/network'

// AC10 (conversion state) and, from PLAN-002, AC7 (choosing an artist candidate).
// The task interface names the result `conversion` and adds `isError`.
// PLAN-004 AC1/AC9: lookups go straight to oEmbed/iTunes.
// What choosing an artist does to a conversion is tested in links.test.ts
// (withArtistChoice); here only the hook's state and wiring are.

const sharedLink = () => new URLSearchParams(window.location.search).get('u')

// iTunes search answers albums for an album search and songs otherwise, as in
// mockSpotifyCase.
const itunesSearch = (src: string) => ({
  data: fixture(src.includes('entity=album') ? 'itunes-search-albums.json' : 'itunes-search-songs.json'),
})

// What a Spotify track lookup gives with the track oEmbed and the songs search.
const SPOTIFY_TRACK_RESULT = () =>
  withSearchFallbacks(
    fromSpotifyOembed(
      fixture('spotify-oembed-track.json'),
      fixture('itunes-search-songs.json'),
      SPOTIFY_TRACK,
    ),
  )

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
      mockFetchOnly({})
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert('not a link'))
      expect(result.current.status).toBe('error')
      expect(result.current.isError).toBe(true)
      expect(result.current.message).toBe(INVALID_LINK_MESSAGE)
      expect(result.current.conversion).toBeNull()
    })

    it('makes no request', () => {
      const fetchMock = mockFetchOnly({})
      const loads = mockJsonp(() => ({ data: {} }))
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert('https://example.com/track/123'))
      expect(fetchMock).not.toHaveBeenCalled()
      expect(loads).toHaveLength(0)
      expect(jsonpScriptsInDocument()).toHaveLength(0)
    })

    it('treats empty input as invalid', () => {
      const fetchMock = mockFetchOnly({})
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(''))
      expect(result.current.message).toBe(INVALID_LINK_MESSAGE)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('while a lookup is running', () => {
    it('is busy with the looking-up message and no error', () => {
      mockSpotifyCase(SPOTIFY_TRACK.link, () => deferred<Response>().promise)
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      expect(result.current.status).toBe('busy')
      expect(result.current.message).toBe(LOOKING_UP_MESSAGE)
      expect(result.current.isError).toBe(false)
    })

    it('looks up the canonical link with oEmbed only', () => {
      const { fetchMock } = mockSpotifyCase(SPOTIFY_TRACK.link, () => deferred<Response>().promise)
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_TRACK.link)])
    })
  })

  describe('on success', () => {
    it('is done with the conversion, an empty message and no error', async () => {
      mockSpotifyCase()
      const { result } = await convertAndSettle(SPOTIFY_TRACK_RAW)
      expect(result.current.status).toBe('done')
      expect(result.current.conversion).toEqual(SPOTIFY_TRACK_RESULT())
      expect(result.current.message).toBe('')
      expect(result.current.isError).toBe(false)
    })

    it('makes one oEmbed request and one iTunes search for a Spotify link', async () => {
      const { fetchMock, loads } = mockSpotifyCase()
      await convertAndSettle(SPOTIFY_TRACK_RAW)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_TRACK.link)])
      expect(loads).toHaveLength(1)
    })

    it('is done with an Apple link after one iTunes lookup and no fetch', async () => {
      const { fetchMock, loads } = mockAppleCase({ data: fixture('itunes-lookup-album.json') })
      const { result } = await convertAndSettle(APPLE_ALBUM.link)
      expect(result.current.status).toBe('done')
      expect(result.current.conversion?.title).toBe('A Night At The Opera (2011 Remaster)')
      expect(result.current.conversion?.artist).toBe('Queen')
      expect(fetchedUrls(fetchMock)).toEqual([])
      expect(loads).toHaveLength(1)
    })

    it('replaces the page URL with ?u=<canonical link>', async () => {
      mockSpotifyCase()
      const historyLength = window.history.length
      await convertAndSettle(SPOTIFY_TRACK_RAW)
      expect(sharedLink()).toBe(SPOTIFY_TRACK.link)
      expect(window.history.length).toBe(historyLength)
    })

    it('shares the resolved canonical link for a short link', async () => {
      mockSpotifyCase(SPOTIFY_SHORT.link)
      const { result } = await convertAndSettle(SPOTIFY_SHORT.link)
      expect(result.current.status).toBe('done')
      expect(sharedLink()).toBe(SPOTIFY_TRACK.link)
    })
  })

  describe('on failure', () => {
    it('shows the short-link message when a spotify.link URL could not be resolved', async () => {
      mockSpotifyCase(SPOTIFY_SHORT.link, answerJson(fixture('spotify-oembed-no-player.json')))
      const { result } = await convertAndSettle(SPOTIFY_SHORT.link)
      expect(result.current.status).toBe('error')
      expect(result.current.isError).toBe(true)
      expect(result.current.message).toBe(SHORT_LINK_MESSAGE)
      expect(result.current.conversion).toBeNull()
    })

    it('shows the not-found message when the oEmbed request fails', async () => {
      mockSpotifyCase(SPOTIFY_TRACK.link, failsToFetch)
      const { result } = await convertAndSettle(SPOTIFY_TRACK_RAW)
      expect(result.current.status).toBe('error')
      expect(result.current.isError).toBe(true)
      expect(result.current.message).toBe(NOT_FOUND_MESSAGE)
      expect(result.current.conversion).toBeNull()
    })

    it('shows the not-found message after one request when oEmbed answers non-OK', async () => {
      const { fetchMock } = mockSpotifyCase(SPOTIFY_TRACK.link, answerJson({}, 404))
      const { result } = await convertAndSettle(SPOTIFY_TRACK_RAW)
      expect(result.current.message).toBe(NOT_FOUND_MESSAGE)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_TRACK.link)])
    })

    // MR-011 N2 / PLAN-004 AC6: a blank oEmbed title is not a result.
    it('shows the not-found message, with no iTunes search, when the oEmbed title is blank', async () => {
      const { fetchMock, loads } = mockSpotifyCase(
        SPOTIFY_TRACK.link,
        answerJson({ ...fixture<object>('spotify-oembed-track.json'), title: '' }),
      )
      const { result } = await convertAndSettle(SPOTIFY_TRACK_RAW)
      expect(result.current.status).toBe('error')
      expect(result.current.isError).toBe(true)
      expect(result.current.message).toBe(NOT_FOUND_MESSAGE)
      expect(result.current.conversion).toBeNull()
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_TRACK.link)])
      expect(loads).toHaveLength(0)
    })

    it('leaves the page URL unchanged', async () => {
      mockSpotifyCase(SPOTIFY_TRACK.link, answerJson({}, 404))
      await convertAndSettle(SPOTIFY_TRACK_RAW)
      expect(sharedLink()).toBeNull()
    })
  })

  describe('with overlapping lookups', () => {
    // Each Spotify link's oEmbed request waits on its own deferred response;
    // iTunes search answers at once. `respond` answers one link's oEmbed and
    // waits until that lookup has finished.
    function deferOembed() {
      const pending = new Map<string, Deferred<Response>>()
      const later = (link: string) => () => {
        const d = deferred<Response>()
        pending.set(link, d)
        return d.promise
      }
      const fetchMock = mockFetchOnly({
        [spotifyOembedUrl(SPOTIFY_TRACK.link)]: later(SPOTIFY_TRACK.link),
        [spotifyOembedUrl(SPOTIFY_ALBUM.link)]: later(SPOTIFY_ALBUM.link),
      })
      const loads: JsonpLoad[] = mockJsonp(itunesSearch)
      const respond = async (link: string, body: unknown) => {
        const before = loads.length
        await vi.waitFor(() => expect(pending.has(link)).toBe(true))
        await act(async () => pending.get(link)!.resolve(jsonResponse(body)))
        await vi.waitFor(() => expect(loads.length).toBe(before + 1))
        await act(async () => new Promise((r) => setTimeout(r, 0)))
      }
      return { fetchMock, respond }
    }

    const ALBUM_TITLE = 'A Night At The Opera (2011 Remaster)'

    it('drops an older response that arrives after the newer one', async () => {
      const { respond } = deferOembed()
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      act(() => result.current.convert(SPOTIFY_ALBUM.link))
      await respond(SPOTIFY_ALBUM.link, fixture('spotify-oembed-album.json'))
      await respond(SPOTIFY_TRACK.link, fixture('spotify-oembed-track.json'))
      expect(result.current.status).toBe('done')
      expect(result.current.conversion?.title).toBe(ALBUM_TITLE)
      expect(sharedLink()).toBe(SPOTIFY_ALBUM.link)
    })

    it('stays busy when an older response arrives before the newer one', async () => {
      const { respond } = deferOembed()
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      act(() => result.current.convert(SPOTIFY_ALBUM.link))
      await respond(SPOTIFY_TRACK.link, fixture('spotify-oembed-track.json'))
      expect(result.current.status).toBe('busy')
      expect(result.current.conversion).toBeNull()
      expect(result.current.message).toBe(LOOKING_UP_MESSAGE)
      expect(sharedLink()).toBeNull()
    })

    it('shows the newer result once it arrives after an older one', async () => {
      const { respond } = deferOembed()
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      act(() => result.current.convert(SPOTIFY_ALBUM.link))
      await respond(SPOTIFY_TRACK.link, fixture('spotify-oembed-track.json'))
      await respond(SPOTIFY_ALBUM.link, fixture('spotify-oembed-album.json'))
      expect(result.current.status).toBe('done')
      expect(result.current.conversion?.title).toBe(ALBUM_TITLE)
    })

    it('stays busy with the invalid-link error when invalid input arrives during a lookup', () => {
      deferOembed()
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      act(() => result.current.convert('not a link'))
      expect(result.current.status).toBe('busy')
      expect(result.current.isError).toBe(true)
      expect(result.current.message).toBe(INVALID_LINK_MESSAGE)
      expect(result.current.conversion).toBeNull()
    })

    it('settles on the pending lookup result after invalid input arrived during it', async () => {
      const { respond } = deferOembed()
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      act(() => result.current.convert('not a link'))
      await respond(SPOTIFY_TRACK.link, fixture('spotify-oembed-track.json'))
      expect(result.current.status).toBe('done')
      expect(result.current.conversion).toEqual(SPOTIFY_TRACK_RESULT())
      expect(result.current.message).toBe('')
      expect(result.current.isError).toBe(false)
    })

    it('ignores a repeat convert of the same link while it is busy', () => {
      const { fetchMock } = deferOembed()
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      act(() => result.current.convert(SPOTIFY_TRACK.link))
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(result.current.status).toBe('busy')
    })

    it('looks the same link up again once the earlier lookup has finished', async () => {
      const { fetchMock, respond } = deferOembed()
      const { result } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      await respond(SPOTIFY_TRACK.link, fixture('spotify-oembed-track.json'))
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(result.current.status).toBe('busy')
    })
  })

  describe('after unmount', () => {
    it('does not replace the page URL when the lookup finishes', async () => {
      const pending = deferred<Response>()
      const { loads } = mockSpotifyCase(SPOTIFY_TRACK.link, () => pending.promise)
      const { result, unmount } = renderHook(() => useConversion())
      act(() => result.current.convert(SPOTIFY_TRACK_RAW))
      unmount()
      await act(async () => pending.resolve(jsonResponse(fixture('spotify-oembed-track.json'))))
      await vi.waitFor(() => expect(loads).toHaveLength(1))
      await act(async () => new Promise((r) => setTimeout(r, 0)))
      expect(sharedLink()).toBeNull()
    })
  })

  describe('chooseArtist', () => {
    // The reported case: oEmbed has no artist, iTunes search returns several
    // artists.
    const [, NEON] = REPORTED_CANDIDATES

    async function convertedWithCandidates() {
      mockReportedCase()
      return convertAndSettle(REPORTED.link)
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

    it('leaves the title, the Spotify link and the status as they were', async () => {
      const { result } = await convertedWithCandidates()
      act(() => result.current.chooseArtist(NEON))
      expect(result.current.conversion?.title).toBe("Ain't Gettin' High")
      expect(result.current.conversion?.links.spotify).toBe(REPORTED.link)
      expect(result.current.conversion?.exact.spotify).toBe(true)
      expect(result.current.status).toBe('done')
    })

    // PLAN-004 AC7: choosing a candidate after an auto-pick.
    describe('after an auto-pick', () => {
      const UNIQUE_RAW = `${UNIQUE.link}?si=xyz`
      const [MARLOW, , HARPER] = UNIQUE_CANDIDATES
      const NOTHING_LIKELY = { apple: false, spotify: false, ytm: false }

      async function convertedWithAutoPick() {
        mockUniqueCase()
        return convertAndSettle(UNIQUE_RAW)
      }

      it('starts with the auto-picked artist and a likely Apple link', async () => {
        const { result } = await convertedWithAutoPick()
        expect(result.current.conversion?.artist).toBe('Marlow Vance')
        expect(result.current.conversion?.links.apple).toBe(MARLOW.url)
        expect(result.current.conversion?.likely.apple).toBe(true)
        expect(result.current.conversion?.exact.apple).toBe(false)
      })

      it('makes the Apple link exact and not likely when the auto-picked artist is chosen', async () => {
        const { result } = await convertedWithAutoPick()
        act(() => result.current.chooseArtist(MARLOW))
        expect(result.current.conversion?.artist).toBe('Marlow Vance')
        expect(result.current.conversion?.links.apple).toBe(MARLOW.url)
        expect(result.current.conversion?.exact.apple).toBe(true)
        expect(result.current.conversion?.likely).toEqual(NOTHING_LIKELY)
      })

      it('switches the artist, Apple link and YouTube Music search when another artist is chosen', async () => {
        const { result } = await convertedWithAutoPick()
        act(() => result.current.chooseArtist(HARPER))
        expect(result.current.conversion?.artist).toBe('Harper Lane')
        expect(result.current.conversion?.links.apple).toBe(HARPER.url)
        expect(result.current.conversion?.exact.apple).toBe(true)
        expect(result.current.conversion?.links.ytm).toBe(
          "https://music.youtube.com/search?q=Rollin'%20Down%20To%20Memphis%20-%20Remastered%202015%20Harper%20Lane",
        )
        expect(result.current.conversion?.likely).toEqual(NOTHING_LIKELY)
      })

      it('keeps the Spotify link exact and the status done', async () => {
        const { result } = await convertedWithAutoPick()
        act(() => result.current.chooseArtist(HARPER))
        expect(result.current.conversion?.links.spotify).toBe(UNIQUE.link)
        expect(result.current.conversion?.exact.spotify).toBe(true)
        expect(result.current.status).toBe('done')
      })
    })

    it('does nothing when there is no conversion', () => {
      const { result } = renderHook(() => useConversion())
      act(() => result.current.chooseArtist(NEON))
      expect(result.current.conversion).toBeNull()
      expect(result.current.status).toBe('idle')
    })
  })
})
