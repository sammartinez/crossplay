import { PUNCTUATION_RE, WHITESPACE_RUN_RE, WORD_SEPARATOR, WORD_START_RE } from '../constants'

export const titleCase = (s?: string): string =>
  (s || '').replace(WORD_START_RE, (c) => c.toUpperCase())

const comparable = (s: string): string =>
  s.toLowerCase().replace(PUNCTUATION_RE, '').replace(WHITESPACE_RUN_RE, WORD_SEPARATOR).trim()

export const sameText = (a: string, b: string): boolean => comparable(a) === comparable(b)
