import { describe, expect, it } from 'vitest'
import { withSearchFallbacks } from '../../src/lib/links'
import { fromSpotifyOembed } from '../../src/lib/lookup'
import { shareText } from '../../src/lib/share'
import { SPOTIFY_TRACK, UNIQUE } from '../support/cases'
import { fixture } from '../support/fixtures'

const links = {
  apple: 'https://music.apple.com/us/album/bohemian-rhapsody/1440806041?i=1440806768',
  spotify: SPOTIFY_TRACK.link,
  ytm: 'https://music.youtube.com/watch?v=fJ9rUzIMcZQ',
}

describe('shareText', () => {
  it('starts with "title — artist" and lists Apple Music, Spotify and YouTube Music links', () => {
    expect(shareText({ title: 'Bohemian Rhapsody', artist: 'Queen', links })).toBe(
      'Bohemian Rhapsody — Queen\n\n' +
        'Apple Music: https://music.apple.com/us/album/bohemian-rhapsody/1440806041?i=1440806768\n' +
        'Spotify: https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv\n' +
        'YouTube Music: https://music.youtube.com/watch?v=fJ9rUzIMcZQ',
    )
  })

  it('uses the title alone as the first line when the artist is empty', () => {
    expect(shareText({ title: 'Bohemian Rhapsody', artist: '', links }).split('\n')[0]).toBe(
      'Bohemian Rhapsody',
    )
  })

  it('uses the title alone as the first line when the artist is missing', () => {
    expect(shareText({ title: 'Bohemian Rhapsody', links })).toBe(
      'Bohemian Rhapsody\n\n' +
        `Apple Music: ${links.apple}\nSpotify: ${links.spotify}\nYouTube Music: ${links.ytm}`,
    )
  })

  it('includes search links the same way as exact links', () => {
    const text = shareText({
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      links: { ...links, ytm: 'https://music.youtube.com/search?q=Bohemian%20Rhapsody%20Queen' },
    })
    expect(text.endsWith('YouTube Music: https://music.youtube.com/search?q=Bohemian%20Rhapsody%20Queen')).toBe(true)
  })

  it('never contains a spotify: URI when Spotify is a search', () => {
    const conversion = withSearchFallbacks({
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      links: { apple: links.apple, ytm: links.ytm },
    })
    const text = shareText(conversion)
    expect(text).toContain('Spotify: https://open.spotify.com/search/Bohemian%20Rhapsody%20Queen')
    expect(text).not.toContain('spotify:')
  })

  // PLAN-004 AC5: an auto-picked result shares its artist and LIKELY Apple URL,
  // with no tags in the text.
  describe('for an auto-picked result', () => {
    const autoPicked = () =>
      withSearchFallbacks(
        fromSpotifyOembed(
          fixture('spotify-oembed-unique-match.json'),
          fixture('itunes-search-unique-match.json'),
          UNIQUE,
        ),
      )

    it('starts with "<title> — <artist>" and lists the likely Apple URL', () => {
      expect(shareText(autoPicked())).toBe(
        "Rollin' Down To Memphis - Remastered 2015 — Marlow Vance\n\n" +
          'Apple Music: https://music.apple.com/us/album/rollin-down-to-memphis/1587654321?i=1587654329\n' +
          `Spotify: ${UNIQUE.link}\n` +
          "YouTube Music: https://music.youtube.com/search?q=Rollin'%20Down%20To%20Memphis%20-%20Remastered%202015%20Marlow%20Vance",
      )
    })

    it('carries no LIKELY tag', () => {
      expect(shareText(autoPicked())).not.toContain('LIKELY')
    })
  })
})
