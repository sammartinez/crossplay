import { spotifyOembedUrl } from '../../src/lib/lookup'
import type { ArtistCandidate, ParsedLink } from '../../src/lib/types'
import { fixture } from './fixtures'
import { type FetchAnswer, type JsonpOutcome, answerJson, mockFetchOnly, mockJsonp } from './network'

// Test data shared by more than one level of tests. The values are literals
// on purpose, so the tests check them rather than echo src/constants.ts.

// The links the tests paste, and what they parse to.
export const SPOTIFY_TRACK_RAW = 'https://open.spotify.com/intl-de/track/4u7EnebtmKWzUH433cf5Qv?si=abc'
export const SPOTIFY_TRACK: ParsedLink = {
  src: 'spotify',
  kind: 'track',
  id: '4u7EnebtmKWzUH433cf5Qv',
  link: 'https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv',
}
export const SPOTIFY_ALBUM: ParsedLink = {
  src: 'spotify',
  kind: 'album',
  id: '1GbtB4zTqAsyfZEsm1RZfx',
  link: 'https://open.spotify.com/album/1GbtB4zTqAsyfZEsm1RZfx',
}
export const SPOTIFY_SHORT: ParsedLink = { src: 'spotify', link: 'https://spotify.link/aBcD1234' }
export const APPLE_TRACK: ParsedLink = {
  src: 'apple',
  kind: 'track',
  id: '1440806768',
  slug: 'bohemian rhapsody',
  link: 'https://music.apple.com/us/album/bohemian-rhapsody/1440806041?i=1440806768',
}
export const APPLE_ALBUM: ParsedLink = {
  src: 'apple',
  kind: 'album',
  id: '1440806041',
  slug: 'a night at the opera 2011 remaster',
  link: 'https://music.apple.com/us/album/a-night-at-the-opera-2011-remaster/1440806041',
}

// The reported case (PLAN-002 AC5–AC7): oEmbed has no artist, and the iTunes
// title search returns several artists. From spotify-oembed-aint-gettin-high.json
// and itunes-search-aint-gettin-high.json.
export const REPORTED: ParsedLink = {
  src: 'spotify',
  kind: 'track',
  id: '1yQDTSOyfVTCt9XWKQcnXb',
  link: 'https://open.spotify.com/track/1yQDTSOyfVTCt9XWKQcnXb',
}
export const REPORTED_TITLE = "Ain't Gettin' High"
export const REPORTED_THUMB =
  'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02a1b2c3d4e5f60718293a4b5c'
// One per artist, in iTunes order.
export const REPORTED_CANDIDATES: ArtistCandidate[] = [
  {
    artist: 'Samuel Cody Matson',
    title: "Ain't Gettin' High",
    url: 'https://music.apple.com/us/album/aint-gettin-high/1712345678?i=1712345680',
  },
  {
    artist: 'The Neon Prairie Dogs',
    title: "Ain't Gettin' High",
    url: 'https://music.apple.com/us/album/aint-gettin-high/1601234567?i=1601234571',
  },
  {
    artist: 'Zach Bryan',
    title: 'Younger Years',
    url: 'https://music.apple.com/us/album/younger-years/1640014741?i=1640014759',
  },
]

// PLAN-004 AC5: a Spotify track with exactly one same-title iTunes artist,
// Marlow Vance. From spotify-oembed-unique-match.json and
// itunes-search-unique-match.json.
export const UNIQUE: ParsedLink = {
  src: 'spotify',
  kind: 'track',
  id: '3kVr8XqPz2LmNw7TyB5hJd',
  link: 'https://open.spotify.com/track/3kVr8XqPz2LmNw7TyB5hJd',
}
export const UNIQUE_TITLE = "Rollin' Down To Memphis - Remastered 2015"
export const UNIQUE_CANDIDATES: ArtistCandidate[] = [
  {
    artist: 'Marlow Vance',
    title: 'Rollin Down to Memphis',
    url: 'https://music.apple.com/us/album/rollin-down-to-memphis/1587654321?i=1587654329',
  },
  {
    artist: 'The Dust Bowl Choir',
    title: "Rollin' Down To Memphis (Live)",
    url: 'https://music.apple.com/us/album/rollin-down-to-memphis-live/1623456780?i=1623456791',
  },
  {
    artist: 'Harper Lane',
    title: 'Midnight Ferry',
    url: 'https://music.apple.com/us/album/midnight-ferry/1645678900?i=1645678912',
  },
]

