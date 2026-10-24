import { describe, expect, it } from 'vitest'
import { applyTheme, nextTheme, readStoredTheme } from '../../src/lib/theme'
import { makeStorageThrow } from '../support/storage'

const KEY = 'cp-theme'

describe('readStoredTheme', () => {
  it('returns null when no theme has been stored', () => {
    expect(readStoredTheme()).toBeNull()
  })

  it('returns the stored dark theme', () => {
    localStorage.setItem(KEY, 'dark')
    expect(readStoredTheme()).toBe('dark')
  })

  it('returns the stored light theme', () => {
    localStorage.setItem(KEY, 'light')
    expect(readStoredTheme()).toBe('light')
  })

  it('returns null instead of throwing when storage throws', () => {
    makeStorageThrow()
    expect(readStoredTheme()).toBeNull()
  })
})

describe('applyTheme', () => {
  it('sets data-theme on <html> to the given theme', () => {
    applyTheme('dark')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('persists the given theme under cp-theme', () => {
    applyTheme('light')
    expect(localStorage.getItem(KEY)).toBe('light')
  })

  it('makes the applied theme readable by readStoredTheme', () => {
    applyTheme('dark')
    expect(readStoredTheme()).toBe('dark')
  })

  it('removes data-theme from <html> when given null, so the system theme shows', () => {
    applyTheme('dark')
    applyTheme(null)
    expect(document.documentElement).not.toHaveAttribute('data-theme')
  })

  it('clears the stored theme when given null', () => {
    applyTheme('dark')
    applyTheme(null)
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('still sets data-theme when storage throws', () => {
    makeStorageThrow()
    expect(() => applyTheme('dark')).not.toThrow()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('does not throw when clearing the theme and storage throws', () => {
    makeStorageThrow()
    expect(() => applyTheme(null)).not.toThrow()
    expect(document.documentElement).not.toHaveAttribute('data-theme')
  })
})

describe('nextTheme', () => {
  it('returns light after dark', () => {
    expect(nextTheme('dark')).toBe('light')
  })

  it('returns dark after light', () => {
    expect(nextTheme('light')).toBe('dark')
  })
})
