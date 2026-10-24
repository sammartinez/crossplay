import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as constants from './constants'

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
}

describe('UI text constants', () => {
  it.each(Object.entries(UI_TEXT))('exports %s', (name, value) => {
    expect((constants as Record<string, unknown>)[name]).toBe(value)
  })
})

describe.each(COMPONENT_FILES)('%s', (file) => {
  it('has no literal JSX text', () => {
    expect(source(file)).not.toMatch(JSX_TEXT)
  })

  it.each(Object.values(UI_TEXT).filter((v) => v.trim()))('does not inline "%s"', (text) => {
    expect(source(file)).not.toMatch(new RegExp(`['"\`]${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`))
  })
})

it('covers the convert form and result card', () => {
  expect(COMPONENT_FILES).toEqual(
    expect.arrayContaining(['src/components/ConvertForm.tsx', 'src/components/ResultCard.tsx']),
  )
})
