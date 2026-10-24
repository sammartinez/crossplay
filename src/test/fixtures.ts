import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Loads a JSON fixture from src/test/fixtures/. The return type is inferred
// from where the fixture is passed, so tests don't name the response types.
// npm test runs vitest from the repo root.
export function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), 'src/test/fixtures', name), 'utf8')) as T
}
