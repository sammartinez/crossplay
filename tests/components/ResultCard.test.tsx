import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ResultCard from '../../src/components/ResultCard'
import { withSearchFallbacks } from '../../src/lib/links'
import type { ArtistCandidate } from '../../src/lib/types'
import {
  FALLBACK_LABEL,
  RESET_MS,
  advance,
  clickAndSettle,
  selectedText,
  stubClipboard,
  stubExecCommand,
} from '../support/clipboard'
import { expectedShareText } from '../support/cases'
import { expectNotShown, isShown, resultRow as row } from '../support/dom'

// AC11 (result card) and AC13 (copy and share), from a Conversion prop.
// PLAN-002 AC5/AC7: the honest fallback and the "Which artist?" picker.

const CANDIDATES: ArtistCandidate[] = [
  { artist: 'First Artist', title: 'Song', url: 'https://music.apple.com/us/album/song/1?i=11' },
  { artist: 'Second Artist', title: 'Song (Live)', url: 'https://music.apple.com/us/album/song/2?i=22' },
  { artist: 'Third Artist', title: 'Other Song', url: 'https://music.apple.com/us/album/other/3?i=33' },
]
const CANDIDATE_NAMES = ['First Artist · Song', 'Second Artist · Song (Live)', 'Third Artist · Other Song']

// A Spotify-source result after the user picked an artist: Apple and Spotify
// exact, YouTube Music a search, no candidates.
const CONVERSION = withSearchFallbacks({
  title: 'Song',
  artist: 'First Artist',
  art: 'https://example.com/art.jpg',
  links: { spotify: 'https://open.spotify.com/track/abc', apple: CANDIDATES[0].url },
})

// A Spotify fallback result: blank artist, Spotify exact, candidates to pick from.
const FALLBACK = withSearchFallbacks({
  title: 'Song',
  artist: '',
  art: 'https://example.com/art.jpg',
  links: { spotify: 'https://open.spotify.com/track/abc' },
  candidates: CANDIDATES,
})

// An Apple-source result: only the Apple link is exact, so Spotify and
// YouTube Music are searches.
const SPOTIFY_SEARCH = withSearchFallbacks({
  title: 'Song',
  artist: 'First Artist',
  art: 'https://example.com/art.jpg',
  links: { apple: CANDIDATES[0].url },
})
const SPOTIFY_WEB_SEARCH = 'https://open.spotify.com/search/Song%20First%20Artist'
const SPOTIFY_APP_SEARCH = 'spotify:search:Song%20First%20Artist'
const APP_LINK_NAME = 'Search in Spotify app'

// PLAN-004 AC5: a Spotify fallback where First Artist was auto-picked, so the
// Apple link is their song, tagged LIKELY.
const AUTO_PICKED = withSearchFallbacks({
  title: 'Song',
  artist: 'First Artist',
  art: 'https://example.com/art.jpg',
  links: { spotify: 'https://open.spotify.com/track/abc', apple: CANDIDATES[0].url },
  candidates: CANDIDATES,
  likely: { apple: true },
})

// The tag in a row: the element whose whole text is EXACT, LIKELY or SEARCH.
const tagIn = (name: string) => within(row(name)).getByText(/^(EXACT|LIKELY|SEARCH)$/)

function renderCard(conversion = CONVERSION) {
  const onChooseArtist = vi.fn()
  const view = render(<ResultCard conversion={conversion} onChooseArtist={onChooseArtist} />)
  return { onChooseArtist, view }
}

const picker = () => screen.getByRole('group', { name: 'Which artist?' })
const queryPicker = () => screen.queryByRole('group', { name: 'Which artist?' })
const candidateButton = (name: string) => within(picker()).getByRole('button', { name })

