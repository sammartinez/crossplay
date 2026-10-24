import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ResultCard from './ResultCard'
import { withSearchFallbacks } from '../lib/links'
import type { AppleAlt } from '../lib/types'
import { isShown } from '../test/dom'

// AC11 (result card) and AC12 (alternates), from a Conversion prop.

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

const row = (name: string) => {
  const li = screen
    .getAllByRole('listitem')
    .find((item) => within(item).queryByRole('link', { name }))
  if (!li) throw new Error(`no result row for ${name}`)
  return li
}


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
    expect(img !== null && isShown(img)).toBe(false)
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
})
