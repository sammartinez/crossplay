import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

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
})
