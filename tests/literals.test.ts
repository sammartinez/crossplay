import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as constants from '../src/constants'

// AC15: user-facing text lives in src/constants.ts, not in components.
// npm test runs vitest from the repo root.
const COMPONENT_FILES = [
  'src/App.tsx',
  ...readdirSync(resolve(process.cwd(), 'src/components'))
    .filter((f) => f.endsWith('.tsx'))
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
  TAG_LIKELY: 'LIKELY',
  ARTIST_PICKER_LABEL: 'Which artist?',
  COPY_LABEL: 'Copy',
  COPIED_LABEL: 'Copied',
  COPY_MANUAL_LABEL: 'Copy it below',
  SHARE_LABEL: 'Copy share text',
  FALLBACK_TEXTAREA_LABEL: 'Text to copy',
  SPOTIFY_APP_SEARCH_LABEL: 'Search in Spotify app',
}

const CANDIDATE_SEPARATOR = ' · '
const exported = constants as Record<string, unknown>

describe('UI text constants', () => {
  it.each(Object.entries(UI_TEXT))('exports %s', (name, value) => {
    expect(exported[name]).toBe(value)
  })

  it('exports the " · " candidate separator', () => {
    expect(exported.CANDIDATE_SEPARATOR).toBe(CANDIDATE_SEPARATOR)
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

  it.each([...Object.values(UI_TEXT), CANDIDATE_SEPARATOR].filter((v) => v.trim()))('does not inline "%s"', (text) => {
    expect(source(file)).not.toMatch(new RegExp(`['"\`]${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`))
  })
})

// PLAN-004 T2: the result card's tag classes are constants too.
const TAG_CLASSES = { TAG_CLASS: 'tag', TAG_EXACT_CLASS: 'tag exact', TAG_LIKELY_CLASS: 'tag likely' }

describe('tag class constants', () => {
  it.each(Object.entries(TAG_CLASSES))('exports %s', (name, value) => {
    expect(exported[name]).toBe(value)
  })

  it.each(Object.values(TAG_CLASSES))('keeps "%s" out of src/components/ResultCard.tsx', (value) => {
    expect(source('src/components/ResultCard.tsx')).not.toMatch(new RegExp(`['"\`]${value}['"\`]`))
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

// PLAN-005 T2: every class name the components use is a constant. Values are
// written out so the test checks them rather than echoing src/constants.ts.
const CLASS_CONSTANTS = {
  BUSY_CLASS: 'busy',
  MESSAGE_CLASS: 'msg',
  MESSAGE_ERROR_CLASS: 'msg err',
  SUBTITLE_CLASS: 'sub',
  FADER_CLASS: 'fader',
  CARD_CLASS: 'card',
  TRACK_CLASS: 'track',
  TITLE_CLASS: 'title',
  ARTIST_CLASS: 'artist',
  CANDIDATES_CLASS: 'candidates',
  PRIMARY_BUTTON_CLASS: 'primary',
  GHOST_BUTTON_CLASS: 'ghost',
  SHARE_BUTTON_CLASS: 'share',
}

// The body of each `className={…}` expression, braces balanced.
const classNameExpressions = (text: string) => {
  const found: string[] = []
  const opener = 'className={'
  for (let at = text.indexOf(opener); at !== -1; at = text.indexOf(opener, at + 1)) {
    let depth = 1
    let end = at + opener.length
    for (; end < text.length && depth > 0; end++) {
      if (text[end] === '{') depth++
      if (text[end] === '}') depth--
    }
    found.push(text.slice(at + opener.length, end - 1))
  }
  return found
}

describe('class name constants', () => {
  it.each(Object.entries(CLASS_CONSTANTS))('exports %s', (name, value) => {
    expect(exported[name]).toBe(value)
  })
})

describe.each(COMPONENT_FILES)('%s class names', (file) => {
  it('has no string-literal className attribute', () => {
    expect(source(file)).not.toMatch(/className="/)
  })

  it('has no quoted string inside a className expression', () => {
    expect(classNameExpressions(source(file)).filter((expr) => /['"`]/.test(expr))).toEqual([])
  })
})
