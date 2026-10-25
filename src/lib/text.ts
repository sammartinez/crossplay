import {
  PUNCTUATION_RE,
  TITLE_NOISE_RES,
  WHITESPACE_RUN_RE,
  WORD_SEPARATOR,
  WORD_START_RE,
} from '../constants'

export const titleCase = (s?: string): string =>
  (s || '').replace(WORD_START_RE, (c) => c.toUpperCase())

const comparable = (s: string): string =>
  s.toLowerCase().replace(PUNCTUATION_RE, '').replace(WHITESPACE_RUN_RE, WORD_SEPARATOR).trim()

export const sameText = (a: string, b: string): boolean => comparable(a) === comparable(b)

// Repeats until nothing changes, so stacked suffixes come off in any order.
export function cleanTitle(title: string): string {
  let previous: string
  let cleaned = title
  do {
    previous = cleaned
    cleaned = TITLE_NOISE_RES.reduce((t, noise) => t.replace(noise, ''), cleaned)
  } while (cleaned !== previous)
  return cleaned.trim()
}

export function sameTitle(a: string, b: string): boolean {
  const [cleanA, cleanB] = [cleanTitle(a), cleanTitle(b)]
  return !!cleanA && !!cleanB && sameText(cleanA, cleanB)
}