describe('ResultCard', () => {
  it('shows the title and the artist', () => {
    renderCard()
    expect(screen.getByText('Song')).toBeInTheDocument()
    expect(screen.getByText('First Artist')).toBeInTheDocument()
  })

  it('shows the artwork', () => {
    const { view } = renderCard()
    const img = view.container.querySelector('img')
    expect(img).toHaveAttribute('src', 'https://example.com/art.jpg')
    expect(img).toBeVisible()
  })

  it('hides the artwork when there is none', () => {
    const { view } = renderCard({ ...CONVERSION, art: undefined })
    const img = view.container.querySelector('img')
    expectNotShown(img)
  })

  it('links each platform in a new tab with rel="noopener"', () => {
    renderCard()
    for (const [name, href] of [
      ['Apple Music', CONVERSION.links.apple],
      ['Spotify', CONVERSION.links.spotify],
      ['YouTube Music', CONVERSION.links.ytm],
    ]) {
      const link = screen.getByRole('link', { name })
      expect(link).toHaveAttribute('href', href)
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener')
    }
  })

  it('tags exact links EXACT and search links SEARCH', () => {
    renderCard()
    expect(within(row('Apple Music')).getByText('EXACT')).toBeInTheDocument()
    expect(within(row('Spotify')).getByText('EXACT')).toBeInTheDocument()
    expect(within(row('YouTube Music')).getByText('SEARCH')).toBeInTheDocument()
  })

  // PLAN-004 AC5/AC8: each row's tag is EXACT, LIKELY or SEARCH, each styled
  // with its own class.
  describe('tags', () => {
    it('tags a likely Apple link LIKELY, not EXACT or SEARCH', () => {
      renderCard(AUTO_PICKED)
      expect(tagIn('Apple Music')).toHaveTextContent('LIKELY')
      expect(within(row('Apple Music')).queryByText('EXACT')).not.toBeInTheDocument()
      expect(within(row('Apple Music')).queryByText('SEARCH')).not.toBeInTheDocument()
    })

    it('keeps the likely Apple link as the Apple Music href', () => {
      renderCard(AUTO_PICKED)
      expect(screen.getByRole('link', { name: 'Apple Music' })).toHaveAttribute('href', CANDIDATES[0].url)
    })

    it('tags the other rows of an auto-picked result EXACT and SEARCH', () => {
      renderCard(AUTO_PICKED)
      expect(tagIn('Spotify')).toHaveTextContent('EXACT')
      expect(tagIn('YouTube Music')).toHaveTextContent('SEARCH')
    })

    it('shows exactly one LIKELY tag for an auto-picked result', () => {
      renderCard(AUTO_PICKED)
      expect(screen.getAllByText('LIKELY')).toHaveLength(1)
    })

    it('shows no LIKELY tag when nothing is likely', () => {
      renderCard(FALLBACK)
      expect(screen.queryByText('LIKELY')).not.toBeInTheDocument()
    })

    it('gives an EXACT tag the classes "tag exact"', () => {
      renderCard(AUTO_PICKED)
      expect(tagIn('Spotify')).toHaveAttribute('class', 'tag exact')
    })

    it('gives a LIKELY tag the classes "tag likely"', () => {
      renderCard(AUTO_PICKED)
      expect(tagIn('Apple Music')).toHaveAttribute('class', 'tag likely')
    })

    it('gives a SEARCH tag the class "tag" alone', () => {
      renderCard(AUTO_PICKED)
      expect(tagIn('YouTube Music')).toHaveAttribute('class', 'tag')
    })

    it('presses the auto-picked artist\'s button and no other', () => {
      renderCard(AUTO_PICKED)
      expect(candidateButton(CANDIDATE_NAMES[0])).toHaveAttribute('aria-pressed', 'true')
      expect(candidateButton(CANDIDATE_NAMES[1])).toHaveAttribute('aria-pressed', 'false')
      expect(candidateButton(CANDIDATE_NAMES[2])).toHaveAttribute('aria-pressed', 'false')
    })

    it('shows the auto-picked artist under the title', () => {
      renderCard(AUTO_PICKED)
      expect(screen.getByText('First Artist')).toBeInTheDocument()
    })

    // The card's stylesheet, read as text: jsdom applies no CSS.
    describe('styles', () => {
      const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8')
      const ruleColor = (selector: string) => {
        const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const rule = css.match(new RegExp(`(?:^|[}\\s,])${escaped}\\s*\\{([^}]*)\\}`))
        return rule?.[1].match(/(?:^|;)\s*color\s*:\s*([^;]+)/)?.[1].trim()
      }
      // The body of the block that opens with `opener`, up to its first `}`.
      const blockAfter = (opener: string) => {
        const at = css.indexOf(opener)
        return at < 0 ? '' : css.slice(at, css.indexOf('}', at))
      }

      it('gives .tag.likely its own color, distinct from .tag and .tag.exact', () => {
        const likely = ruleColor('.tag.likely')
        expect(likely).toBeDefined()
        expect(likely).not.toBe(ruleColor('.tag'))
        expect(likely).not.toBe(ruleColor('.tag.exact'))
      })

      it('uses a color token for .tag.likely that both palettes define', () => {
        const token = ruleColor('.tag.likely')?.match(/^var\((--[\w-]+)\)$/)?.[1]
        expect(token).toBeDefined()
        expect(token).not.toBe('--muted')
        expect(token).not.toBe('--ok')
        expect(blockAfter(':root{')).toContain(`${token}:`)
        expect(blockAfter('[data-theme="dark"]{')).toContain(`${token}:`)
        expect(blockAfter('@media (prefers-color-scheme:dark)')).toContain(`${token}:`)
      })
    })
  })

  describe('Spotify app search link', () => {
    const appLink = () => screen.getByRole('link', { name: APP_LINK_NAME })
    const queryAppLink = () => screen.queryByRole('link', { name: APP_LINK_NAME })

    it('shows a "Search in Spotify app" link when Spotify is a search', () => {
      renderCard(SPOTIFY_SEARCH)
      expect(appLink()).toBeInTheDocument()
    })

    it('points the app link at spotify:search: with the "title artist" query encoded', () => {
      renderCard(SPOTIFY_SEARCH)
      expect(appLink()).toHaveAttribute('href', SPOTIFY_APP_SEARCH)
    })

    it('puts the app link in the Spotify row', () => {
      renderCard(SPOTIFY_SEARCH)
      expect(within(row('Spotify')).getByRole('link', { name: APP_LINK_NAME })).toBe(appLink())
    })

    it('does not open the app link in a new tab', () => {
      renderCard(SPOTIFY_SEARCH)
      expect(appLink()).not.toHaveAttribute('target')
    })

    it('keeps the "Spotify" link on the web search, tagged SEARCH, with a Copy button', () => {
      renderCard(SPOTIFY_SEARCH)
      expect(screen.getByRole('link', { name: 'Spotify' })).toHaveAttribute('href', SPOTIFY_WEB_SEARCH)
      expect(within(row('Spotify')).getByText('SEARCH')).toBeInTheDocument()
      expect(within(row('Spotify')).queryByText('EXACT')).not.toBeInTheDocument()
      expect(within(row('Spotify')).getByRole('button', { name: 'Copy' })).toBeInTheDocument()
    })

    it('uses the title alone in the app link when the artist is empty', () => {
      renderCard(withSearchFallbacks({ title: 'Song', artist: '', links: { apple: CANDIDATES[0].url } }))
      expect(appLink()).toHaveAttribute('href', 'spotify:search:Song')
    })

    it('shows no app link when Spotify is exact', () => {
      renderCard()
      expect(queryAppLink()).not.toBeInTheDocument()
    })

    it('shows no app link in the Spotify-source fallback, where Spotify stays exact', () => {
      renderCard(FALLBACK)
      expect(queryAppLink()).not.toBeInTheDocument()
    })

    it('shows only one link in the Apple Music and YouTube Music rows', () => {
      renderCard(SPOTIFY_SEARCH)
      expect(within(row('Apple Music')).getAllByRole('link')).toHaveLength(1)
      expect(within(row('YouTube Music')).getAllByRole('link')).toHaveLength(1)
    })

    it('never shows a link to a spotify: URI unless it is the app link', () => {
      renderCard(SPOTIFY_SEARCH)
      const spotifyScheme = screen
        .getAllByRole('link')
        .filter((a) => a.getAttribute('href')?.startsWith('spotify:'))
      expect(spotifyScheme).toEqual([appLink()])
    })

    describe('copy and share', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })

      it('copies the web search URL, not the app URI, from the Spotify row', async () => {
        const writeText = stubClipboard('ok')
        renderCard(SPOTIFY_SEARCH)
        await clickAndSettle(within(row('Spotify')).getByRole('button', { name: 'Copy' }))
        expect(writeText).toHaveBeenCalledWith(SPOTIFY_WEB_SEARCH)
      })

      it('shares the web search URL and never the spotify: URI', async () => {
        const writeText = stubClipboard('ok')
        renderCard(SPOTIFY_SEARCH)
        await clickAndSettle(screen.getByRole('button', { name: 'Copy share text' }))
        expect(writeText).toHaveBeenCalledWith(
          expectedShareText('Song — First Artist', SPOTIFY_SEARCH.links),
        )
        expect(writeText.mock.calls[0][0]).toContain(`Spotify: ${SPOTIFY_WEB_SEARCH}`)
        expect(writeText.mock.calls[0][0]).not.toContain('spotify:')
      })
    })
  })

  describe('artist picker', () => {
    it('shows a group labelled "Which artist?" when there are candidates', () => {
      renderCard(FALLBACK)
      expect(picker()).toBeInTheDocument()
      expect(screen.getByText('Which artist?')).toBeInTheDocument()
    })

    it('shows one "<artist> · <title>" button per candidate, in order', () => {
      renderCard(FALLBACK)
      const names = within(picker())
        .getAllByRole('button')
        .map((b) => b.textContent)
      expect(names).toEqual(CANDIDATE_NAMES)
    })

    it('makes each candidate a plain button, not a submit button', () => {
      renderCard(FALLBACK)
      for (const name of CANDIDATE_NAMES) {
        expect(candidateButton(name)).toHaveAttribute('type', 'button')
      }
    })

    it('presses no button while the artist is blank', () => {
      renderCard(FALLBACK)
      for (const name of CANDIDATE_NAMES) {
        expect(candidateButton(name)).toHaveAttribute('aria-pressed', 'false')
      }
    })

    it('presses the button of the candidate whose artist is the current artist', () => {
      renderCard({ ...FALLBACK, artist: 'Second Artist' })
      expect(candidateButton('First Artist · Song')).toHaveAttribute('aria-pressed', 'false')
      expect(candidateButton('Second Artist · Song (Live)')).toHaveAttribute('aria-pressed', 'true')
      expect(candidateButton('Third Artist · Other Song')).toHaveAttribute('aria-pressed', 'false')
    })

    it('calls onChooseArtist with the clicked candidate', () => {
      const { onChooseArtist } = renderCard(FALLBACK)
      fireEvent.click(candidateButton('Third Artist · Other Song'))
      expect(onChooseArtist).toHaveBeenCalledTimes(1)
      expect(onChooseArtist).toHaveBeenCalledWith(CANDIDATES[2])
    })

    it('shows no artist name under the title while the artist is blank', () => {
      renderCard(FALLBACK)
      expect(screen.getByText('Song')).toBeInTheDocument()
      for (const { artist } of CANDIDATES) {
        expect(screen.queryByText(artist)).not.toBeInTheDocument()
      }
    })

    it('tags the fallback Apple Music and YouTube Music rows SEARCH and Spotify EXACT', () => {
      renderCard(FALLBACK)
      expect(within(row('Apple Music')).getByText('SEARCH')).toBeInTheDocument()
      expect(within(row('Spotify')).getByText('EXACT')).toBeInTheDocument()
      expect(within(row('YouTube Music')).getByText('SEARCH')).toBeInTheDocument()
    })

    it('hides the picker when there are no candidates', () => {
      renderCard({ ...FALLBACK, candidates: undefined })
      expect(queryPicker()).not.toBeInTheDocument()
      expect(screen.queryByText('Which artist?')).not.toBeInTheDocument()
    })

    it('hides the picker when the candidate list is empty', () => {
      renderCard({ ...FALLBACK, candidates: [] })
      expect(queryPicker()).not.toBeInTheDocument()
      expect(screen.queryByText('Which artist?')).not.toBeInTheDocument()
    })

    it('shows the picker for a single candidate', () => {
      renderCard({ ...FALLBACK, candidates: CANDIDATES.slice(0, 1) })
      expect(within(picker()).getAllByRole('button')).toHaveLength(1)
    })

    it('never shows the old "Wrong Apple match?" block', () => {
      renderCard(FALLBACK)
      expect(screen.queryByText('Wrong Apple match?')).not.toBeInTheDocument()
    })
  })

  describe('copy and share', () => {
    const SHARE_TEXT = expectedShareText('Song — First Artist', CONVERSION.links)

    const rowCopyButton = (name: string) => within(row(name)).getByRole('button')
    const shareButton = () => screen.getByRole('button', { name: 'Copy share text' })
    const fallback = () => screen.getByLabelText(FALLBACK_LABEL) as HTMLTextAreaElement

    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('gives each platform row a Copy button', () => {
      renderCard()
      for (const name of ['Apple Music', 'Spotify', 'YouTube Music']) {
        expect(rowCopyButton(name).textContent).toBe('Copy')
      }
    })

    it.each([
      ['Apple Music', CONVERSION.links.apple],
      ['Spotify', CONVERSION.links.spotify],
      ['YouTube Music', CONVERSION.links.ytm],
    ])('copies the %s link from its row', async (name, href) => {
      const writeText = stubClipboard('ok')
      renderCard()
      await clickAndSettle(rowCopyButton(name))
      expect(writeText).toHaveBeenCalledTimes(1)
      expect(writeText).toHaveBeenCalledWith(href)
    })

    it('reads "Copied" on the clicked row only', async () => {
      stubClipboard('ok')
      renderCard()
      const spotifyButton = rowCopyButton('Spotify')
      await clickAndSettle(spotifyButton)
      expect(spotifyButton.textContent).toBe('Copied')
      expect(rowCopyButton('Apple Music').textContent).toBe('Copy')
      expect(rowCopyButton('YouTube Music').textContent).toBe('Copy')
    })

    it('sets the row button back to "Copy" after 1.4 s', async () => {
      stubClipboard('ok')
      renderCard()
      const spotifyButton = rowCopyButton('Spotify')
      await clickAndSettle(spotifyButton)
      await advance(RESET_MS - 1)
      expect(spotifyButton.textContent).toBe('Copied')
      await advance(1)
      expect(spotifyButton.textContent).toBe('Copy')
    })

    it('shows a "Copy share text" button with the share class', () => {
      renderCard()
      expect(shareButton()).toHaveClass('share')
    })

    it('copies "<title> — <artist>" and one line per platform as share text', async () => {
      const writeText = stubClipboard('ok')
      renderCard()
      await clickAndSettle(shareButton())
      expect(writeText).toHaveBeenCalledWith(SHARE_TEXT)
    })

    it('starts the share text with the title alone when the artist is empty', async () => {
      const writeText = stubClipboard('ok')
      renderCard({ ...CONVERSION, artist: '' })
      await clickAndSettle(shareButton())
      expect(writeText).toHaveBeenCalledWith(expectedShareText('Song', CONVERSION.links))
    })

    it('reads "Copied" on the share button, then "Copy share text" after 1.4 s', async () => {
      stubClipboard('ok')
      renderCard()
      const button = shareButton()
      await clickAndSettle(button)
      expect(button.textContent).toBe('Copied')
      await advance(RESET_MS)
      expect(button.textContent).toBe('Copy share text')
    })

    it('has a read-only fallback textarea labelled "Text to copy", hidden until needed', () => {
      renderCard()
      expect(fallback()).toHaveAttribute('readonly')
      expectNotShown(fallback())
    })

    it('keeps the fallback textarea hidden when the clipboard copy works', async () => {
      stubClipboard('ok')
      renderCard()
      await clickAndSettle(shareButton())
      expectNotShown(fallback())
    })

    it('copies the share text with execCommand from the textarea when the clipboard is blocked', async () => {
      stubClipboard('blocked')
      const execCommand = stubExecCommand('ok')
      renderCard()
      await clickAndSettle(shareButton())
      expect(execCommand).toHaveBeenCalledWith('copy')
      expect(execCommand.selected).toEqual([SHARE_TEXT])
    })

    it('reads "Copied" and hides the textarea when execCommand copies', async () => {
      stubClipboard('blocked')
      stubExecCommand('ok')
      renderCard()
      const button = shareButton()
      await clickAndSettle(button)
      expect(button.textContent).toBe('Copied')
      expectNotShown(fallback())
    })

    it('shows the textarea with the text selected and focused when execCommand fails', async () => {
      stubClipboard('blocked')
      stubExecCommand('refused')
      renderCard()
      await clickAndSettle(shareButton())
      const box = fallback()
      expect(isShown(box)).toBe(true)
      expect(box).toHaveValue(SHARE_TEXT)
      expect(selectedText(box)).toBe(SHARE_TEXT)
      expect(box).toHaveFocus()
    })

    it('reads "Copy it below" when execCommand fails', async () => {
      stubClipboard('blocked')
      stubExecCommand('refused')
      renderCard()
      const button = shareButton()
      await clickAndSettle(button)
      expect(button.textContent).toBe('Copy it below')
    })

    it('shows the row link in the textarea when a row copy falls back to manual', async () => {
      stubClipboard('blocked')
      stubExecCommand('throws')
      renderCard()
      const spotifyButton = rowCopyButton('Spotify')
      await clickAndSettle(spotifyButton)
      expect(spotifyButton.textContent).toBe('Copy it below')
      expect(isShown(fallback())).toBe(true)
      expect(selectedText(fallback())).toBe(CONVERSION.links.spotify)
    })

    it('hides the textarea again when a later copy works', async () => {
      const writeText = stubClipboard('blocked')
      stubExecCommand('refused')
      renderCard()
      await clickAndSettle(shareButton())
      expect(isShown(fallback())).toBe(true)
      writeText.mockResolvedValue(undefined)
      await clickAndSettle(rowCopyButton('Spotify'))
      expectNotShown(fallback())
    })
  })
})
