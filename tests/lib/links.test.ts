import { describe, expect, it } from 'vitest'
import {
  searchQuery,
  searchUrl,
  spotifyAppSearchUri,
  withArtistChoice,
  withSearchFallbacks,
} from '../../src/lib/links'
import type { Lookup } from '../../src/lib/types'
import { APPLE_TRACK, REPORTED, REPORTED_CANDIDATES, REPORTED_THUMB, SPOTIFY_TRACK } from '../support/cases'

describe('searchUrl', () => {
  it('builds a Spotify search URL with the query URI-encoded', () => {
    expect(searchUrl('spotify', 'Bohemian Rhapsody Queen')).toBe(
      'https://open.spotify.com/search/Bohemian%20Rhapsody%20Queen',
    )
  })

  it('builds an Apple Music search URL with the query URI-encoded', () => {
    expect(searchUrl('apple', 'Bohemian Rhapsody Queen')).toBe(
      'https://music.apple.com/us/search?term=Bohemian%20Rhapsody%20Queen',
    )
  })

  it('builds a YouTube Music search URL with the query URI-encoded', () => {
    expect(searchUrl('ytm', 'Bohemian Rhapsody Queen')).toBe(
      'https://music.youtube.com/search?q=Bohemian%20Rhapsody%20Queen',
    )
  })

  it('encodes reserved characters in the query', () => {
    expect(searchUrl('ytm', 'Highway to Hell AC/DC & co?')).toBe(
      'https://music.youtube.com/search?q=Highway%20to%20Hell%20AC%2FDC%20%26%20co%3F',
    )
  })
})

describe('searchQuery', () => {
  it('joins the title and the artist with a space', () => {
    expect(searchQuery({ title: 'Bohemian Rhapsody', artist: 'Queen' })).toBe('Bohemian Rhapsody Queen')
  })

  it('returns the title alone when the artist is empty', () => {
    expect(searchQuery({ title: 'Bohemian Rhapsody', artist: '' })).toBe('Bohemian Rhapsody')
  })

  it('returns the title alone when the artist is missing', () => {
    expect(searchQuery({ title: 'Bohemian Rhapsody' })).toBe('Bohemian Rhapsody')
  })

  it('returns an empty string when there is neither title nor artist', () => {
    expect(searchQuery({})).toBe('')
  })
})

describe('spotifyAppSearchUri', () => {
  it('builds a spotify:search: URI with spaces encoded', () => {
    expect(spotifyAppSearchUri('Bohemian Rhapsody Queen')).toBe('spotify:search:Bohemian%20Rhapsody%20Queen')
  })

  it('encodes "/", "&" and "?" in the query', () => {
    expect(spotifyAppSearchUri('Highway to Hell AC/DC & co?')).toBe(
      'spotify:search:Highway%20to%20Hell%20AC%2FDC%20%26%20co%3F',
    )
  })

  it('leaves apostrophes as encodeURIComponent leaves them', () => {
    expect(spotifyAppSearchUri("Ain't Gettin' High")).toBe("spotify:search:Ain't%20Gettin'%20High")
  })

  it('returns the bare scheme prefix for an empty query', () => {
    expect(spotifyAppSearchUri('')).toBe('spotify:search:')
  })
})

