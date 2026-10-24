import { StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { SPOTIFY_OEMBED_URL } from './constants'
import { odesliUrl } from './lib/lookup'
import { fixture } from './test/fixtures'
import { type Deferred, deferred, jsonResponse, mockFetch, mockJsonp } from './test/network'
import { expectedShareText, stubClipboard } from './test/clipboard'
import { expectNotShown, resultRow as row } from './test/dom'

// AC11 (convert UI), AC12 (alternates) and AC13 (copy and share), driven through App's rendered
// output with only fetch and the JSONP script load stood in.

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

// From itunes-search-songs.json, rewritten to music.apple.com without &uo=
const ALT_QUEEN_URL = 'https://music.apple.com/us/album/bohemian-rhapsody/1440806041?i=1440806768'
const ALT_PETERSENS_URL = 'https://music.apple.com/us/album/bohemian-rhapsody/1564530719?i=1564530724'
const ALT_QUEEN = 'Bohemian Rhapsody · Queen'
const ALT_LIVE_AID = 'Bohemian Rhapsody (Live Aid) · Queen'
const ALT_PETERSENS = 'Bohemian Rhapsody · The Petersens'

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

// Odesli fails, oEmbed answers, iTunes search returns `itunes`.
function spotifyFallback(itunes: unknown = fixture('itunes-search-songs.json')) {
  const fetchMock = mockFetch((url) =>
    url.startsWith(SPOTIFY_OEMBED_URL)
      ? jsonResponse(fixture('spotify-oembed-track.json'))
      : odesliFails(),
  )
  mockJsonp(() => ({ data: itunes }))
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

  describe('alternate Apple matches', () => {
    it('offers a button for each match after the first under "Wrong Apple match?"', async () => {
      spotifyFallback()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitForResult()
      expect(screen.getByText('Wrong Apple match?')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: ALT_LIVE_AID })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: ALT_PETERSENS })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: ALT_QUEEN })).not.toBeInTheDocument()
    })

    it('starts with the first match as the Apple link', async () => {
      spotifyFallback()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitForResult()
      expect(platformLink('Apple Music')).toHaveAttribute('href', ALT_QUEEN_URL)
    })

    it('makes the clicked match the Apple link, tagged EXACT', async () => {
      spotifyFallback()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitForResult()
      fireEvent.click(screen.getByRole('button', { name: ALT_PETERSENS }))
      expect(platformLink('Apple Music')).toHaveAttribute('href', ALT_PETERSENS_URL)
      expect(within(row('Apple Music')).getByText('EXACT')).toBeInTheDocument()
    })

    it('updates the artist to the clicked match', async () => {
      spotifyFallback()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitForResult()
      expect(screen.getByText('Queen')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: ALT_PETERSENS }))
      expect(screen.getByText('The Petersens')).toBeInTheDocument()
      expect(screen.queryByText('Queen')).not.toBeInTheDocument()
    })

    it('reorders the alternates so the others follow the clicked match', async () => {
      spotifyFallback()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitForResult()
      fireEvent.click(screen.getByRole('button', { name: ALT_PETERSENS }))
      const altButtons = screen
        .getAllByRole('button')
        .map((b) => b.textContent)
        .filter((text) => text === ALT_QUEEN || text === ALT_LIVE_AID || text === ALT_PETERSENS)
      expect(altButtons).toEqual([ALT_QUEEN, ALT_LIVE_AID])
    })

    it('shows no alternates block when there was only one match', async () => {
      const songs = fixture<{ results: unknown[] }>('itunes-search-songs.json')
      spotifyFallback({ resultCount: 1, results: songs.results.slice(0, 1) })
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitForResult()
      expect(screen.queryByText('Wrong Apple match?')).not.toBeInTheDocument()
    })

    it('shows no alternates block for an Odesli result', async () => {
      odesliTrack()
      render(<App />)
      submit(SPOTIFY_TRACK_RAW)
      await waitForResult()
      expect(screen.queryByText('Wrong Apple match?')).not.toBeInTheDocument()
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
