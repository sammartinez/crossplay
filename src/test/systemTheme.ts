// jsdom has no matchMedia. These helpers stand in for the OS colour-scheme
// setting so tests can say which theme the system prefers.
type SystemTheme = 'light' | 'dark'

const DARK_QUERY = /prefers-color-scheme:\s*dark/
const LIGHT_QUERY = /prefers-color-scheme:\s*light/

export function mockSystemTheme(theme: SystemTheme): void {
  const matchMedia = (query: string): MediaQueryList => ({
    matches: theme === 'dark' ? DARK_QUERY.test(query) : LIGHT_QUERY.test(query),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMedia,
  })
}

export function resetSystemTheme(): void {
  mockSystemTheme('light')
}