// A conversion's likely record when no platform is likely.
export const NOTHING_LIKELY = { apple: false, spotify: false, ytm: false }

// The status line's messages.
export const INVALID_LINK_MESSAGE = 'That link isn’t a Spotify or Apple Music track or album.'
export const LOOKING_UP_MESSAGE = 'Looking it up…'
export const SHORT_LINK_MESSAGE =
  'Couldn’t open that short link. In Spotify, tap Share → Copy link, then paste the full open.spotify.com link.'
export const NOT_FOUND_MESSAGE = 'Couldn’t find that one. Check the link and try again.'

// The AC7 share text, written out so tests state the format themselves.
export const expectedShareText = (
  head: string,
  links: { apple: string; spotify: string; ytm: string },
): string =>
  [
    head,
    '',
    `Apple Music: ${links.apple}`,
    `Spotify: ${links.spotify}`,
    `YouTube Music: ${links.ytm}`,
  ].join('\n')

// Network setups for each case. Each answers only its own requests; any other
// fetch fails the test (see mockFetchOnly).

// An Apple link: no fetch at all, and the iTunes lookup answers as `itunes` says.
export function mockAppleCase(itunes: JsonpOutcome = { data: fixture('itunes-lookup-song.json') }) {
  const fetchMock = mockFetchOnly({})
  const loads = mockJsonp(() => itunes)
  return { fetchMock, loads }
}

// iTunes search answering a JSONP load by its entity: the albums fixture for an
// album search, the songs fixture otherwise.
export const answerItunesSearchByEntity = (src: string): JsonpOutcome => ({
  data: fixture(src.includes('entity=album') ? 'itunes-search-albums.json' : 'itunes-search-songs.json'),
})

// A Spotify link: oEmbed answers `link` as `oembed` says, and iTunes search
// answers as `itunes` says (by default, by entity).
export function mockSpotifyCase(
  link: string = SPOTIFY_TRACK.link,
  oembed: FetchAnswer = answerJson(fixture('spotify-oembed-track.json')),
  itunes: JsonpOutcome | ((src: string) => JsonpOutcome) = answerItunesSearchByEntity,
) {
  const fetchMock = mockFetchOnly({ [spotifyOembedUrl(link)]: oembed })
  const loads = mockJsonp(typeof itunes === 'function' ? itunes : () => itunes)
  return { fetchMock, loads }
}

// The reported link: oEmbed answers with the reported response, and iTunes
// search answers as `itunes` says.
export function mockReportedCase(
  itunes: JsonpOutcome = { data: fixture('itunes-search-aint-gettin-high.json') },
) {
  const fetchMock = mockFetchOnly({
    [spotifyOembedUrl(REPORTED.link)]: answerJson(fixture('spotify-oembed-aint-gettin-high.json')),
  })
  const loads = mockJsonp(() => itunes)
  return { fetchMock, loads }
}

// The unique-match link: oEmbed and iTunes search answer with the
// unique-match fixtures.
export function mockUniqueCase() {
  const fetchMock = mockFetchOnly({
    [spotifyOembedUrl(UNIQUE.link)]: answerJson(fixture('spotify-oembed-unique-match.json')),
  })
  const loads = mockJsonp(() => ({ data: fixture('itunes-search-unique-match.json') }))
  return { fetchMock, loads }
}
