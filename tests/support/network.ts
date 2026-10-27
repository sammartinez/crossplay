import { vi } from 'vitest'

// Stand-ins for the two things that cross the network boundary: fetch and
// the JSONP <script> load. Everything else in the lookup path runs for real.

export type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason: unknown) => void
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

export const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const requestUrl = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

// What a strict fetch stand-in answers for one URL: a response, a promise of
// one, or a rejection for a network failure.
export type FetchAnswer = () => Response | Promise<Response>

let unexpectedFetches: string[] = []

// Replaces global fetch with one that answers only the URLs in `routes`. Any
// other request rejects and is recorded, and the test then fails at teardown
// (see checkNoUnexpectedFetches), so a request no test asked for can't be
// hidden by a fallback that swallows the rejection.
export function mockFetchOnly(routes: Record<string, FetchAnswer>) {
  const fn = vi.fn(async (input: RequestInfo | URL) => {
    const url = requestUrl(input)
    const answer = routes[url]
    if (answer) return answer()
    unexpectedFetches.push(url)
    return Promise.reject(new Error(`unexpected fetch ${url}`))
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

// Throws, failing the test, when a mockFetchOnly stand-in got a request it
// had no route for. Run after every test by tests/support/setup.ts.
export function checkNoUnexpectedFetches(): void {
  const urls = unexpectedFetches
  unexpectedFetches = []
  if (urls.length) throw new Error(`unexpected fetch requests: ${urls.join(', ')}`)
}

// A fetch answer that responds with `body` as JSON, with status 200 unless
// `status` says otherwise.
export const answerJson =
  (body: unknown, status = 200): FetchAnswer =>
  () =>
    jsonResponse(body, status)

export const failsToFetch: FetchAnswer = () => Promise.reject(new TypeError('Failed to fetch'))

export const fetchedUrls = (fn: ReturnType<typeof mockFetchOnly>): string[] =>
  fn.mock.calls.map(([input]) => requestUrl(input))

// What a JSONP script load does: call the page's callback with data, fail
// to load (the script's error event), or never answer.
export type JsonpOutcome = { data: unknown } | 'error' | 'hang'

export type JsonpLoad = { src: string; callback: string; script: HTMLScriptElement }

let observer: MutationObserver | null = null
let tracked: JsonpLoad[] = []

// Watches the document for JSONP <script> tags. jsdom never loads them, so
// this answers each one as `respond` says. The callback name is read from
// the script URL's `callback` param, which is how the iTunes API names it.
export function mockJsonp(respond: (src: string) => JsonpOutcome): JsonpLoad[] {
  stopJsonp()
  const loads: JsonpLoad[] = []
  tracked = loads
  observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof HTMLScriptElement) || !node.src) continue
        const callback = new URL(node.src).searchParams.get('callback') ?? ''
        loads.push({ src: node.src, callback, script: node })
        const outcome = respond(node.src)
        if (outcome === 'hang') continue
        if (outcome === 'error') node.dispatchEvent(new Event('error'))
        else (window as unknown as Record<string, (d: unknown) => void>)[callback](outcome.data)
      }
    }
  })
  observer.observe(document, { childList: true, subtree: true })
  return loads
}

// Also clears any load a test left unanswered, so the next test starts with
// no stray script tags or callbacks.
export function stopJsonp(): void {
  observer?.disconnect()
  observer = null
  for (const { script, callback } of tracked) {
    script.remove()
    delete (window as unknown as Record<string, unknown>)[callback]
  }
  tracked = []
}

export const jsonpScriptsInDocument = (): HTMLScriptElement[] =>
  Array.from(document.querySelectorAll('script')).filter((s) => s.src)
