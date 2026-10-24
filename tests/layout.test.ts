import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

// MR-007 (PLAN-002 AC1–AC3): tests live under tests/, mirroring src/, with
// helpers, setup and fixtures in tests/support/. The config points vitest and
// tsc at the new home, and no production file reaches into tests/.
// npm test runs vitest from the repo root.
const root = process.cwd()
const read = (file: string) => readFileSync(resolve(root, file), 'utf8')

// Every file under dir, as a repo-relative path with forward slashes.
const filesUnder = (dir: string): string[] =>
  readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`
    return entry.isDirectory() ? filesUnder(path) : [path]
  })

const TEST_FILE = /\.test\.tsx?$/
const SOURCE_EXTENSIONS = ['.ts', '.tsx']

// Test files that check the repo as a whole rather than one source module.
// constants.test.ts is not listed: it mirrors src/constants.ts.
const REPO_LEVEL_CHECKS = [
  'tests/layout.test.ts',
  'tests/deploy.test.ts',
  'tests/pageShell.test.ts',
  'tests/literals.test.ts',
  'tests/lib/purity.test.ts',
]

// tests/components/ResultCard.test.tsx -> src/components/ResultCard.{ts,tsx}
const mirroredSources = (testFile: string) => {
  const base = testFile.replace(/^tests\//, 'src/').replace(TEST_FILE, '')
  return SOURCE_EXTENSIONS.map((ext) => base + ext)
}

const testFiles = filesUnder('tests').filter((f) => TEST_FILE.test(f))
const sourceFiles = filesUnder('src')

describe('src/', () => {
  it('contains no test or spec files', () => {
    expect(sourceFiles.filter((f) => /\.(test|spec)\./.test(f))).toEqual([])
  })

  it('has no src/test directory', () => {
    expect(existsSync(resolve(root, 'src/test'))).toBe(false)
  })

  it('does not import from tests/', () => {
    const SPECIFIER = /(?:\bfrom|\bimport)\s*\(?\s*['"]([^'"]+)['"]/g
    const offenders = sourceFiles
      .filter((f) => /\.(ts|tsx|js|jsx)$/.test(f))
      .flatMap((file) =>
        [...read(file).matchAll(SPECIFIER)]
          .map((m) => m[1])
          .filter((spec) => {
            const target = spec.startsWith('.')
              ? relative(root, resolve(root, dirname(file), spec)).split(sep).join('/')
              : spec.replace(/^\//, '')
            return target === 'tests' || target.startsWith('tests/')
          })
          .map((spec) => `${file}: ${spec}`),
      )
    expect(offenders).toEqual([])
  })
})

describe('tests/', () => {
  it('holds the moved test files', () => {
    expect(testFiles).toEqual(
      expect.arrayContaining([
        'tests/App.test.tsx',
        'tests/components/ResultCard.test.tsx',
        'tests/hooks/useConversion.test.ts',
        'tests/lib/lookup.test.ts',
      ]),
    )
  })

  it.each(testFiles.filter((f) => !REPO_LEVEL_CHECKS.includes(f)))(
    '%s mirrors a source file under src/',
    (testFile) => {
      expect(mirroredSources(testFile).filter((src) => existsSync(resolve(root, src)))).not.toEqual([])
    },
  )

  it('keeps every non-test file under tests/support/', () => {
    expect(filesUnder('tests').filter((f) => !TEST_FILE.test(f) && !f.startsWith('tests/support/'))).toEqual([])
  })

  it('keeps JSON fixtures under tests/support/fixtures/', () => {
    const json = filesUnder('tests').filter((f) => f.endsWith('.json'))
    expect(json.length).toBeGreaterThan(0)
    expect(json.filter((f) => !f.startsWith('tests/support/fixtures/'))).toEqual([])
  })
})

describe('config', () => {
  it('sets vitest setupFiles to tests/support/setup.ts', () => {
    expect(read('vite.config.ts')).toMatch(/setupFiles:\s*\[\s*['"]tests\/support\/setup\.ts['"],?\s*\]/)
  })

  it('includes tests in tsconfig.json', () => {
    const tsconfig = JSON.parse(read('tsconfig.json')) as { include?: string[] }
    expect(tsconfig.include).toContain('tests')
  })
})
