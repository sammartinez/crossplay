export const APP_NAME = 'Crossplay'
export const APP_SUBTITLE = 'Paste a Spotify or Apple Music link. Get it everywhere.'
export const APP_ROOT_ID = 'app'

export const THEME_LIGHT = 'light'
export const THEME_DARK = 'dark'
export const THEME_STORAGE_KEY = 'cp-theme'
export const THEME_ATTRIBUTE = 'data-theme'
export const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'
export const THEME_TOGGLE_LABEL = 'Theme'

export const PLATFORM_APPLE = 'apple'
export const PLATFORM_SPOTIFY = 'spotify'
export const PLATFORM_YTM = 'ytm'
// Display order for result links and share text.
export const PLATFORMS = [
  { key: PLATFORM_APPLE, name: 'Apple Music' },
  { key: PLATFORM_SPOTIFY, name: 'Spotify' },
  { key: PLATFORM_YTM, name: 'YouTube Music' },
] as const

export const KIND_TRACK = 'track'
export const KIND_ALBUM = 'album'

export const SPOTIFY_HOST_RE = /(^|\.)spotify\.(com|link)$/
export const SPOTIFY_SHORT_HOST = 'spotify.link'
export const SPOTIFY_ORIGIN = 'https://open.spotify.com'
// oEmbed's player URL carries the real track/album ID behind a short link.
export const SPOTIFY_EMBED_RE = /embed\/(track|album)\/([A-Za-z0-9]+)/
export const SPOTIFY_OEMBED_URL = `${SPOTIFY_ORIGIN}/oembed`

export const APPLE_MUSIC_HOST = 'music.apple.com'
export const APPLE_SONG_PARAM = 'i'
export const APPLE_SONG_SEGMENT = 'song'
export const APPLE_ALBUM_SEGMENT = 'album'
export const SLUG_SEPARATOR_RE = /-/g

export const SEARCH_URL_BASES = {
  [PLATFORM_SPOTIFY]: `${SPOTIFY_ORIGIN}/search/`,
  [PLATFORM_APPLE]: `https://${APPLE_MUSIC_HOST}/us/search?term=`,
  [PLATFORM_YTM]: 'https://music.youtube.com/search?q=',
}
// The app scheme opens Spotify's own search; the web search above stays the shared link.
export const SPOTIFY_APP_SEARCH_URI = 'spotify:search:'

export const OEMBED_URL_PARAM = 'url'

export const ITUNES_HOST = 'itunes.apple.com'
export const ITUNES_LOOKUP_URL = `https://${ITUNES_HOST}/lookup`
export const ITUNES_SEARCH_URL = `https://${ITUNES_HOST}/search`
export const ITUNES_COUNTRY = 'us'
export const ITUNES_ID_PARAM = 'id'
export const ITUNES_ENTITY_PARAM = 'entity'
export const ITUNES_COUNTRY_PARAM = 'country'
export const ITUNES_TERM_PARAM = 'term'
export const ITUNES_LIMIT_PARAM = 'limit'
export const ITUNES_SEARCH_LIMIT = 5
export const ITUNES_ENTITY_SONG = 'song'
export const ITUNES_ENTITY_ALBUM = 'album'
export const ITUNES_TRACKING_PARAM = '&uo='
export const ARTWORK_SIZE_SMALL = '100x100'
export const ARTWORK_SIZE_LARGE = '300x300'

export const WORD_SEPARATOR = ' '
export const WORD_START_RE = /\b\w/g
export const PUNCTUATION_RE = /\p{P}/gu
export const WHITESPACE_RUN_RE = /\s+/g
export const LINE_BREAK = '\n'
export const TITLE_ARTIST_SEPARATOR = ' — '
export const SHARE_LABEL_SEPARATOR = ': '
export const PATH_SEPARATOR = '/'

export const JSONP_TIMEOUT_MS = 8000
export const JSONP_CALLBACK_PREFIX = 'cp'
export const ITUNES_CALLBACK_PARAM = 'callback'
export const JSONP_TIMEOUT_ERROR = 'timeout'
export const JSONP_NETWORK_ERROR = 'network'

export const STATUS_IDLE = 'idle'
export const STATUS_BUSY = 'busy'
export const STATUS_DONE = 'done'
export const STATUS_ERROR = 'error'

// ?u=<link> auto-converts; the iOS Shortcut and shared Crossplay links use it.
export const SHARE_URL_PARAM = 'u'

export const INVALID_LINK_MESSAGE = 'That link isn’t a Spotify or Apple Music track or album.'
export const LOOKING_UP_MESSAGE = 'Looking it up…'
export const SHORT_LINK_MESSAGE =
  'Couldn’t open that short link. In Spotify, tap Share → Copy link, then paste the full open.spotify.com link.'
export const NOT_FOUND_MESSAGE = 'Couldn’t find that one. Check the link and try again.'

export const INPUT_PLACEHOLDER = 'https://open.spotify.com/track/…'
export const INPUT_LABEL = 'Spotify or Apple Music link'
export const CONVERT_LABEL = 'Convert'
export const TAG_EXACT = 'EXACT'
export const TAG_SEARCH = 'SEARCH'
export const ARTIST_PICKER_LABEL = 'Which artist?'
export const CANDIDATE_SEPARATOR = ' · '
export const SPOTIFY_APP_SEARCH_LABEL = 'Search in Spotify app'
export const APP_LINK_CLASS = 'app-link'

export const COPY_COMMAND = 'copy'
export const COPY_RESULT_COPIED = 'copied'
export const COPY_RESULT_MANUAL = 'manual'
export const COPY_RESET_MS = 1400
export const COPY_LABEL = 'Copy'
export const COPIED_LABEL = 'Copied'
export const COPY_MANUAL_LABEL = 'Copy it below'
export const SHARE_LABEL = 'Copy share text'
export const FALLBACK_TEXTAREA_LABEL = 'Text to copy'
export const FALLBACK_TEXTAREA_ROWS = 5
