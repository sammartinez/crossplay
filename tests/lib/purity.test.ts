import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
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

// PLAN-004 AC1: Odesli is gone. No file under src/ names it or its host, in
// code, comments or user-facing text.
const SRC = resolve(process.cwd(), 'src')
const srcFiles = readdirSync(SRC, { recursive: true, encoding: 'utf8' }).filter((file) =>
  statSync(join(SRC, file)).isFile(),
)

describe('src/', () => {
  it('has source files to check', () => {
    expect(srcFiles).toContain('lib/api.ts')
  })

  it.each(srcFiles)('src/%s does not mention Odesli or song.link', (file) => {
    const text = readFileSync(join(SRC, file), 'utf8')
    expect(text.match(/odesli|song\.link/gi)).toBeNull()
  })
})
