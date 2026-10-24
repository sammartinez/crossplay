import {
  DARK_SCHEME_QUERY,
  THEME_ATTRIBUTE,
  THEME_DARK,
  THEME_LIGHT,
  THEME_STORAGE_KEY,
} from '../constants'

export type Theme = typeof THEME_LIGHT | typeof THEME_DARK

const isTheme = (value: string | null): value is Theme =>
  value === THEME_LIGHT || value === THEME_DARK

// Storage throws in Safari private mode and when site data is blocked. The
// theme is a convenience, so a storage failure means "no saved choice".
export function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(stored) ? stored : null
  } catch {
    return null
  }
}

// null hands the theme back to the system.
export function applyTheme(theme: Theme | null): void {
  const root = document.documentElement
  if (theme) root.setAttribute(THEME_ATTRIBUTE, theme)
  else root.removeAttribute(THEME_ATTRIBUTE)
  try {
    if (theme) localStorage.setItem(THEME_STORAGE_KEY, theme)
    else localStorage.removeItem(THEME_STORAGE_KEY)
  } catch {
    // Not persisting is the recovery; the theme still applies for this visit.
  }
}

export function shownTheme(): Theme {
  const chosen = document.documentElement.getAttribute(THEME_ATTRIBUTE)
  if (isTheme(chosen)) return chosen
  return matchMedia(DARK_SCHEME_QUERY).matches ? THEME_DARK : THEME_LIGHT
}

export function nextTheme(current: Theme): Theme {
  return current === THEME_DARK ? THEME_LIGHT : THEME_DARK
}
