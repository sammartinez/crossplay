import { describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY } from '../src/constants'

describe('constants', () => {
  it('stores the theme choice under the cp-theme key', () => {
    expect(THEME_STORAGE_KEY).toBe('cp-theme')
  })
})
