import { describe, expect, it } from 'vitest'
import { SPOTIFY_APP_SEARCH_URI, THEME_STORAGE_KEY } from '../src/constants'

describe('constants', () => {
  it('stores the theme choice under the cp-theme key', () => {
    expect(THEME_STORAGE_KEY).toBe('cp-theme')
  })

  it('opens Spotify app searches with the spotify:search: scheme', () => {
    expect(SPOTIFY_APP_SEARCH_URI).toBe('spotify:search:')
  })
})
