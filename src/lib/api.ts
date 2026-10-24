import {
  ITUNES_CALLBACK_PARAM,
  JSONP_CALLBACK_PREFIX,
  JSONP_NETWORK_ERROR,
  JSONP_TIMEOUT_ERROR,
  JSONP_TIMEOUT_MS,
  PLATFORM_APPLE,
} from '../constants'
import { withSearchFallbacks } from './links'
import {
  fromItunesLookup,
  fromOdesli,
  fromSpotifyFallback,
  itunesLookupUrl,
  itunesSearchUrl,
  odesliHopUrl,
  odesliUrl,
  resolveSpotifyShortLink,
  spotifyOembedUrl,
  withHopLinks,
} from './lookup'
import type {
  Conversion,
  ItunesResponse,
  Lookup,
  OdesliResponse,
  ParsedLink,
  SpotifyOembed,
} from './types'

type SourceLookup = { lookup: Lookup | null; parsed: ParsedLink }

let jsonpCount = 0

export function jsonp<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const callback = `${JSONP_CALLBACK_PREFIX}${++jsonpCount}`
    const src = new URL(url)
    src.searchParams.set(ITUNES_CALLBACK_PARAM, callback)
    const callbacks = window as unknown as Record<string, (body: T) => void>
    const script = document.createElement('script')
    const finish = () => {
      clearTimeout(timer)
      delete callbacks[callback]
      script.remove()
    }
    const timer = setTimeout(() => {
      finish()
      reject(new Error(JSONP_TIMEOUT_ERROR))
    }, JSONP_TIMEOUT_MS)
    callbacks[callback] = (body) => {
      finish()
      resolve(body)
    }
    script.onerror = () => {
      finish()
      reject(new Error(JSONP_NETWORK_ERROR))
    }
    script.src = src.href
    document.head.appendChild(script)
  })
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(String(response.status))
  return response.json()
}

// A failed iTunes request counts as no results: the source link alone still
// gives a result with search links.
const itunesOrNothing = (url: string) => jsonp<ItunesResponse>(url).catch(() => null)

async function viaSpotify(parsed: ParsedLink): Promise<SourceLookup> {
  const oembed = await fetchJson<SpotifyOembed>(spotifyOembedUrl(parsed.link))
  const resolved = parsed.kind ? parsed : resolveSpotifyShortLink(oembed)
  if (!resolved) return { lookup: null, parsed }
  const itunes = await itunesOrNothing(itunesSearchUrl(oembed.title ?? '', resolved.kind))
  return { lookup: fromSpotifyFallback(oembed, itunes, resolved), parsed: resolved }
}

async function viaSource(parsed: ParsedLink): Promise<SourceLookup> {
  if (parsed.src === PLATFORM_APPLE) {
    const itunes = await itunesOrNothing(itunesLookupUrl(parsed))
    return { lookup: fromItunesLookup(itunes, parsed), parsed }
  }
  return viaSpotify(parsed).catch(() => ({ lookup: null, parsed }))
}

// A failed or malformed hop keeps the first response: it already has a title
// and links, and the platforms the hop would fill fall back to searches.
const withOdesliHop = (first: Lookup, hopUrl: string): Promise<Lookup> =>
  fetchJson<OdesliResponse>(hopUrl)
    .then((hop) => withHopLinks(first, fromOdesli(hop)))
    .catch(() => first)

async function viaOdesliOrSource(parsed: ParsedLink): Promise<SourceLookup> {
  const url = odesliUrl(parsed.link)
  let first: Lookup
  let hopUrl: string | null
  try {
    const body = await fetchJson<OdesliResponse>(url).catch(() => fetchJson<OdesliResponse>(url))
    first = fromOdesli(body)
    hopUrl = odesliHopUrl(body)
  } catch {
    return viaSource(parsed)
  }
  return { lookup: hopUrl ? await withOdesliHop(first, hopUrl) : first, parsed }
}

// Resolves on every lookup failure, with a null conversion, so callers need
// no rejection path.
export async function lookupLink(
  parsed: ParsedLink,
): Promise<{ conversion: Conversion | null; parsed: ParsedLink }> {
  const found = await viaOdesliOrSource(parsed)
  return {
    conversion: found.lookup?.title ? withSearchFallbacks(found.lookup) : null,
    parsed: found.parsed,
  }
}
