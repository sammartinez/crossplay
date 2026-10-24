import { WORD_START_RE } from '../constants'

export const titleCase = (s?: string): string =>
  (s || '').replace(WORD_START_RE, (c) => c.toUpperCase())
