import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as constants from '../src/constants'

// AC15: user-facing text lives in src/constants.ts, not in components.
// npm test runs vitest from the repo root.
const COMPONENT_FILES = [
  'src/App.tsx',
  ...readdirSync(resolve(process.cwd(), 'src/components'))
    .filter((f) => f.endsWith('.tsx') && !f.includes('.test.'))
    .map((f) => `src/components/${f}`),
]
const source = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8')

// Text between a closing `>` and the next `</`, with no expression in it.
const JSX_TEXT = />[^<>{}]*[A-Za-z][^<>{}]*<\//

const UI_TEXT = {
  INPUT_PLACEHOLDER: 'https://open.spotify.com/track/…',
  CONVERT_LABEL: 'Convert',
  TAG_EXACT: 'EXACT',
  TAG_SEARCH: 'SEARCH',
  WRONG_MATCH_LABEL: 'Wrong Apple match?',
  ALT_SEPARATOR: ' · ',
  COPY_LABEL: 'Copy',
  COPIED_LABEL: 'Copied',
  COPY_MANUAL_LABEL: 'Copy it below',
  SHARE_LABEL: 'Copy share text',
  FALLBACK_TEXTAREA_LABEL: 'Text to copy',
}

describe('UI text constants', () => {
  it.each(Object.entries(UI_TEXT))('exports %s', (name, value) => {
    expect((constants as Record<string, unknown>)[name]).toBe(value)
  })
})

it('exports the 1.4 s copy label reset as COPY_RESET_MS', () => {
  expect(constants.COPY_RESET_MS).toBe(1400)
})

describe.each(COMPONENT_FILES)('%s', (file) => {
  it('has no literal JSX text', () => {
    expect(source(file)).not.toMatch(JSX_TEXT)
  })

  it('does not inline the copy reset delay', () => {
    expect(source(file)).not.toMatch(/\b1400\b/)
  })

  it.each(Object.values(UI_TEXT).filter((v) => v.trim()))('does not inline "%s"', (text) => {
    expect(source(file)).not.toMatch(new RegExp(`['"\`]${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`))
  })
})

it('covers the convert form, result card and copy button', () => {
  expect(COMPONENT_FILES).toEqual(
    expect.arrayContaining([
      'src/components/ConvertForm.tsx',
      'src/components/ResultCard.tsx',
      'src/components/CopyButton.tsx',
    ]),
  )
})

it('keeps the copy reset delay and labels out of src/lib/clipboard.ts', () => {
  const clipboard = source('src/lib/clipboard.ts')
  expect(clipboard).not.toMatch(/\b1400\b/)
  for (const text of ['Copied', 'Copy it below']) {
    expect(clipboard).not.toContain(text)
  }
})
