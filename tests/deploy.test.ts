import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// AC3: the app builds under /crossplay/ and a GitHub Actions workflow gates
// and deploys it to Pages; the README documents that deploy and the dev
// commands. The workflow is checked as text: a YAML parser dependency isn't
// justified for this. The built dist/ asset URLs are checked by the gates,
// not here. npm test runs vitest from the repo root.
const root = process.cwd()
const WORKFLOW_PATH = '.github/workflows/deploy.yml'
const read = (file: string) =>
  existsSync(resolve(root, file)) ? readFileSync(resolve(root, file), 'utf8') : ''

const workflow = read(WORKFLOW_PATH)
const readme = read('README.md')

// Each list item (`- ...`) starts a new chunk, so a step's `uses:` and its
// `with:` keys land in the same chunk.
const steps = workflow.split(/\n(?=\s*- )/)
const stepUsing = (action: string) => steps.find((s) => new RegExp(`uses:\\s*${action}@`).test(s))
const firstIndex = (pattern: RegExp) => workflow.search(pattern)

const NPM_CI = /run:\s*npm ci\b/
const NPM_TEST = /run:\s*npm (run )?test\b/
const NPM_LINT = /run:\s*npm run lint\b/
const NPM_TYPECHECK = /run:\s*npm run typecheck\b/
const NPM_BUILD = /run:\s*npm run build\b/
const UPLOAD = /uses:\s*actions\/upload-pages-artifact@/

// The text of a `## Heading` section, up to the next heading of that level.
const section = (heading: RegExp) => {
  const lines = readme.split('\n')
  const start = lines.findIndex((l) => /^##\s/.test(l) && heading.test(l))
  if (start < 0) return ''
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((l) => /^##\s/.test(l))
  return rest.slice(0, end < 0 ? undefined : end).join('\n')
}

describe('vite base path', () => {
  it('serves the app under /crossplay/', () => {
    expect(read('vite.config.ts')).toMatch(/base:\s*['"]\/crossplay\/['"]/)
  })
})

describe('Pages deploy workflow', () => {
  it('exists at .github/workflows/deploy.yml', () => {
    expect(existsSync(resolve(root, WORKFLOW_PATH))).toBe(true)
  })

  it('runs on every push to main', () => {
    expect(workflow).toMatch(
      /push:\s*\n\s*branches:\s*(\[\s*['"]?main['"]?\s*\]|\n\s*-\s*['"]?main['"]?\s*$)/m,
    )
  })

  it('can be run by hand with workflow_dispatch', () => {
    expect(workflow).toMatch(/^\s*workflow_dispatch:/m)
  })

  it('grants pages: write', () => {
    expect(workflow).toMatch(/^\s*pages:\s*write\s*$/m)
  })

  it('grants id-token: write', () => {
    expect(workflow).toMatch(/^\s*id-token:\s*write\s*$/m)
  })

  it('grants contents: read', () => {
    expect(workflow).toMatch(/^\s*contents:\s*read\s*$/m)
  })

  it('runs in the pages concurrency group', () => {
    expect(workflow).toMatch(/concurrency:\s*\n\s*group:\s*['"]?pages['"]?\s*$/m)
  })

  it('sets up Node 22 or the version file with the npm cache', () => {
    const setupNode = stepUsing('actions/setup-node')
    expect(setupNode).toBeDefined()
    expect(setupNode).toMatch(/node-version-file:|node-version:\s*['"]?22\b/)
    expect(setupNode).toMatch(/cache:\s*['"]?npm['"]?\s*$/m)
  })

  it('installs dependencies with npm ci', () => {
    expect(workflow).toMatch(NPM_CI)
  })

  it.each([
    ['test', NPM_TEST],
    ['lint', NPM_LINT],
    ['typecheck', NPM_TYPECHECK],
    ['build', NPM_BUILD],
  ])('runs %s after npm ci', (_name, step) => {
    expect(workflow).toMatch(step)
    expect(firstIndex(step)).toBeGreaterThan(firstIndex(NPM_CI))
  })

  it.each([
    ['test', NPM_TEST],
    ['lint', NPM_LINT],
    ['typecheck', NPM_TYPECHECK],
  ])('runs %s before the build', (_name, step) => {
    expect(firstIndex(NPM_BUILD)).toBeGreaterThan(firstIndex(step))
  })

  it('uploads dist as the Pages artifact after the build', () => {
    const upload = stepUsing('actions/upload-pages-artifact')
    expect(upload).toBeDefined()
    expect(upload).toMatch(/path:\s*['"]?(\.\/)?dist\/?['"]?\s*$/m)
    expect(firstIndex(UPLOAD)).toBeGreaterThan(firstIndex(NPM_BUILD))
  })

  it('deploys with actions/deploy-pages', () => {
    expect(stepUsing('actions/deploy-pages')).toBeDefined()
  })
})

describe('README', () => {
  const deploy = section(/Deploy/i)

  it('tells you to set the Pages source to GitHub Actions', () => {
    expect(deploy).toMatch(/Source[^\n]*GitHub Actions/)
  })

  it('no longer tells you to deploy from a branch or upload files to the root', () => {
    expect(readme).not.toMatch(/Deploy from a branch/i)
    expect(readme).not.toMatch(/Upload everything/i)
  })

  it('keeps the live site URL under /crossplay/', () => {
    expect(readme).toMatch(/https:\/\/<your-username>\.github\.io\/crossplay\//)
  })

  it.each(['npm install', 'npm run dev', 'npm test', 'npm run lint', 'npm run typecheck'])(
    'lists %s in the Development section',
    (command) => {
      expect(section(/Development/i)).toContain(command)
    },
  )

  // PLAN-004 AC10: How it works describes the oEmbed/iTunes lookup, the tags
  // and the artist picker, and no longer mentions Odesli.
  describe('How it works', () => {
    const howItWorks = () => section(/How it works/i)

    it.each([
      ['Spotify oEmbed', /oEmbed/],
      ['the iTunes Search API', /iTunes/],
      ['the SEARCH tag', /\bSEARCH\b/],
      ['the LIKELY tag', /\bLIKELY\b/],
      ['the EXACT tag', /\bEXACT\b/],
      ['the artist picker', /pick/i],
    ])('describes %s', (_name, pattern) => {
      expect(howItWorks()).toMatch(pattern)
    })

    it('does not mention Odesli or song.link', () => {
      expect(howItWorks()).not.toMatch(/odesli|song\.link/i)
    })
  })

  it('does not mention Odesli or song.link anywhere', () => {
    expect(readme).not.toMatch(/odesli|song\.link/i)
  })

  it.each([
    ['iPhone Home Screen', /iPhone/],
    ['Share Sheet shortcut', /Shortcut/i],
    ['How it works', /How it works/i],
  ])('keeps the %s section', (_name, heading) => {
    expect(section(heading)).not.toBe('')
  })
})
