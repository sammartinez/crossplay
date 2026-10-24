import { describe, expect, it } from 'vitest'
import { cleanTitle, sameText, sameTitle, titleCase } from '../../src/lib/text'

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

// PLAN-004 AC11: titles are compared after removing trailing suffixes that
// don't change the recording. Version markers that do change it are kept.
const MATCHES_SONG = [
  // Remaster markers
  'Song - Remastered 2011',
  'Song - 2009 Remaster',
  'Song (2011 Remaster)',
  'Song - Remastered',
  'Song [Remastered]',
  // Featuring credits
  'Song (feat. X)',
  'Song (ft. X)',
  'Song (featuring X & Y)',
  'Song (with X)',
  'Song [feat. X]',
  'Song - feat. X',
  // Other suffixes
  'Song - Single Version',
  'Song (Radio Edit)',
  'Song - Radio Edit',
  'Song (Mono)',
  'Song (Stereo)',
  'Song - Mono',
  // Combinations
  'Song (feat. X) - Remastered 2011',
  'Song - Radio Edit (feat. X)',
]

const DOES_NOT_MATCH_SONG = [
  'Song (Live)',
  'Song - Live',
  'Song - Live / Remastered 2011',
  'Song (Acoustic)',
  'Song - Remix',
  'Song (X Remix)',
  'Song (Demo)',
  'Song (Instrumental)',
  'Song (Extended Edit)',
  'Song - Edit',
  "Song (Taylor's Version)",
  'Song (Re-Recorded)',
  'Song - Re-recorded 2015',
]

describe('cleanTitle', () => {
  it.each(MATCHES_SONG)('cleans "%s" to "Song"', (title) => {
    expect(cleanTitle(title)).toBe('Song')
  })

  it.each(DOES_NOT_MATCH_SONG)('does not clean "%s" down to "Song"', (title) => {
    expect(cleanTitle(title)).not.toBe('Song')
  })

  it.each(['Song (Live)', 'Song - Live', 'Song (Acoustic)', 'Song - Remix', "Song (Taylor's Version)"])(
    'keeps the version marker in "%s" as it is',
    (title) => {
      expect(cleanTitle(title)).toBe(title)
    },
  )

  it('ignores case in the suffix', () => {
    expect(cleanTitle('Song - REMASTERED 2011')).toBe('Song')
    expect(cleanTitle('Song (FEAT. X)')).toBe('Song')
    expect(cleanTitle('Song (radio edit)')).toBe('Song')
  })

  it('keeps the case of the rest of the title', () => {
    expect(cleanTitle("Rollin' Down To Memphis - Remastered 2015")).toBe("Rollin' Down To Memphis")
  })

  it('removes suffixes in either order', () => {
    expect(cleanTitle('Song - Remastered 2011 (feat. X)')).toBe('Song')
    expect(cleanTitle('Song (Mono) (feat. X)')).toBe('Song')
  })

  it('trims what is left', () => {
    expect(cleanTitle('  Song - Remastered 2011  ')).toBe('Song')
    expect(cleanTitle('  Song  ')).toBe('Song')
  })

  it('keeps a title with no suffix as it is', () => {
    expect(cleanTitle("Ain't Gettin' High")).toBe("Ain't Gettin' High")
  })

  it('keeps "Remastered" when it is not a trailing suffix', () => {
    expect(cleanTitle('Remastered Love')).toBe('Remastered Love')
  })

  it('keeps "Feat" when it is part of a word at the start of the title', () => {
    expect(cleanTitle('Feat of Strength')).toBe('Feat of Strength')
  })

  it('cleans an album title the same way', () => {
    expect(cleanTitle('A Night At The Opera (2011 Remaster)')).toBe('A Night At The Opera')
  })

  it('cleans a title that is only noise to an empty string', () => {
    expect(cleanTitle('(Remastered)')).toBe('')
  })

  it('returns an empty string for an empty string', () => {
    expect(cleanTitle('')).toBe('')
  })
})

describe('sameTitle', () => {
  it.each(MATCHES_SONG)('matches "%s" with "Song"', (title) => {
    expect(sameTitle(title, 'Song')).toBe(true)
  })

  it.each(MATCHES_SONG)('matches "Song" with "%s"', (title) => {
    expect(sameTitle('Song', title)).toBe(true)
  })

  it.each(DOES_NOT_MATCH_SONG)('does not match "%s" with "Song"', (title) => {
    expect(sameTitle(title, 'Song')).toBe(false)
  })

  it('compares the cleaned titles ignoring case and punctuation', () => {
    expect(sameTitle("Rollin' Down To Memphis - Remastered 2015", 'Rollin Down to Memphis')).toBe(true)
  })

  it('matches "Aint Gettin High" with "Ain\'t Gettin\' High"', () => {
    expect(sameTitle('Aint Gettin High', "Ain't Gettin' High")).toBe(true)
  })

  it('does not match "Ain\'t Gettin\' High (Live)" with "Ain\'t Gettin\' High"', () => {
    expect(sameTitle("Ain't Gettin' High (Live)", "Ain't Gettin' High")).toBe(false)
  })

  it('does not match "Remastered Love" with "Love"', () => {
    expect(sameTitle('Remastered Love', 'Love')).toBe(false)
  })

  it('matches a remastered album title with the plain album title', () => {
    expect(sameTitle('A Night At The Opera (2011 Remaster)', 'A Night At The Opera')).toBe(true)
  })

  it('never matches a title that cleans to an empty string, even with itself', () => {
    expect(sameTitle('(Remastered)', '(Remastered)')).toBe(false)
    expect(sameTitle('(Remastered)', '')).toBe(false)
  })

  it('never matches an empty title, even with another empty title', () => {
    expect(sameTitle('', '')).toBe(false)
    expect(sameTitle('', 'Song')).toBe(false)
    expect(sameTitle('Song', '')).toBe(false)
  })

  it('never matches a blank title made only of spaces', () => {
    expect(sameTitle('   ', '   ')).toBe(false)
  })
})
