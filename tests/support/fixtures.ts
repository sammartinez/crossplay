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

type OdesliEntityFixture = { title?: string; artistName?: string }
type OdesliEntitiesFixture = { entitiesByUniqueId: Record<string, OdesliEntityFixture> }

// An Odesli fixture with entity fields replaced: on the one entity `entityId`
// names, or on every entity when it is left out. A field set to undefined is
// cleared.
export function odesliEntityWith<T>(name: string, changes: OdesliEntityFixture, entityId?: string): T {
  const body = fixture<OdesliEntitiesFixture>(name)
  const entitiesByUniqueId = Object.fromEntries(
    Object.entries(body.entitiesByUniqueId).map(([id, entity]) => [
      id,
      entityId === undefined || id === entityId ? { ...entity, ...changes } : entity,
    ]),
  )
  return { ...body, entitiesByUniqueId } as T
}

// odesli-ytm-dirt.json (the hop for the reported case) with entity fields replaced.
export const ytmDirtWith = <T>(changes: OdesliEntityFixture, entityId?: string): T =>
  odesliEntityWith<T>('odesli-ytm-dirt.json', changes, entityId)
