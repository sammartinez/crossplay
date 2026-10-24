import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// AC15: the link, share, text and lookup modules are pure (no DOM, storage or
// network access) and keep their URLs in src/constants.ts.
// npm test runs vitest from the repo root.
const PURE_MODULES = ['types.ts', 'links.ts', 'share.ts', 'text.ts', 'lookup.ts']
const source = (file: string) => readFileSync(resolve(process.cwd(), 'src/lib', file), 'utf8')

const IMPURE =
  /\b(document|window|localStorage|sessionStorage|navigator|history|location)\s*\.|\bfetch\s*\(|\bXMLHttpRequest\b/

describe.each(PURE_MODULES)('src/lib/%s', (file) => {
  it('does not touch the DOM, storage or the network', () => {
    expect(source(file)).not.toMatch(IMPURE)
  })

  it('has no inline URL literals', () => {
    expect(source(file)).not.toMatch(/['"`]https?:\/\//)
  })
})
