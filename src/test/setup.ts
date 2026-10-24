import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { resetSystemTheme } from './systemTheme'

// Each test starts from a clean page: no rendered tree, no stored values,
// no theme attribute on <html>, and the system theme reset to light.
resetSystemTheme()

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  try {
    localStorage.clear()
  } catch {
    // storage may have been stubbed to throw; restoreAllMocks undoes that
  }
  document.documentElement.removeAttribute('data-theme')
  resetSystemTheme()
})