describe('withSearchFallbacks', () => {
  const exactLinks = {
    apple: APPLE_TRACK.link,
    spotify: SPOTIFY_TRACK.link,
    ytm: 'https://music.youtube.com/watch?v=fJ9rUzIMcZQ',
  }

  it('keeps every given link and marks all of them exact', () => {
    const result = withSearchFallbacks({ title: 'Bohemian Rhapsody', artist: 'Queen', links: exactLinks })
    expect(result.links).toEqual(exactLinks)
    expect(result.exact).toEqual({ apple: true, spotify: true, ytm: true })
  })

  it('fills missing links with a search for "title artist" and marks them not exact', () => {
    const result = withSearchFallbacks({
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      links: { spotify: exactLinks.spotify },
    })
    expect(result.links).toEqual({
      spotify: exactLinks.spotify,
      apple: 'https://music.apple.com/us/search?term=Bohemian%20Rhapsody%20Queen',
      ytm: 'https://music.youtube.com/search?q=Bohemian%20Rhapsody%20Queen',
    })
    expect(result.exact).toEqual({ apple: false, spotify: true, ytm: false })
  })

  it('searches for the title alone when the artist is empty', () => {
    const result = withSearchFallbacks({
      title: 'Bohemian Rhapsody',
      artist: '',
      links: { apple: exactLinks.apple },
    })
    expect(result.links.spotify).toBe('https://open.spotify.com/search/Bohemian%20Rhapsody')
    expect(result.links.ytm).toBe('https://music.youtube.com/search?q=Bohemian%20Rhapsody')
  })

  it('searches for the title alone when the artist is missing', () => {
    const result = withSearchFallbacks({ title: 'Bohemian Rhapsody', links: {} })
    expect(result.links.apple).toBe('https://music.apple.com/us/search?term=Bohemian%20Rhapsody')
  })

  it('keeps the title, artist, artwork and artist candidates', () => {
    const candidates = [{ artist: 'Queen', title: 'Bohemian Rhapsody', url: exactLinks.apple }]
    const result = withSearchFallbacks({
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      art: 'https://i.scdn.co/image/ab67616d0000b273ce4f1737bc8a646c8c4bd25a',
      links: { spotify: exactLinks.spotify },
      candidates,
    })
    expect(result.title).toBe('Bohemian Rhapsody')
    expect(result.artist).toBe('Queen')
    expect(result.art).toBe('https://i.scdn.co/image/ab67616d0000b273ce4f1737bc8a646c8c4bd25a')
    expect(result.candidates).toEqual(candidates)
  })

  it('sets a Spotify app search URI for "title artist" when Spotify is a search', () => {
    const result = withSearchFallbacks({
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      links: { apple: exactLinks.apple },
    })
    expect(result.exact.spotify).toBe(false)
    expect(result.links.spotify).toBe('https://open.spotify.com/search/Bohemian%20Rhapsody%20Queen')
    expect(result.spotifyAppSearch).toBe('spotify:search:Bohemian%20Rhapsody%20Queen')
  })

  it('uses the same query for the Spotify app URI as for the web search', () => {
    const result = withSearchFallbacks({ title: 'Highway to Hell', artist: 'AC/DC', links: {} })
    const webQuery = result.links.spotify.replace('https://open.spotify.com/search/', '')
    expect(result.spotifyAppSearch).toBe(`spotify:search:${webQuery}`)
  })

  it('sets the Spotify app search URI for the title alone when the artist is empty', () => {
    const result = withSearchFallbacks({ title: 'Bohemian Rhapsody', artist: '', links: {} })
    expect(result.spotifyAppSearch).toBe('spotify:search:Bohemian%20Rhapsody')
  })

  it('leaves the Spotify app search URI undefined when Spotify is exact', () => {
    const result = withSearchFallbacks({
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      links: { spotify: exactLinks.spotify },
    })
    expect(result.spotifyAppSearch).toBeUndefined()
  })

  it('clears a stale Spotify app search URI when Spotify is now exact', () => {
    const search = withSearchFallbacks({ title: 'Bohemian Rhapsody', artist: 'Queen', links: {} })
    expect(search.spotifyAppSearch).toBeDefined()
    const result = withSearchFallbacks({ ...search, links: { spotify: exactLinks.spotify } })
    expect(result.spotifyAppSearch).toBeUndefined()
  })

  it('never tags a search link exact', () => {
    const result = withSearchFallbacks({ title: 'Bohemian Rhapsody', artist: 'Queen', links: {} })
    for (const key of ['apple', 'spotify', 'ytm'] as const) {
      expect(result.links[key]).toMatch(/search/)
      expect(result.exact[key]).toBe(false)
    }
  })

  // PLAN-004 AC5/AC8: each platform is EXACT, LIKELY or SEARCH, never two.
  describe('likely', () => {
    const autoPicked = (): Lookup => ({
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      links: { spotify: exactLinks.spotify, apple: exactLinks.apple },
      likely: { apple: true },
    })

    it('marks every platform not likely when the lookup has no likely record', () => {
      const result = withSearchFallbacks({ title: 'Bohemian Rhapsody', artist: 'Queen', links: exactLinks })
      expect(result.likely).toEqual({ apple: false, spotify: false, ytm: false })
    })

    it('marks every platform not likely for a lookup with no links', () => {
      const result = withSearchFallbacks({ title: 'Bohemian Rhapsody', links: {} })
      expect(result.likely).toEqual({ apple: false, spotify: false, ytm: false })
    })

    it('keeps a given link marked likely as the link, likely and not exact', () => {
      const result = withSearchFallbacks(autoPicked())
      expect(result.links.apple).toBe(exactLinks.apple)
      expect(result.likely.apple).toBe(true)
      expect(result.exact.apple).toBe(false)
    })

    it('keeps a given link that is not marked likely exact', () => {
      const result = withSearchFallbacks(autoPicked())
      expect(result.exact.spotify).toBe(true)
      expect(result.likely.spotify).toBe(false)
    })

    it('gives exact and likely records with every platform key', () => {
      const result = withSearchFallbacks(autoPicked())
      expect(result.exact).toEqual({ apple: false, spotify: true, ytm: false })
      expect(result.likely).toEqual({ apple: true, spotify: false, ytm: false })
    })

    it('never marks a search link likely, even when the lookup says so', () => {
      const result = withSearchFallbacks({
        title: 'Bohemian Rhapsody',
        artist: 'Queen',
        links: { spotify: exactLinks.spotify },
        likely: { apple: true, ytm: true },
      })
      expect(result.links.apple).toBe('https://music.apple.com/us/search?term=Bohemian%20Rhapsody%20Queen')
      expect(result.likely).toEqual({ apple: false, spotify: false, ytm: false })
      expect(result.exact).toEqual({ apple: false, spotify: true, ytm: false })
    })

    it('never marks a platform both exact and likely', () => {
      const result = withSearchFallbacks({ ...autoPicked(), links: exactLinks, likely: { apple: true, ytm: true } })
      for (const key of ['apple', 'spotify', 'ytm'] as const) {
        expect(result.exact[key] && result.likely[key]).toBe(false)
      }
    })

    it('searches YouTube Music for "title artist" with the auto-picked artist', () => {
      const result = withSearchFallbacks(autoPicked())
      expect(result.links.ytm).toBe('https://music.youtube.com/search?q=Bohemian%20Rhapsody%20Queen')
      expect(result.exact.ytm).toBe(false)
      expect(result.likely.ytm).toBe(false)
    })
  })

  it('does not mutate the lookup it is given', () => {
    const lookup: Lookup = { title: 'Bohemian Rhapsody', artist: 'Queen', links: { spotify: exactLinks.spotify } }
    const before = structuredClone(lookup)
    const result = withSearchFallbacks(lookup)
    expect(lookup).toEqual(before)
    expect(lookup).not.toHaveProperty('exact')
    expect(result).not.toBe(lookup)
    expect(result.links).not.toBe(lookup.links)
  })
})

