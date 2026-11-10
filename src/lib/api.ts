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
  fromSpotifyOembed,
  itunesLookupUrl,
  itunesSearchUrl,
  resolveSpotifyShortLink,
  spotifyOembedUrl,
} from './lookup'
import type { Conversion, ItunesResponse, Lookup, ParsedLink, SpotifyOembed } from './types'

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
  // A blank title has nothing to search for, so it ends as not found.
  if (!oembed.title?.trim()) return { lookup: null, parsed: resolved }
  const itunes = await itunesOrNothing(itunesSearchUrl(oembed.title, resolved.kind))
  return { lookup: fromSpotifyOembed(oembed, itunes, resolved), parsed: resolved }
}

async function viaApple(parsed: ParsedLink): Promise<SourceLookup> {
  const itunes = await itunesOrNothing(itunesLookupUrl(parsed))
  return { lookup: fromItunesLookup(itunes, parsed), parsed }
}

// Resolves on every lookup failure, with a null conversion, so callers need
// no rejection path.
export async function lookupLink(
  parsed: ParsedLink,
): Promise<{ conversion: Conversion | null; parsed: ParsedLink }> {
  const via = parsed.src === PLATFORM_APPLE ? viaApple : viaSpotify
  const found = await via(parsed).catch(() => ({ lookup: null, parsed }))
  return {
    conversion: found.lookup?.title ? withSearchFallbacks(found.lookup) : null,
    parsed: found.parsed,
  }
}
