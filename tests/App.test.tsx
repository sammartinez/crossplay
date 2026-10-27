import { StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../src/App'
import { spotifyOembedUrl } from '../src/lib/lookup'
import { fixture } from './support/fixtures'
import {
  type Deferred,
  type FetchAnswer,
  type JsonpOutcome,
  deferred,
  fetchedUrls,
  jsonResponse,
  mockFetchOnly,
  mockJsonp,
} from './support/network'
import { expectedShareText } from './support/cases'
import { stubClipboard } from './support/clipboard'
import { expectNotShown, resultRow as row } from './support/dom'

// AC11 (convert UI) and AC13 (copy and share), plus PLAN-002 AC5–AC7 (honest
// fallback and the artist picker), driven through App's rendered output with
// only fetch and the JSONP script load stood in.
// PLAN-004 AC1–AC4, AC9: lookups go straight to oEmbed/iTunes.

const PLACEHOLDER = 'https://open.spotify.com/track/…'
const LOOKING_UP_MESSAGE = 'Looking it up…'
const INVALID_LINK_MESSAGE = 'That link isn’t a Spotify or Apple Music track or album.'
const NOT_FOUND_MESSAGE = 'Couldn’t find that one. Check the link and try again.'
const APP_LINK_NAME = 'Search in Spotify app'

const SPOTIFY_TRACK_RAW = 'https://open.spotify.com/intl-de/track/4u7EnebtmKWzUH433cf5Qv?si=abc'
const SPOTIFY_TRACK_LINK = 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv'
const APPLE_SONG_LINK = 'https://music.apple.com/us/album/bohemian-rhapsody/1440806041?i=1440806768'
const NOT_A_MUSIC_LINK = 'https://example.com/track/123'

// From spotify-oembed-track.json
const SPOTIFY_TITLE = 'Bohemian Rhapsody - Remastered 2011'

// An Apple song link, from itunes-lookup-song.json.
const APPLE_TITLE = 'Bohemian Rhapsody'
const APPLE_ARTIST = 'Queen'
const APPLE_ART =
  'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/27/0d/0e/270d0e2b/source/300x300bb.jpg'
const APPLE_LINKS = {
  'Apple Music': APPLE_SONG_LINK,
  Spotify: 'https://open.spotify.com/search/Bohemian%20Rhapsody%20Queen',
  'YouTube Music': 'https://music.youtube.com/search?q=Bohemian%20Rhapsody%20Queen',
}
const APPLE_APP_SEARCH = 'spotify:search:Bohemian%20Rhapsody%20Queen'

// The reported case (PLAN-002 AC5–AC7), from spotify-oembed-aint-gettin-high.json
// and itunes-search-aint-gettin-high.json.
const REPORTED_LINK = 'https://open.spotify.com/track/1yQDTSOyfVTCt9XWKQcnXb'
const REPORTED_TITLE = "Ain't Gettin' High"
const REPORTED_THUMB =
  'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02a1b2c3d4e5f60718293a4b5c'
const TITLE_SEARCH = {
  apple: "https://music.apple.com/us/search?term=Ain't%20Gettin'%20High",
  ytm: "https://music.youtube.com/search?q=Ain't%20Gettin'%20High",
}
const MATSON = 'Samuel Cody Matson'
const NEON = 'The Neon Prairie Dogs'
const ZACH = 'Zach Bryan'
const PICK_MATSON = "Samuel Cody Matson · Ain't Gettin' High"
const PICK_NEON = "The Neon Prairie Dogs · Ain't Gettin' High"
const PICK_ZACH = 'Zach Bryan · Younger Years'
const MATSON_URL = 'https://music.apple.com/us/album/aint-gettin-high/1712345678?i=1712345680'
const NEON_URL = 'https://music.apple.com/us/album/aint-gettin-high/1601234567?i=1601234571'
const NEON_YTM_SEARCH =
  "https://music.youtube.com/search?q=Ain't%20Gettin'%20High%20The%20Neon%20Prairie%20Dogs"

// PLAN-004 AC5: a Spotify track with exactly one same-title iTunes artist,
// from spotify-oembed-unique-match.json and itunes-search-unique-match.json.
const UNIQUE_LINK = 'https://open.spotify.com/track/3kVr8XqPz2LmNw7TyB5hJd'
const UNIQUE_TITLE = "Rollin' Down To Memphis - Remastered 2015"
const MARLOW = 'Marlow Vance'
const HARPER = 'Harper Lane'
const PICK_MARLOW = 'Marlow Vance · Rollin Down to Memphis'
const PICK_DUST = "The Dust Bowl Choir · Rollin' Down To Memphis (Live)"
const PICK_HARPER = 'Harper Lane · Midnight Ferry'
const MARLOW_URL = 'https://music.apple.com/us/album/rollin-down-to-memphis/1587654321?i=1587654329'
const HARPER_URL = 'https://music.apple.com/us/album/midnight-ferry/1645678900?i=1645678912'
const MARLOW_YTM_SEARCH =
  "https://music.youtube.com/search?q=Rollin'%20Down%20To%20Memphis%20-%20Remastered%202015%20Marlow%20Vance"
const HARPER_YTM_SEARCH =
  "https://music.youtube.com/search?q=Rollin'%20Down%20To%20Memphis%20-%20Remastered%202015%20Harper%20Lane"

const main = () => screen.getByRole('main')
const status = () => screen.getByRole('status')
const input = () => screen.getByPlaceholderText(PLACEHOLDER) as HTMLInputElement
const convertButton = () => screen.getByRole('button', { name: 'Convert' })
const platformLink = (name: string) => screen.getByRole('link', { name })
// A row's platform link, by name, so a second link in the row is not picked up.
const PLATFORM_NAME = /^(Apple Music|Spotify|YouTube Music)$/
const queryPlatformLink = (name: string) => screen.queryByRole('link', { name })
const artwork = () => document.querySelector('main img')

function submit(value: string) {
  fireEvent.change(input(), { target: { value } })
  fireEvent.click(convertButton())
}

async function waitForResult() {
  await waitFor(() => expect(platformLink('Apple Music')).toBeInTheDocument())
}

async function waitForIdle() {
  await waitFor(() => expect(convertButton()).toBeEnabled())
}

// An Apple link: no fetch is expected; the iTunes lookup answers as `itunes` says.
function appleCase(itunes: JsonpOutcome = { data: fixture('itunes-lookup-song.json') }) {
  const fetchMock = mockFetchOnly({})
  const loads = mockJsonp(() => itunes)
  return { fetchMock, loads }
}

// The Spotify track link: oEmbed answers as `oembed` says and iTunes search
// answers with the songs fixture.
function spotifyCase(oembed: FetchAnswer = () => jsonResponse(fixture('spotify-oembed-track.json'))) {
  const fetchMock = mockFetchOnly({ [spotifyOembedUrl(SPOTIFY_TRACK_LINK)]: oembed })
  const loads = mockJsonp(() => ({ data: fixture('itunes-search-songs.json') }))
  return { fetchMock, loads }
}

// oEmbed answers with the reported response, and iTunes search answers as
// `itunes` says.
function reportedCase(itunes: JsonpOutcome = { data: fixture('itunes-search-aint-gettin-high.json') }) {
  const fetchMock = mockFetchOnly({
    [spotifyOembedUrl(REPORTED_LINK)]: () => jsonResponse(fixture('spotify-oembed-aint-gettin-high.json')),
  })
  const loads = mockJsonp(() => itunes)
  return { fetchMock, loads }
}

// oEmbed answers the unique-match link and iTunes search answers with the
// unique-match results.
function uniqueCase() {
  const fetchMock = mockFetchOnly({
    [spotifyOembedUrl(UNIQUE_LINK)]: () => jsonResponse(fixture('spotify-oembed-unique-match.json')),
  })
  const loads = mockJsonp(() => ({ data: fixture('itunes-search-unique-match.json') }))
  return { fetchMock, loads }
}

// The Spotify track's oEmbed request waits until the test resolves it.
function pendingFetch() {
  const pending: Deferred<Response>[] = []
  const { fetchMock } = spotifyCase(() => {
    const d = deferred<Response>()
    pending.push(d)
    return d.promise
  })
  const resolveAll = (body: unknown) =>
    act(async () => pending.forEach((d) => d.resolve(jsonResponse(body))))
  return { fetchMock, resolveAll }
}

function openWithShareParam(value: string) {
  window.history.replaceState(null, '', `/?u=${encodeURIComponent(value)}`)
}

describe('App', () => {
  it('shows the app name as the page heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Crossplay' })).toBeInTheDocument()
  })

  it('shows the subtitle under the heading', () => {
    render(<App />)
    expect(
      screen.getByText('Paste a Spotify or Apple Music link. Get it everywhere.'),
    ).toBeInTheDocument()
  })

  it('shows the Theme button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Theme' })).toBeInTheDocument()
  })

  describe('before any conversion', () => {
    it('shows an empty URL input and an enabled Convert button', () => {
      render(<App />)
      expect(input()).toHaveValue('')
      expect(convertButton()).toBeEnabled()
    })

    it('shows an empty status line without the error style', () => {
      render(<App />)
      expect(status().textContent).toBe('')
      expect(status()).not.toHaveClass('err')
    })

    it('shows no result card and makes no request', () => {
      const { fetchMock, loads } = appleCase()
      render(<App />)
      expect(queryPlatformLink('Apple Music')).not.toBeInTheDocument()
      expect(fetchMock).not.toHaveBeenCalled()
      expect(loads).toHaveLength(0)
    })

    it('does not mark the page busy', () => {
      render(<App />)
      expect(main()).not.toHaveClass('busy')
    })
  })

  describe('starting a conversion', () => {
    it('looks up the canonical link with oEmbed when the form is submitted', () => {
      const { fetchMock } = spotifyCase()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_TRACK_LINK)])
    })

    it('looks up the pasted link one tick after the paste event', async () => {
      const { fetchMock } = spotifyCase()
      render(<App />)
      // The paste event fires before the browser puts the text in the input.
      fireEvent.paste(input())
      fireEvent.change(input(), { target: { value: SPOTIFY_TRACK_RAW } })
      expect(fetchMock).not.toHaveBeenCalled()
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_TRACK_LINK)])
    })

    it('shows the result after a paste', async () => {
      spotifyCase()
      render(<App />)
      fireEvent.paste(input())
      fireEvent.change(input(), { target: { value: SPOTIFY_TRACK_RAW } })
      await waitForResult()
      expect(screen.getByText(SPOTIFY_TITLE)).toBeInTheDocument()
    })
  })

  describe('while a lookup is running', () => {
    it('disables the Convert button', () => {
      pendingFetch()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      expect(convertButton()).toBeDisabled()
    })

    it('adds the busy class to <main> so the crossfader animates', () => {
      pendingFetch()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      expect(main()).toHaveClass('busy')
    })

    it('reads "Looking it up…" in the status line without the error style', () => {
      pendingFetch()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      expect(status()).toHaveTextContent(LOOKING_UP_MESSAGE)
      expect(status()).not.toHaveClass('err')
    })

    it('re-enables the button, clears busy and empties the status line when it finishes', async () => {
      const { resolveAll } = pendingFetch()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await resolveAll(fixture('spotify-oembed-track.json'))
      await waitForIdle()
      expect(main()).not.toHaveClass('busy')
      expect(status().textContent).toBe('')
    })
  })

  describe('the result card for an Apple link', () => {
    it('makes one iTunes lookup and no fetch', async () => {
      const { fetchMock, loads } = appleCase()
      render(<App />)
      submit(APPLE_SONG_LINK)
      await waitForResult()
      expect(fetchMock).not.toHaveBeenCalled()
      expect(loads).toHaveLength(1)
    })

    it('shows the title and the artist from the iTunes lookup', async () => {
      appleCase()
      render(<App />)
      submit(APPLE_SONG_LINK)
      await waitForResult()
      expect(screen.getByText(APPLE_TITLE)).toBeInTheDocument()
      expect(screen.getByText(APPLE_ARTIST)).toBeInTheDocument()
    })

    it('shows the artwork when there is one', async () => {
      appleCase()
      render(<App />)
      submit(APPLE_SONG_LINK)
      await waitForResult()
      expect(artwork()).toHaveAttribute('src', APPLE_ART)
      expect(artwork()).toBeVisible()
    })

    it('hides the artwork when there is none', async () => {
      appleCase({ data: fixture('itunes-lookup-empty.json') })
      render(<App />)
      submit(APPLE_SONG_LINK)
      await waitForResult()
      const img = artwork()
      expectNotShown(img)
    })

    it('shows one row per platform in Apple Music, Spotify, YouTube Music order', async () => {
      appleCase()
      render(<App />)
      submit(APPLE_SONG_LINK)
      await waitForResult()
      const names = screen
        .getAllByRole('listitem')
        .map((li) => within(li).getByRole('link', { name: PLATFORM_NAME }).textContent)
      expect(names).toEqual(['Apple Music', 'Spotify', 'YouTube Music'])
    })

    it.each(Object.entries(APPLE_LINKS))('links %s to its converted URL', async (name, href) => {
      appleCase()
      render(<App />)
      submit(APPLE_SONG_LINK)
      await waitForResult()
      expect(platformLink(name)).toHaveAttribute('href', href)
    })

    it.each(Object.keys(APPLE_LINKS))(
      'opens the %s link in a new tab with rel="noopener"',
      async (name) => {
        appleCase()
        render(<App />)
        submit(APPLE_SONG_LINK)
        await waitForResult()
        expect(platformLink(name)).toHaveAttribute('target', '_blank')
        expect(platformLink(name)).toHaveAttribute('rel', 'noopener')
      },
    )

    it('tags Apple Music EXACT and Spotify and YouTube Music SEARCH', async () => {
      appleCase()
      render(<App />)
      submit(APPLE_SONG_LINK)
      await waitForResult()
      expect(within(row('Apple Music')).getByText('EXACT')).toBeInTheDocument()
      expect(within(row('Spotify')).getByText('SEARCH')).toBeInTheDocument()
      expect(within(row('Spotify')).queryByText('EXACT')).not.toBeInTheDocument()
      expect(within(row('YouTube Music')).getByText('SEARCH')).toBeInTheDocument()
      expect(within(row('YouTube Music')).queryByText('EXACT')).not.toBeInTheDocument()
    })

    it('shows no LIKELY tag', async () => {
      appleCase()
      render(<App />)
      submit(APPLE_SONG_LINK)
      await waitForResult()
      expect(screen.queryByText('LIKELY')).not.toBeInTheDocument()
    })

    it('shows the "Search in Spotify app" link for "title artist"', async () => {
      appleCase()
      render(<App />)
      submit(APPLE_SONG_LINK)
      await waitForResult()
      expect(platformLink(APP_LINK_NAME)).toHaveAttribute('href', APPLE_APP_SEARCH)
    })

    it('shows no artist picker', async () => {
      appleCase()
      render(<App />)
      submit(APPLE_SONG_LINK)
      await waitForResult()
      expect(screen.queryByText('Which artist?')).not.toBeInTheDocument()
    })

    it('uses the slug as the title and a blank artist when the iTunes lookup fails', async () => {
      appleCase('error')
      render(<App />)
      submit(APPLE_SONG_LINK)
      await waitForResult()
      expect(screen.getByText(APPLE_TITLE)).toBeInTheDocument()
      expect(screen.queryByText(APPLE_ARTIST)).not.toBeInTheDocument()
      expect(within(row('Apple Music')).getByText('EXACT')).toBeInTheDocument()
      expect(within(row('Spotify')).getByText('SEARCH')).toBeInTheDocument()
      expect(within(row('YouTube Music')).getByText('SEARCH')).toBeInTheDocument()
      expect(platformLink('Spotify')).toHaveAttribute(
        'href',
        'https://open.spotify.com/search/Bohemian%20Rhapsody',
      )
    })
  })

  describe('on an error', () => {
    it('shows the invalid-link message in the status line with the error style', () => {
      render(<App />)
      submit(NOT_A_MUSIC_LINK)
      expect(status()).toHaveTextContent(INVALID_LINK_MESSAGE)
      expect(status()).toHaveClass('err')
    })

    it.each([
      ['answers 404', () => jsonResponse({}, 404)],
      ['fails to fetch', () => Promise.reject(new TypeError('Failed to fetch'))],
    ] as [string, FetchAnswer][])(
      'shows the not-found message with the error style when oEmbed %s',
      async (_, oembed) => {
        const { fetchMock, loads } = spotifyCase(oembed)
        render(<App />)
        submit(SPOTIFY_TRACK_RAW)
        await waitFor(() => expect(status()).toHaveTextContent(NOT_FOUND_MESSAGE))
        expect(status()).toHaveClass('err')
        expect(main()).not.toHaveClass('busy')
        expect(convertButton()).toBeEnabled()
        expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_TRACK_LINK)])
        expect(loads).toHaveLength(0)
      },
    )

    it('hides the result card from an earlier conversion', async () => {
      appleCase()
      render(<App />)
      submit(APPLE_SONG_LINK)
      await waitForResult()
      submit(NOT_A_MUSIC_LINK)
      expect(status()).toHaveClass('err')
      expect(queryPlatformLink('Apple Music')).not.toBeInTheDocument()
      expect(screen.queryByText(APPLE_TITLE)).not.toBeInTheDocument()
    })

    it('drops the error style once a new lookup starts', () => {
      pendingFetch()
      render(<App />)
      submit(NOT_A_MUSIC_LINK)
      submit(SPOTIFY_TRACK_RAW)
      expect(status()).toHaveTextContent(LOOKING_UP_MESSAGE)
      expect(status()).not.toHaveClass('err')
    })
  })

  describe('opened with ?u=<link>', () => {
    it('fills the input with the link', () => {
      pendingFetch()
      openWithShareParam(SPOTIFY_TRACK_RAW)
      render(<App />)
      expect(input()).toHaveValue(SPOTIFY_TRACK_RAW)
    })

    it('converts the link automatically', async () => {
      const { fetchMock } = spotifyCase()
      openWithShareParam(SPOTIFY_TRACK_RAW)
      render(<App />)
      await waitForResult()
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(SPOTIFY_TRACK_LINK)])
      expect(screen.getByText(SPOTIFY_TITLE)).toBeInTheDocument()
    })

    it('converts an Apple link automatically with one iTunes lookup and no fetch', async () => {
      const { fetchMock, loads } = appleCase()
      openWithShareParam(APPLE_SONG_LINK)
      render(<App />)
      await waitForResult()
      expect(screen.getByText(APPLE_TITLE)).toBeInTheDocument()
      expect(fetchMock).not.toHaveBeenCalled()
      expect(loads).toHaveLength(1)
    })

    it('converts only once', async () => {
      const { fetchMock, loads } = spotifyCase()
      openWithShareParam(SPOTIFY_TRACK_RAW)
      render(<App />)
      await waitForResult()
      await waitForIdle()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(loads).toHaveLength(1)
    })

    it('converts only once under StrictMode', async () => {
      const { fetchMock, loads } = spotifyCase()
      openWithShareParam(SPOTIFY_TRACK_RAW)
      render(
        <StrictMode>
          <App />
        </StrictMode>,
      )
      await waitForResult()
      await waitForIdle()
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(loads).toHaveLength(1)
    })

    it('shows the invalid-link error for a value that is not a music link', () => {
      const { fetchMock } = spotifyCase()
      openWithShareParam('not-a-link')
      render(<App />)
      expect(input()).toHaveValue('not-a-link')
      expect(status()).toHaveTextContent(INVALID_LINK_MESSAGE)
      expect(status()).toHaveClass('err')
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('the reported Spotify link', () => {
    const picker = () => screen.getByRole('group', { name: 'Which artist?' })
    const queryPicker = () => screen.queryByRole('group', { name: 'Which artist?' })
    const pick = (name: string) => within(picker()).getByRole('button', { name })

    async function showReported() {
      reportedCase()
      render(<App />)
      submit(REPORTED_LINK)
      await waitForResult()
    }

    it('requests only the oEmbed, once, then one iTunes search', async () => {
      const { fetchMock, loads } = reportedCase()
      render(<App />)
      submit(REPORTED_LINK)
      await waitForResult()
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(REPORTED_LINK)])
      expect(loads).toHaveLength(1)
    })

    it('shows the oEmbed title and artwork', async () => {
      await showReported()
      expect(screen.getByText(REPORTED_TITLE)).toBeInTheDocument()
      expect(artwork()).toHaveAttribute('src', REPORTED_THUMB)
    })

    it('shows no artist name under the title', async () => {
      await showReported()
      for (const artist of [MATSON, NEON, ZACH]) {
        expect(screen.queryByText(artist)).not.toBeInTheDocument()
      }
    })

    it('links Apple Music to a search for the title alone, tagged SEARCH', async () => {
      await showReported()
      expect(platformLink('Apple Music')).toHaveAttribute('href', TITLE_SEARCH.apple)
      expect(within(row('Apple Music')).getByText('SEARCH')).toBeInTheDocument()
      expect(within(row('Apple Music')).queryByText('EXACT')).not.toBeInTheDocument()
    })

    it('links Spotify to the canonical track, tagged EXACT', async () => {
      await showReported()
      expect(platformLink('Spotify')).toHaveAttribute('href', REPORTED_LINK)
      expect(within(row('Spotify')).getByText('EXACT')).toBeInTheDocument()
    })

    it('links YouTube Music to a search for the title alone, tagged SEARCH', async () => {
      await showReported()
      expect(platformLink('YouTube Music')).toHaveAttribute('href', TITLE_SEARCH.ytm)
      expect(within(row('YouTube Music')).getByText('SEARCH')).toBeInTheDocument()
    })

    it('copies share text whose first line is the title alone', async () => {
      const writeText = stubClipboard('ok')
      await showReported()
      fireEvent.click(screen.getByRole('button', { name: 'Copy share text' }))
      await waitFor(() =>
        expect(writeText).toHaveBeenCalledWith(
          expectedShareText(REPORTED_TITLE, {
            apple: TITLE_SEARCH.apple,
            spotify: REPORTED_LINK,
            ytm: TITLE_SEARCH.ytm,
          }),
        ),
      )
    })

    it('asks "Which artist?" with one button per artist in iTunes order', async () => {
      await showReported()
      expect(screen.getByText('Which artist?')).toBeInTheDocument()
      const names = within(picker())
        .getAllByRole('button')
        .map((b) => b.textContent)
      expect(names).toEqual([PICK_MATSON, PICK_NEON, PICK_ZACH])
    })

    it('presses no artist button at first', async () => {
      await showReported()
      for (const name of [PICK_MATSON, PICK_NEON, PICK_ZACH]) {
        expect(pick(name)).toHaveAttribute('aria-pressed', 'false')
      }
    })

    it('shows no LIKELY tag, since two artists have the title', async () => {
      await showReported()
      expect(screen.queryByText('LIKELY')).not.toBeInTheDocument()
    })

    it('does not show the old "Wrong Apple match?" block', async () => {
      await showReported()
      expect(screen.queryByText('Wrong Apple match?')).not.toBeInTheDocument()
    })

    describe('after an artist is picked', () => {
      it('shows that artist under the title', async () => {
        await showReported()
        fireEvent.click(pick(PICK_NEON))
        expect(screen.getByText(NEON)).toBeInTheDocument()
      })

      it("links Apple Music to that artist's track, tagged EXACT", async () => {
        await showReported()
        fireEvent.click(pick(PICK_NEON))
        expect(platformLink('Apple Music')).toHaveAttribute('href', NEON_URL)
        expect(within(row('Apple Music')).getByText('EXACT')).toBeInTheDocument()
      })

      it('rebuilds the YouTube Music search with "<title> <artist>"', async () => {
        await showReported()
        fireEvent.click(pick(PICK_NEON))
        expect(platformLink('YouTube Music')).toHaveAttribute('href', NEON_YTM_SEARCH)
        expect(within(row('YouTube Music')).getByText('SEARCH')).toBeInTheDocument()
      })

      it('keeps Spotify on the canonical track link', async () => {
        await showReported()
        fireEvent.click(pick(PICK_NEON))
        expect(platformLink('Spotify')).toHaveAttribute('href', REPORTED_LINK)
      })

      it('copies share text starting "<title> — <artist>" with the new links', async () => {
        const writeText = stubClipboard('ok')
        await showReported()
        fireEvent.click(pick(PICK_NEON))
        fireEvent.click(screen.getByRole('button', { name: 'Copy share text' }))
        await waitFor(() =>
          expect(writeText).toHaveBeenCalledWith(
            expectedShareText(`${REPORTED_TITLE} — ${NEON}`, {
              apple: NEON_URL,
              spotify: REPORTED_LINK,
              ytm: NEON_YTM_SEARCH,
            }),
          ),
        )
      })

      it('presses the picked button and no other', async () => {
        await showReported()
        fireEvent.click(pick(PICK_NEON))
        expect(pick(PICK_MATSON)).toHaveAttribute('aria-pressed', 'false')
        expect(pick(PICK_NEON)).toHaveAttribute('aria-pressed', 'true')
        expect(pick(PICK_ZACH)).toHaveAttribute('aria-pressed', 'false')
      })

      it('keeps every artist button in the same order', async () => {
        await showReported()
        fireEvent.click(pick(PICK_NEON))
        const names = within(picker())
          .getAllByRole('button')
          .map((b) => b.textContent)
        expect(names).toEqual([PICK_MATSON, PICK_NEON, PICK_ZACH])
      })

      it('switches to another artist when another button is clicked', async () => {
        await showReported()
        fireEvent.click(pick(PICK_NEON))
        fireEvent.click(pick(PICK_MATSON))
        expect(screen.getByText(MATSON)).toBeInTheDocument()
        expect(screen.queryByText(NEON)).not.toBeInTheDocument()
        expect(platformLink('Apple Music')).toHaveAttribute('href', MATSON_URL)
        expect(pick(PICK_MATSON)).toHaveAttribute('aria-pressed', 'true')
        expect(pick(PICK_NEON)).toHaveAttribute('aria-pressed', 'false')
      })
    })

    it('shows no picker when the iTunes search finds nothing', async () => {
      reportedCase({ data: fixture('itunes-search-empty.json') })
      render(<App />)
      submit(REPORTED_LINK)
      await waitForResult()
      expect(screen.getByText(REPORTED_TITLE)).toBeInTheDocument()
      expect(queryPicker()).not.toBeInTheDocument()
      expect(screen.queryByText('Which artist?')).not.toBeInTheDocument()
    })

    it('shows no "Search in Spotify app" link, since Spotify is exact', async () => {
      await showReported()
      expect(queryPlatformLink(APP_LINK_NAME)).not.toBeInTheDocument()
    })

    it('shows no picker when the iTunes search fails to load', async () => {
      reportedCase('error')
      render(<App />)
      submit(REPORTED_LINK)
      await waitForResult()
      expect(screen.getByText(REPORTED_TITLE)).toBeInTheDocument()
      expect(queryPicker()).not.toBeInTheDocument()
    })
  })

  // PLAN-004 AC5 and AC7, end to end.
  describe('a Spotify link with a unique iTunes match', () => {
    const picker = () => screen.getByRole('group', { name: 'Which artist?' })
    const pick = (name: string) => within(picker()).getByRole('button', { name })

    async function showUnique() {
      uniqueCase()
      render(<App />)
      submit(UNIQUE_LINK)
      await waitForResult()
    }

    it('requests only the oEmbed, once, then one iTunes search', async () => {
      const { fetchMock, loads } = uniqueCase()
      render(<App />)
      submit(UNIQUE_LINK)
      await waitForResult()
      expect(fetchedUrls(fetchMock)).toEqual([spotifyOembedUrl(UNIQUE_LINK)])
      expect(loads).toHaveLength(1)
    })

    it('shows the original title and the matching artist under it', async () => {
      await showUnique()
      expect(screen.getByText(UNIQUE_TITLE)).toBeInTheDocument()
      expect(screen.getByText(MARLOW)).toBeInTheDocument()
    })

    it("links Apple Music to the artist's matching song, tagged LIKELY", async () => {
      await showUnique()
      expect(platformLink('Apple Music')).toHaveAttribute('href', MARLOW_URL)
      expect(within(row('Apple Music')).getByText('LIKELY')).toBeInTheDocument()
      expect(within(row('Apple Music')).queryByText('EXACT')).not.toBeInTheDocument()
      expect(within(row('Apple Music')).queryByText('SEARCH')).not.toBeInTheDocument()
    })

    it('styles the LIKELY tag differently from the EXACT and SEARCH tags', async () => {
      await showUnique()
      const likely = within(row('Apple Music')).getByText('LIKELY').className
      expect(likely).not.toBe(within(row('Spotify')).getByText('EXACT').className)
      expect(likely).not.toBe(within(row('YouTube Music')).getByText('SEARCH').className)
    })

    it('links Spotify to the canonical track, tagged EXACT', async () => {
      await showUnique()
      expect(platformLink('Spotify')).toHaveAttribute('href', UNIQUE_LINK)
      expect(within(row('Spotify')).getByText('EXACT')).toBeInTheDocument()
    })

    it('links YouTube Music to a search for "<title> <artist>", tagged SEARCH', async () => {
      await showUnique()
      expect(platformLink('YouTube Music')).toHaveAttribute('href', MARLOW_YTM_SEARCH)
      expect(within(row('YouTube Music')).getByText('SEARCH')).toBeInTheDocument()
    })

    it('shows LIKELY on Apple Music only', async () => {
      await showUnique()
      expect(screen.getAllByText('LIKELY')).toHaveLength(1)
    })

    it('copies share text starting "<title> — <artist>" with the LIKELY Apple URL', async () => {
      const writeText = stubClipboard('ok')
      await showUnique()
      fireEvent.click(screen.getByRole('button', { name: 'Copy share text' }))
      await waitFor(() =>
        expect(writeText).toHaveBeenCalledWith(
          expectedShareText(`${UNIQUE_TITLE} — ${MARLOW}`, {
            apple: MARLOW_URL,
            spotify: UNIQUE_LINK,
            ytm: MARLOW_YTM_SEARCH,
          }),
        ),
      )
    })

    it('shows the picker with the auto-picked artist pressed and the others not', async () => {
      await showUnique()
      const names = within(picker())
        .getAllByRole('button')
        .map((b) => b.textContent)
      expect(names).toEqual([PICK_MARLOW, PICK_DUST, PICK_HARPER])
      expect(pick(PICK_MARLOW)).toHaveAttribute('aria-pressed', 'true')
      expect(pick(PICK_DUST)).toHaveAttribute('aria-pressed', 'false')
      expect(pick(PICK_HARPER)).toHaveAttribute('aria-pressed', 'false')
    })

    it('shows the auto-pick when opened with ?u=<link>', async () => {
      uniqueCase()
      openWithShareParam(UNIQUE_LINK)
      render(<App />)
      await waitForResult()
      expect(screen.getByText(MARLOW)).toBeInTheDocument()
      expect(within(row('Apple Music')).getByText('LIKELY')).toBeInTheDocument()
    })

    describe('after the auto-picked artist is clicked', () => {
      it('tags Apple Music EXACT on the same song, and shows no LIKELY tag', async () => {
        await showUnique()
        fireEvent.click(pick(PICK_MARLOW))
        expect(platformLink('Apple Music')).toHaveAttribute('href', MARLOW_URL)
        expect(within(row('Apple Music')).getByText('EXACT')).toBeInTheDocument()
        expect(screen.queryByText('LIKELY')).not.toBeInTheDocument()
      })

      it('keeps that artist and its button pressed', async () => {
        await showUnique()
        fireEvent.click(pick(PICK_MARLOW))
        expect(screen.getByText(MARLOW)).toBeInTheDocument()
        expect(pick(PICK_MARLOW)).toHaveAttribute('aria-pressed', 'true')
      })
    })

    describe('after another artist is clicked', () => {
      it('switches the artist under the title', async () => {
        await showUnique()
        fireEvent.click(pick(PICK_HARPER))
        expect(screen.getByText(HARPER)).toBeInTheDocument()
        expect(screen.queryByText(MARLOW)).not.toBeInTheDocument()
      })

      it("links Apple Music to that artist's song, tagged EXACT, with no LIKELY tag left", async () => {
        await showUnique()
        fireEvent.click(pick(PICK_HARPER))
        expect(platformLink('Apple Music')).toHaveAttribute('href', HARPER_URL)
        expect(within(row('Apple Music')).getByText('EXACT')).toBeInTheDocument()
        expect(screen.queryByText('LIKELY')).not.toBeInTheDocument()
      })

      it('rebuilds the YouTube Music search with the new artist', async () => {
        await showUnique()
        fireEvent.click(pick(PICK_HARPER))
        expect(platformLink('YouTube Music')).toHaveAttribute('href', HARPER_YTM_SEARCH)
      })

      it('presses the clicked button and no other', async () => {
        await showUnique()
        fireEvent.click(pick(PICK_HARPER))
        expect(pick(PICK_MARLOW)).toHaveAttribute('aria-pressed', 'false')
        expect(pick(PICK_DUST)).toHaveAttribute('aria-pressed', 'false')
        expect(pick(PICK_HARPER)).toHaveAttribute('aria-pressed', 'true')
      })

      it('copies share text with the new artist and links', async () => {
        const writeText = stubClipboard('ok')
        await showUnique()
        fireEvent.click(pick(PICK_HARPER))
        fireEvent.click(screen.getByRole('button', { name: 'Copy share text' }))
        await waitFor(() =>
          expect(writeText).toHaveBeenCalledWith(
            expectedShareText(`${UNIQUE_TITLE} — ${HARPER}`, {
              apple: HARPER_URL,
              spotify: UNIQUE_LINK,
              ytm: HARPER_YTM_SEARCH,
            }),
          ),
        )
      })
    })
  })

  describe('copy and share', () => {
    it('copies the converted share text with "Copy share text"', async () => {
      appleCase()
      const writeText = stubClipboard('ok')
      render(<App />)
      submit(APPLE_SONG_LINK)
      await waitForResult()
      fireEvent.click(screen.getByRole('button', { name: 'Copy share text' }))
      await waitFor(() =>
        expect(writeText).toHaveBeenCalledWith(
          expectedShareText(`${APPLE_TITLE} — ${APPLE_ARTIST}`, {
            apple: APPLE_LINKS['Apple Music'],
            spotify: APPLE_LINKS.Spotify,
            ytm: APPLE_LINKS['YouTube Music'],
          }),
        ),
      )
      expect(await screen.findByRole('button', { name: 'Copied' })).toHaveClass('share')
    })

    it('copies a row link with its Copy button', async () => {
      appleCase()
      const writeText = stubClipboard('ok')
      render(<App />)
      submit(APPLE_SONG_LINK)
      await waitForResult()
      fireEvent.click(within(row('YouTube Music')).getByRole('button', { name: 'Copy' }))
      await waitFor(() => expect(writeText).toHaveBeenCalledWith(APPLE_LINKS['YouTube Music']))
    })
  })
})
