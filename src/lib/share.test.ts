import { describe, expect, it } from 'vitest'
import { shareText } from './share'

const links = {
  apple: 'https://music.apple.com/us/album/bohemian-rhapsody/1440806041?i=1440806768',
  spotify: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv',
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
})
