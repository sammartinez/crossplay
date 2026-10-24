import { describe, expect, it } from 'vitest'
import { sameText, titleCase } from '../../src/lib/text'

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

// PLAN-003 AC3 (amended): the hop's links are used only when its song matches
// the first response's, compared ignoring case, punctuation and extra whitespace.
describe('sameText', () => {
  it('is true for identical text', () => {
    expect(sameText('Dirt', 'Dirt')).toBe(true)
  })

  it('ignores case', () => {
    expect(sameText('DIRT', 'dirt')).toBe(true)
  })

  it('ignores case in non-ASCII letters', () => {
    expect(sameText('Ágætis Byrjun', 'ÁGÆTIS BYRJUN')).toBe(true)
  })

  it('ignores punctuation inside a word', () => {
    expect(sameText("Ain't Gettin' High", 'Aint Gettin High')).toBe(true)
  })

  it('ignores trailing punctuation', () => {
    expect(sameText('Dirt!', 'Dirt')).toBe(true)
  })

  it('ignores surrounding whitespace', () => {
    expect(sameText('  Dirt ', 'Dirt')).toBe(true)
  })

  it('treats repeated whitespace as one space', () => {
    expect(sameText('Placeholder   Artist', 'Placeholder Artist')).toBe(true)
  })

  it('does not drop the space between words', () => {
    expect(sameText('Dirt Road', 'DirtRoad')).toBe(false)
  })

  it('is false when one title has extra words', () => {
    expect(sameText('Dirt (Live)', 'Dirt')).toBe(false)
  })

  it('is false for different artists', () => {
    expect(sameText('Some Other Artist', 'Placeholder Artist')).toBe(false)
  })

  it('is false for empty text against non-empty text', () => {
    expect(sameText('', 'Dirt')).toBe(false)
  })
})
