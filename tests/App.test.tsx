import { StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../src/App'
import { SPOTIFY_OEMBED_URL } from '../src/constants'
import { odesliUrl } from '../src/lib/lookup'
import { fixture } from './support/fixtures'
import {
  type Deferred,
  type JsonpOutcome,
  deferred,
  jsonResponse,
  mockFetch,
  mockJsonp,
} from './support/network'
import { expectedShareText, stubClipboard } from './support/clipboard'
import { expectNotShown, resultRow as row } from './support/dom'

// AC11 (convert UI) and AC13 (copy and share), plus PLAN-002 AC4–AC7 (Odesli
// retry, honest fallback and the artist picker), driven through App's
// rendered output with only fetch and the JSONP script load stood in.

const PLACEHOLDER = 'https://open.spotify.com/track/…'
const LOOKING_UP_MESSAGE = 'Looking it up…'
const INVALID_LINK_MESSAGE = 'That link isn’t a Spotify or Apple Music track or album.'
const NOT_FOUND_MESSAGE = 'Couldn’t find that one. Check the link and try again.'

const SPOTIFY_TRACK_RAW = 'https://open.spotify.com/intl-de/track/4u7EnebtmKWzUH433cf5Qv?si=abc'
const SPOTIFY_TRACK_LINK = 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv'
const APPLE_SONG_LINK = 'https://music.apple.com/us/album/bohemian-rhapsody/1440806041?i=1440806768'
const NOT_A_MUSIC_LINK = 'https://example.com/track/123'

// From odesli-track.json
const ODESLI_TITLE = 'Bohemian Rhapsody - Remastered 2011'
const ODESLI_ART = 'https://i.scdn.co/image/ab67616d0000b273ce4f1737bc8a646c8c4bd25a'
const ODESLI_LINKS = {
  'Apple Music':
    'https://geo.music.apple.com/us/album/_/1440806041?i=1440806768&mt=1&app=music&ls=1&at=1000lHKX&ct=api_http&itscg=30200&itsct=odsl_m',
  Spotify: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv',
  'YouTube Music': 'https://music.youtube.com/watch?v=fJ9rUzIMcZQ',
}

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

const odesliFails = () => jsonResponse({}, 500)

const main = () => screen.getByRole('main')
const status = () => screen.getByRole('status')
const input = () => screen.getByPlaceholderText(PLACEHOLDER) as HTMLInputElement
const convertButton = () => screen.getByRole('button', { name: 'Convert' })
const platformLink = (name: string) => screen.getByRole('link', { name })
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

// Odesli answers every request with odesli-track.json.
const odesliTrack = () => mockFetch(() => jsonResponse(fixture('odesli-track.json')))

// Odesli answers 429 every time, oEmbed answers with the reported response,
// and iTunes search answers as `itunes` says.
function reportedCase(itunes: JsonpOutcome = { data: fixture('itunes-search-aint-gettin-high.json') }) {
  const fetchMock = mockFetch((url) =>
    url.startsWith(SPOTIFY_OEMBED_URL)
      ? jsonResponse(fixture('spotify-oembed-aint-gettin-high.json'))
      : jsonResponse({}, 429),
  )
  mockJsonp(() => itunes)
  return fetchMock
}

// Each fetch waits until the test resolves it.
function pendingFetch() {
  const pending: Deferred<Response>[] = []
  const fetchMock = mockFetch(() => {
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
      const fetchMock = odesliTrack()
      render(<App />)
      expect(queryPlatformLink('Apple Music')).not.toBeInTheDocument()
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('does not mark the page busy', () => {
      render(<App />)
      expect(main()).not.toHaveClass('busy')
    })
  })

  describe('starting a conversion', () => {
    it('looks up the canonical link when the form is submitted', () => {
      const fetchMock = odesliTrack()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0][0]).toBe(odesliUrl(SPOTIFY_TRACK_LINK))
    })

    it('looks up the pasted link one tick after the paste event', async () => {
      const fetchMock = odesliTrack()
      render(<App />)
      // The paste event fires before the browser puts the text in the input.
      fireEvent.paste(input())
      fireEvent.change(input(), { target: { value: SPOTIFY_TRACK_RAW } })
      expect(fetchMock).not.toHaveBeenCalled()
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
      expect(fetchMock.mock.calls[0][0]).toBe(odesliUrl(SPOTIFY_TRACK_LINK))
    })

    it('shows the result after a paste', async () => {
      odesliTrack()
      render(<App />)
      fireEvent.paste(input())
      fireEvent.change(input(), { target: { value: SPOTIFY_TRACK_RAW } })
      await waitForResult()
      expect(screen.getByText(ODESLI_TITLE)).toBeInTheDocument()
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
      await resolveAll(fixture('odesli-track.json'))
      await waitForIdle()
      expect(main()).not.toHaveClass('busy')
      expect(status().textContent).toBe('')
    })
  })

  describe('the result card', () => {
    it('shows the title and the artist', async () => {
      odesliTrack()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitForResult()
      expect(screen.getByText(ODESLI_TITLE)).toBeInTheDocument()
      expect(screen.getByText('Queen')).toBeInTheDocument()
    })

    it('shows the artwork when there is one', async () => {
      odesliTrack()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitForResult()
      expect(artwork()).toHaveAttribute('src', ODESLI_ART)
      expect(artwork()).toBeVisible()
    })

    it('hides the artwork when there is none', async () => {
      mockFetch(() =>
        jsonResponse({
          entityUniqueId: 'X',
          entitiesByUniqueId: { X: { title: 'No Art Song', artistName: 'Someone' } },
          linksByPlatform: {},
        }),
      )
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitForResult()
      const img = artwork()
      expectNotShown(img)
    })

    it('shows one row per platform in Apple Music, Spotify, YouTube Music order', async () => {
      odesliTrack()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitForResult()
      const names = screen
        .getAllByRole('listitem')
        .map((li) => within(li).getByRole('link').textContent)
      expect(names).toEqual(['Apple Music', 'Spotify', 'YouTube Music'])
    })

    it.each(Object.entries(ODESLI_LINKS))('links %s to its converted URL', async (name, href) => {
      odesliTrack()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitForResult()
      expect(platformLink(name)).toHaveAttribute('href', href)
    })

    it.each(Object.keys(ODESLI_LINKS))(
      'opens the %s link in a new tab with rel="noopener"',
      async (name) => {
        odesliTrack()
        render(<App />)
        submit(SPOTIFY_TRACK_RAW)
        await waitForResult()
        expect(platformLink(name)).toHaveAttribute('target', '_blank')
        expect(platformLink(name)).toHaveAttribute('rel', 'noopener')
      },
    )

    it('tags every row EXACT when every platform has an exact link', async () => {
      odesliTrack()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitForResult()
      for (const name of Object.keys(ODESLI_LINKS)) {
        expect(within(row(name)).getByText('EXACT')).toBeInTheDocument()
        expect(within(row(name)).queryByText('SEARCH')).not.toBeInTheDocument()
      }
    })

    it('tags rows without an exact link SEARCH and links them to a search', async () => {
      // Odesli fails and the iTunes lookup fails: only the Apple link is exact.
      mockFetch(() => odesliFails())
      mockJsonp(() => 'error')
      render(<App />)
      submit(APPLE_SONG_LINK)
      await waitForResult()
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

    it('shows the not-found message with the error style when nothing is found', async () => {
      mockFetch(() => jsonResponse(fixture('odesli-empty.json')))
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitFor(() => expect(status()).toHaveTextContent(NOT_FOUND_MESSAGE))
      expect(status()).toHaveClass('err')
      expect(main()).not.toHaveClass('busy')
      expect(convertButton()).toBeEnabled()
    })

    it('hides the result card from an earlier conversion', async () => {
      odesliTrack()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitForResult()
      submit(NOT_A_MUSIC_LINK)
      expect(status()).toHaveClass('err')
      expect(queryPlatformLink('Apple Music')).not.toBeInTheDocument()
      expect(screen.queryByText(ODESLI_TITLE)).not.toBeInTheDocument()
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
      const fetchMock = odesliTrack()
      openWithShareParam(SPOTIFY_TRACK_RAW)
      render(<App />)
      await waitForResult()
      expect(fetchMock.mock.calls[0][0]).toBe(odesliUrl(SPOTIFY_TRACK_LINK))
      expect(screen.getByText(ODESLI_TITLE)).toBeInTheDocument()
    })

    it('converts only once', async () => {
      const fetchMock = odesliTrack()
      openWithShareParam(SPOTIFY_TRACK_RAW)
      render(<App />)
      await waitForResult()
      await waitForIdle()
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('converts only once under StrictMode', async () => {
      const fetchMock = odesliTrack()
      openWithShareParam(SPOTIFY_TRACK_RAW)
      render(
        <StrictMode>
          <App />
        </StrictMode>,
      )
      await waitForResult()
      await waitForIdle()
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('shows the invalid-link error for a value that is not a music link', () => {
      const fetchMock = odesliTrack()
      openWithShareParam('not-a-link')
      render(<App />)
      expect(input()).toHaveValue('not-a-link')
      expect(status()).toHaveTextContent(INVALID_LINK_MESSAGE)
      expect(status()).toHaveClass('err')
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('the reported Spotify link when Odesli is rate-limited twice', () => {
    const picker = () => screen.getByRole('group', { name: 'Which artist?' })
    const queryPicker = () => screen.queryByRole('group', { name: 'Which artist?' })
    const pick = (name: string) => within(picker()).getByRole('button', { name })

    async function showReported() {
      reportedCase()
      render(<App />)
      submit(REPORTED_LINK)
      await waitForResult()
    }

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

    it('shows no picker when the iTunes search fails to load', async () => {
      reportedCase('error')
      render(<App />)
      submit(REPORTED_LINK)
      await waitForResult()
      expect(screen.getByText(REPORTED_TITLE)).toBeInTheDocument()
      expect(queryPicker()).not.toBeInTheDocument()
    })
  })

  describe('the artist picker elsewhere', () => {
    it('is not shown for an Odesli result', async () => {
      odesliTrack()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitForResult()
      expect(screen.queryByText('Which artist?')).not.toBeInTheDocument()
    })

    it('is not shown for an Apple link that falls back to the iTunes lookup', async () => {
      mockFetch(() => jsonResponse({}, 429))
      mockJsonp(() => ({ data: fixture('itunes-lookup-song.json') }))
      render(<App />)
      submit(APPLE_SONG_LINK)
      await waitForResult()
      expect(screen.getByText('Queen')).toBeInTheDocument()
      expect(screen.queryByText('Which artist?')).not.toBeInTheDocument()
    })

    it('is not shown when Odesli answers on its second attempt', async () => {
      let calls = 0
      mockFetch(() =>
        ++calls === 1
          ? Promise.reject(new TypeError('Failed to fetch'))
          : jsonResponse(fixture('odesli-track.json')),
      )
      mockJsonp(() => 'error')
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitForResult()
      expect(screen.getByText(ODESLI_TITLE)).toBeInTheDocument()
      expect(screen.getByText('Queen')).toBeInTheDocument()
      expect(screen.queryByText('Which artist?')).not.toBeInTheDocument()
    })
  })

  // PLAN-003 AC1, from odesli-apple-dirt.json (first response, no Spotify)
  // and odesli-ytm-dirt.json (the hop for its YouTube Music link).
  describe('the reported Apple link whose Odesli response lacks Spotify', () => {
    const DIRT_RAW = 'https://music.apple.com/us/album/dirt/6811936164?i=6811936165'
    const DIRT_YTM = 'https://music.youtube.com/watch?v=PLCHLDRdirt'
    const DIRT_LINKS = {
      'Apple Music':
        'https://geo.music.apple.com/us/album/_/6811936164?i=6811936165&mt=1&app=music&ls=1&at=1000lHKX&ct=api_http&itscg=30200&itsct=odsl_m',
      Spotify: 'https://open.spotify.com/track/0PlaceholderDirtTrack0',
      'YouTube Music': DIRT_YTM,
    }
    const DIRT_ART =
      'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/aa/bb/cc/aabbccdd-placeholder/source/512x512bb.jpg'

    async function showDirt() {
      mockFetch((url) =>
        url === odesliUrl(DIRT_RAW)
          ? jsonResponse(fixture('odesli-apple-dirt.json'))
          : url === odesliUrl(DIRT_YTM)
            ? jsonResponse(fixture('odesli-ytm-dirt.json'))
            : Promise.reject(new Error(`unexpected fetch ${url}`)),
      )
      mockJsonp(() => 'error')
      render(<App />)
      submit(DIRT_RAW)
      await waitForResult()
    }

    it('links Spotify to the track Odesli found from the YouTube Music link, tagged EXACT', async () => {
      await showDirt()
      expect(platformLink('Spotify')).toHaveAttribute('href', DIRT_LINKS.Spotify)
      expect(within(row('Spotify')).getByText('EXACT')).toBeInTheDocument()
      expect(within(row('Spotify')).queryByText('SEARCH')).not.toBeInTheDocument()
    })

    it.each(['Apple Music', 'YouTube Music'] as const)(
      "links %s to the first Odesli response's URL, tagged EXACT",
      async (name) => {
        await showDirt()
        expect(platformLink(name)).toHaveAttribute('href', DIRT_LINKS[name])
        expect(within(row(name)).getByText('EXACT')).toBeInTheDocument()
      },
    )

    it('shows the title, artist and artwork from the first Odesli response', async () => {
      await showDirt()
      expect(screen.getByText('Dirt')).toBeInTheDocument()
      expect(screen.getByText('Placeholder Artist')).toBeInTheDocument()
      expect(artwork()).toHaveAttribute('src', DIRT_ART)
    })

    it('shows no "Search in Spotify app" link', async () => {
      await showDirt()
      expect(queryPlatformLink('Search in Spotify app')).not.toBeInTheDocument()
    })
  })

  describe('copy and share', () => {
    it('copies the converted share text with "Copy share text"', async () => {
      odesliTrack()
      const writeText = stubClipboard('ok')
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitForResult()
      fireEvent.click(screen.getByRole('button', { name: 'Copy share text' }))
      await waitFor(() =>
        expect(writeText).toHaveBeenCalledWith(
          expectedShareText(`${ODESLI_TITLE} — Queen`, {
            apple: ODESLI_LINKS['Apple Music'],
            spotify: ODESLI_LINKS.Spotify,
            ytm: ODESLI_LINKS['YouTube Music'],
          }),
        ),
      )
      expect(await screen.findByRole('button', { name: 'Copied' })).toHaveClass('share')
    })

    it('copies a row link with its Copy button', async () => {
      odesliTrack()
      const writeText = stubClipboard('ok')
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitForResult()
      fireEvent.click(within(row('YouTube Music')).getByRole('button', { name: 'Copy' }))
      await waitFor(() => expect(writeText).toHaveBeenCalledWith(ODESLI_LINKS['YouTube Music']))
    })
  })
})
