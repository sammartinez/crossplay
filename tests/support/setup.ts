import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { resetClipboardStubs } from './clipboard'
import { checkNoUnexpectedFetches, stopJsonp } from './network'
import { resetSystemTheme } from './systemTheme'

// Each test starts from a clean page: no rendered tree, no stored values,
// no theme attribute on <html>, the system theme reset to light, real timers,
// no JSONP stand-in, no clipboard or execCommand stand-in and the page URL
// back at /. A test whose strict fetch stand-in got a request it didn't expect
// fails here.
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
  stopJsonp()
  resetClipboardStubs()
  vi.useRealTimers()
  window.history.replaceState(null, '', '/')
  checkNoUnexpectedFetches()
})
