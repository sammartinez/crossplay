import { describe, expect, it } from 'vitest'
import { titleCase } from './text'

describe('titleCase', () => {
  it('capitalizes the first letter of each word', () => {
    expect(titleCase('a night at the opera')).toBe('A Night At The Opera')
  })

  it('leaves letters that are already capitalized alone', () => {
    expect(titleCase('AC dc live')).toBe('AC Dc Live')
  })

  it('returns an empty string for an empty string', () => {
    expect(titleCase('')).toBe('')
  })

  it('returns an empty string when given nothing', () => {
    expect(titleCase()).toBe('')
    expect(titleCase(undefined)).toBe('')
  })
})