describe('withArtistChoice', () => {
  // The reported Spotify result: no artist, Spotify exact, Apple and
  // YouTube Music searches for the title alone.
  const SPOTIFY_LINK = REPORTED.link
  const ART = REPORTED_THUMB
  const CANDIDATES = REPORTED_CANDIDATES
  const [MATSON, NEON] = CANDIDATES
  const reported = () =>
    withSearchFallbacks({
      title: "Ain't Gettin' High",
      artist: '',
      art: ART,
      links: { spotify: SPOTIFY_LINK },
      candidates: CANDIDATES,
    })

  it("sets the artist to the candidate's artist", () => {
    expect(withArtistChoice(reported(), NEON).artist).toBe('The Neon Prairie Dogs')
  })

  it("makes the candidate's URL the Apple link and marks it exact", () => {
    const result = withArtistChoice(reported(), NEON)
    expect(result.links.apple).toBe(NEON.url)
    expect(result.exact.apple).toBe(true)
  })

  it('keeps the exact Spotify link', () => {
    const result = withArtistChoice(reported(), NEON)
    expect(result.links.spotify).toBe(SPOTIFY_LINK)
    expect(result.exact.spotify).toBe(true)
  })

  it('rebuilds the YouTube Music search for "title artist" and keeps it not exact', () => {
    const result = withArtistChoice(reported(), NEON)
    expect(result.links.ytm).toBe(
      "https://music.youtube.com/search?q=Ain't%20Gettin'%20High%20The%20Neon%20Prairie%20Dogs",
    )
    expect(result.exact.ytm).toBe(false)
  })

  it('leaves the Spotify app search URI undefined because Spotify stays exact', () => {
    const result = withArtistChoice(reported(), NEON)
    expect(result.spotifyAppSearch).toBeUndefined()
  })

  describe('when Spotify is a search', () => {
    // An Apple-source result with no Spotify link and a blank artist.
    const spotifySearch = () =>
      withSearchFallbacks({
        title: "Ain't Gettin' High",
        artist: '',
        links: { ytm: 'https://music.youtube.com/watch?v=abc' },
        candidates: CANDIDATES,
      })

    it('rebuilds the Spotify app search URI with the chosen artist', () => {
      const before = spotifySearch()
      expect(before.spotifyAppSearch).toBe("spotify:search:Ain't%20Gettin'%20High")
      const result = withArtistChoice(before, NEON)
      expect(result.spotifyAppSearch).toBe(
        "spotify:search:Ain't%20Gettin'%20High%20The%20Neon%20Prairie%20Dogs",
      )
    })

    it('rebuilds the Spotify web search with the chosen artist and keeps it not exact', () => {
      const result = withArtistChoice(spotifySearch(), NEON)
      expect(result.links.spotify).toBe(
        "https://open.spotify.com/search/Ain't%20Gettin'%20High%20The%20Neon%20Prairie%20Dogs",
      )
      expect(result.exact.spotify).toBe(false)
    })

    it('switches the Spotify app search URI when a second candidate is chosen', () => {
      const result = withArtistChoice(withArtistChoice(spotifySearch(), NEON), MATSON)
      expect(result.spotifyAppSearch).toBe(
        "spotify:search:Ain't%20Gettin'%20High%20Samuel%20Cody%20Matson",
      )
    })
  })

  it('keeps other exact links as they are', () => {
    const conversion = withSearchFallbacks({
      title: 'Song',
      artist: '',
      links: { spotify: SPOTIFY_LINK, ytm: 'https://music.youtube.com/watch?v=abc' },
      candidates: CANDIDATES,
    })
    const result = withArtistChoice(conversion, NEON)
    expect(result.links.ytm).toBe('https://music.youtube.com/watch?v=abc')
    expect(result.exact).toEqual({ apple: true, spotify: true, ytm: true })
  })

  it('keeps the title, artwork and candidates in the same order', () => {
    const result = withArtistChoice(reported(), NEON)
    expect(result.title).toBe("Ain't Gettin' High")
    expect(result.art).toBe(ART)
    expect(result.candidates).toEqual(CANDIDATES)
  })

  it('switches every chosen value when a second candidate is chosen', () => {
    const result = withArtistChoice(withArtistChoice(reported(), NEON), MATSON)
    expect(result.artist).toBe('Samuel Cody Matson')
    expect(result.links.apple).toBe(MATSON.url)
    expect(result.exact.apple).toBe(true)
    expect(result.links.ytm).toBe(
      "https://music.youtube.com/search?q=Ain't%20Gettin'%20High%20Samuel%20Cody%20Matson",
    )
    expect(result.candidates).toEqual(CANDIDATES)
  })

  it('returns a new conversion and does not mutate the one it is given', () => {
    const conversion = reported()
    const before = structuredClone(conversion)
    const result = withArtistChoice(conversion, NEON)
    expect(conversion).toEqual(before)
    expect(result).not.toBe(conversion)
  })

  // PLAN-004 AC7: a click overrides the auto-pick, and the result is EXACT.
  describe('after an auto-pick', () => {
    // NEON was auto-picked: its URL is the Apple link, tagged LIKELY.
    const autoPicked = () =>
      withSearchFallbacks({
        title: "Ain't Gettin' High",
        artist: NEON.artist,
        art: ART,
        links: { spotify: SPOTIFY_LINK, apple: NEON.url },
        candidates: CANDIDATES,
        likely: { apple: true },
      })

    it('starts with the Apple link likely and not exact', () => {
      const before = autoPicked()
      expect(before.likely.apple).toBe(true)
      expect(before.exact.apple).toBe(false)
    })

    it('marks the Apple link exact and not likely when the auto-picked candidate is clicked', () => {
      const result = withArtistChoice(autoPicked(), NEON)
      expect(result.artist).toBe(NEON.artist)
      expect(result.links.apple).toBe(NEON.url)
      expect(result.exact.apple).toBe(true)
      expect(result.likely).toEqual({ apple: false, spotify: false, ytm: false })
    })

    it('switches to another candidate, exact and not likely', () => {
      const result = withArtistChoice(autoPicked(), MATSON)
      expect(result.artist).toBe(MATSON.artist)
      expect(result.links.apple).toBe(MATSON.url)
      expect(result.exact.apple).toBe(true)
      expect(result.likely).toEqual({ apple: false, spotify: false, ytm: false })
    })

    it('rebuilds the YouTube Music search with the newly chosen artist', () => {
      const result = withArtistChoice(autoPicked(), MATSON)
      expect(result.links.ytm).toBe(
        "https://music.youtube.com/search?q=Ain't%20Gettin'%20High%20Samuel%20Cody%20Matson",
      )
      expect(result.exact.ytm).toBe(false)
    })

    it('keeps the exact Spotify link', () => {
      const result = withArtistChoice(autoPicked(), MATSON)
      expect(result.links.spotify).toBe(SPOTIFY_LINK)
      expect(result.exact.spotify).toBe(true)
    })

    it('leaves nothing likely after a second choice', () => {
      const result = withArtistChoice(withArtistChoice(autoPicked(), MATSON), NEON)
      expect(result.likely).toEqual({ apple: false, spotify: false, ytm: false })
      expect(result.exact.apple).toBe(true)
    })
  })

  it('marks nothing likely after a choice from a result with no auto-pick', () => {
    expect(withArtistChoice(reported(), NEON).likely).toEqual({ apple: false, spotify: false, ytm: false })
  })
})
