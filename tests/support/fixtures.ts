import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Loads a JSON fixture from tests/support/fixtures/. The return type is inferred
// from where the fixture is passed, so tests don't name the response types.
// npm test runs vitest from the repo root.
export function fixture<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), 'tests/support/fixtures', name), 'utf8')) as T
}

type OdesliFixture = { linksByPlatform?: Record<string, unknown> }

// An Odesli fixture with some `linksByPlatform` entries removed, for the
// responses that differ from a recorded one only by a missing platform.
export function odesliWithout<T extends OdesliFixture>(name: string, ...platforms: string[]): T {
  const body = fixture<T>(name)
  const linksByPlatform = { ...body.linksByPlatform }
  for (const platform of platforms) delete linksByPlatform[platform]
  return { ...body, linksByPlatform }
}
