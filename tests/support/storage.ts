import { vi } from 'vitest'

// Makes every localStorage call throw, as Safari private mode and blocked
// site data do. Undone by vi.restoreAllMocks() in setup.ts.
export function makeStorageThrow(): void {
  const fail = () => {
    throw new DOMException('storage blocked', 'SecurityError')
  }
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(fail)
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(fail)
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(fail)
}
