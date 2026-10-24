import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ResultCard from '../../src/components/ResultCard'
import { withSearchFallbacks } from '../../src/lib/links'
import type { AppleAlt } from '../../src/lib/types'
import {
  FALLBACK_LABEL,
  RESET_MS,
  advance,
  clickAndSettle,
  expectedShareText,
  selectedText,
  stubClipboard,
  stubExecCommand,
} from '../support/clipboard'
import { expectNotShown, isShown, resultRow as row } from '../support/dom'

// AC11 (result card), AC12 (alternates) and AC13 (copy and share), from a
// Conversion prop.

const ALTS: AppleAlt[] = [
  { title: 'Song', artist: 'First Artist', url: 'https://music.apple.com/us/album/song/1?i=11' },
  { title: 'Song (Live)', artist: 'Second Artist', url: 'https://music.apple.com/us/album/song/2?i=22' },
  { title: 'Song', artist: 'Third Artist', url: 'https://music.apple.com/us/album/song/3?i=33' },
]

const CONVERSION = withSearchFallbacks({
  title: 'Song',
  artist: 'First Artist',
  art: 'https://example.com/art.jpg',
  links: { spotify: 'https://open.spotify.com/track/abc', apple: ALTS[0].url },
  alts: ALTS,
})

function renderCard(conversion = CONVERSION) {
  const onChooseAlt = vi.fn()
  const view = render(<ResultCard conversion={conversion} onChooseAlt={onChooseAlt} />)
  return { onChooseAlt, view }
}

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

  it('shows "Wrong Apple match?" with a "<title> · <artist>" button for each other match', () => {
    renderCard()
    expect(screen.getByText('Wrong Apple match?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Song (Live) · Second Artist' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Song · Third Artist' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Song · First Artist' })).not.toBeInTheDocument()
  })

  it('calls onChooseAlt with the clicked match', () => {
    const { onChooseAlt } = renderCard()
    fireEvent.click(screen.getByRole('button', { name: 'Song · Third Artist' }))
    expect(onChooseAlt).toHaveBeenCalledTimes(1)
    expect(onChooseAlt).toHaveBeenCalledWith(ALTS[2])
  })

  it('hides the alternates block with a single match', () => {
    renderCard({ ...CONVERSION, alts: ALTS.slice(0, 1) })
    expect(screen.queryByText('Wrong Apple match?')).not.toBeInTheDocument()
  })

  it('hides the alternates block with no matches', () => {
    renderCard({ ...CONVERSION, alts: undefined })
    expect(screen.queryByText('Wrong Apple match?')).not.toBeInTheDocument()
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
