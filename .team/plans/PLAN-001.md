---
id: PLAN-001
title: Rebuild crossplay as a Vite + React + TypeScript app with a tested harness
status: approved
---

## Goal
Rebuild crossplay as a React app built with Vite and TypeScript, with real `test`, `lint` and `typecheck` gates. Every current feature keeps working, and a GitHub Actions workflow builds the site and deploys it to GitHub Pages under `/crossplay/`.

## Key decisions
- **TypeScript, not JS.** The app's core is mapping three untyped external responses (Odesli, iTunes, Spotify oEmbed) into one result shape. Types catch shape mistakes that unit tests miss, and Vite's `react-ts` setup is the standard starting point, so the cost is near zero. `typecheck` therefore becomes a gate.
- **PWA is deferred to a later plan (PLAN-002).** A manifest plus service worker needs decisions this spec doesn't make: offline behavior when lookups need the network, cache and update strategy, and icon sizes. Add to Home Screen keeps working in this plan through the existing Apple meta tags and `apple-touch-icon.png`, which is how iOS installs pages today.
- **No new libraries beyond the toolchain.** That means no router (one screen; `?u=` is read from `location.search`), no state library, no data-fetching library and no CSS framework. The existing CSS is ported as one global stylesheet.
- **The iTunes fallback stays on JSONP**, because the iTunes Search API does not send CORS headers. Odesli and oEmbed keep using `fetch`.

## Acceptance criteria
- AC1 (tooling and gates):
  - `npm test` runs `vitest run` once, in jsdom, with Testing Library and `@testing-library/jest-dom` matchers available. It exits non-zero on any failing test.
  - `npm run lint` runs ESLint 9 with a flat config (`@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`) and exits non-zero on a lint error.
  - `npm run typecheck` runs `tsc` with `strict: true` and no emit, and exits non-zero on a type error.
  - `npm run build` produces `dist/`.
  - `npm run dev` serves the app at `http://localhost:5173/crossplay/`. The port is pinned with `strictPort`.
- AC2 (dependencies):
  - Runtime `dependencies` are only `react` and `react-dom`. Everything else is a devDependency.
  - `package-lock.json` is committed. `node_modules/` and `dist/` are gitignored.
- AC3 (Pages deploy):
  - `vite.config.ts` sets `base: '/crossplay/'`.
  - `.github/workflows/deploy.yml` runs on every push to `main` and on manual dispatch (`workflow_dispatch`). It runs `npm ci`, then test, lint, typecheck and build, and deploys `dist/` with `actions/upload-pages-artifact` and `actions/deploy-pages`.
  - Built asset URLs in `dist/index.html` all start with `/crossplay/`.
  - The README deploy section says Pages **Source = GitHub Actions** and includes the dev and test commands.
- AC4 (page shell and Add to Home Screen): the built `index.html` keeps:
  - the title "Crossplay";
  - the viewport meta tag, including `viewport-fit=cover`;
  - the `apple-mobile-web-app-*` and `mobile-web-app-capable` metas;
  - both `theme-color` metas;
  - the font links;
  - the favicon and apple-touch-icon, served from `public/` under the base path.
- AC5 (`parseLink`): `src/lib/links.ts` exports `parseLink(raw)`, with the same behavior as today:
  - The input is trimmed, and invalid URLs return `null`.
  - Spotify track and album links become a canonical `https://open.spotify.com/<kind>/<id>` link. Locale segments and the query string are dropped.
  - `spotify.link` short links come back as `{src:'spotify', link}`, with no kind or id.
  - Other Spotify paths return `null`.
  - Apple song links (`?i=` or `/song/`) give `kind:'track'`. Album links give `kind:'album'`.
  - The Apple `id` is the `i` param, otherwise the last path segment. The `slug` is the second-to-last segment with hyphens replaced by spaces. The `link` is origin + pathname, plus `?i=` only when it was present.
  - Other hosts return `null`.
- AC6 (search links): `searchUrl(platform, query)` returns the existing search URL for Spotify, Apple Music or YouTube Music, with the query URI-encoded. `withSearchFallbacks(lookup)` returns a new object without mutating its input:
  - `links` has all three platforms filled, using a search URL for `"title artist"` wherever a link is missing.
  - `exact[platform]` is `true` exactly when a link was given.
- AC7 (share text): `shareText({title, artist, links})` returns `"<title> — <artist>\n\nApple Music: …\nSpotify: …\nYouTube Music: …"`. When the artist is empty, the first line is the title alone.
- AC8 (response mapping): pure functions in `src/lib/lookup.ts` build each request URL and map each response:
  - Odesli: missing fields give `undefined`, and mapping never throws.
  - iTunes lookup: the title falls back from track name to collection name to the title-cased slug, artwork is upsized from 100x100 to 300x300, and a `null` body is handled.
  - Spotify short link: the resolver reads the oEmbed `iframe_url`, falling back to `html`, and returns `null` when no track/album embed is found.
  - Spotify fallback: alternate Apple matches have their URLs rewritten from `itunes.apple.com` to `music.apple.com` and stripped of `&uo=`. The first alt supplies the artist and the Apple link, and an empty result is handled.
- AC9 (lookup orchestration): `lookupLink(parsed)` in `src/lib/api.ts` follows the same order as today:
  - It tries Odesli first.
  - On any Odesli failure it falls back by source: Apple links go to iTunes lookup, Spotify links go to oEmbed and then iTunes search. A failed iTunes JSONP request is treated as no results.
  - It returns a result with the search fallbacks filled in, or `null` when there is no title.
  - JSONP times out after 8 s and cleans up its script tag and callback.
- AC10 (conversion state): `useConversion()` exposes `{ status: 'idle'|'busy'|'done'|'error', conversion, message, isError, convert(raw), chooseAlt(alt) }`, with these rules:
  - Input that doesn't parse sets the invalid-link error without making any request.
  - A response from an older lookup is discarded once a newer one has started.
  - Repeating `convert` on the same link while it is busy does nothing.
  - A failure shows the short-link message when the link was an unresolved `spotify.link` URL, and the not-found message otherwise.
  - On success it calls `history.replaceState` with `?u=<canonical link>`.
- AC11 (convert UI):
  - Submitting the form, or pasting into the URL input, starts a conversion.
  - While busy, the Convert button is disabled, the crossfader animates and the status line reads "Looking it up…".
  - The result card shows the artwork (hidden when there is none), the title and the artist, plus one row per platform. Each row has a link that opens in a new tab with `rel="noopener"`, an `EXACT` or `SEARCH` tag, and a Copy button.
  - Errors appear in the status line and hide the card.
  - Loading `/crossplay/?u=<link>` fills the input and converts automatically.
- AC12 (alternates): when the Spotify fallback returned more than one Apple match, the card shows "Wrong Apple match?" with a button for each other match. Clicking one makes it the Apple link, tagged `EXACT`, updates the artist and reorders the alternates.
- AC13 (copy and share):
  - "Copy share text" and each row's Copy button copy with `navigator.clipboard`. The button then reads "Copied" and goes back to its label after 1.4 s.
  - If the clipboard is blocked, the app tries `execCommand('copy')` from the read-only textarea.
  - If that also fails, the textarea stays visible with the text selected and focused, and the button reads "Copy it below".
- AC14 (theme):
  - By default the theme follows the system.
  - The Theme button toggles light and dark, starting from the theme currently shown.
  - The choice persists under the `localStorage` key `cp-theme` and is applied as `data-theme` on `<html>`.
  - The app still works if storage throws.
- AC15 (standards): every non-exempt literal lives in `src/constants.ts`, including JSX text, labels, messages, URLs, regexes, timeouts and keys. Modules in `src/lib/` other than `api.ts`, `clipboard.ts` and `theme.ts` are pure, with no DOM or network access. (`theme.ts` added in MR-001: `applyTheme` writes `<html>` and `localStorage` by design.)
- AC16 (`.team/config.json`, working tree only, never staged):

  | Key | Value |
  |---|---|
  | `test` | `npm test` |
  | `lint` | `npm run lint` |
  | `typecheck` | `npm run typecheck` |
  | `preview` | `npm run dev` |
  | `previewUrl` | `http://localhost:5173/crossplay` |
  | `paths` | `{ "constants": "src/constants.ts", "shared": "src/lib/" }` |
  | `testPaths` | existing list plus `src/test/` |

## Out of scope
- PWA work: manifest, service worker, offline support and install prompts. These go to PLAN-002.
- New features, redesigns or behavior fixes. The current behavior, including oddities, is the spec.
- A router, a state or data-fetching library, a CSS framework or CSS modules.
- End-to-end or browser tests (Playwright), coverage thresholds, Prettier.
- Changing the GitHub Pages repo setting. The user flips Source to "GitHub Actions"; the README documents it.
- A separate PR-only CI workflow. The deploy workflow runs the gates before building.

## Tasks

### T1 · Vite + React + TS scaffold, harness, theme toggle
- complexity: high
- sets_pattern: true
- assignee: principal
- depends_on: []
- covers: [AC1, AC2, AC4, AC14, AC15, AC16]
- preview: ["/"]
- interface:
  - Scripts and dependencies as in AC1 and AC2.
  - Tooling files: `vite.config.ts` (`base: '/crossplay/'`, `server: { port: 5173, strictPort: true }`, and `test: { environment: 'jsdom', setupFiles: ['src/test/setup.ts'] }`), `tsconfig.json` (strict), `eslint.config.js`, and `.gitignore`.
  - Page shell: `index.html` becomes the Vite entry and keeps every meta and link in AC4. `favicon.png` and `apple-touch-icon.png` move to `public/`.
  - Entry and layout:
    - `src/main.tsx` renders `<App/>` into `#app`.
    - `src/App.tsx` is the page layout: the header with the h1, the subtitle and `<ThemeToggle/>`, plus placeholder slots for the form and the result.
    - `src/styles.css` holds the existing CSS verbatim.
  - Theme:
    - `src/lib/theme.ts` exports `readStoredTheme(): Theme|null`, `applyTheme(t: Theme|null): void` and `nextTheme(current: Theme): Theme`. Storage errors are tolerated.
    - `src/components/ThemeToggle.tsx` is a button labeled "Theme" that toggles between light and dark as in AC14.
  - `src/constants.ts` holds the app name, subtitle, `THEME_STORAGE_KEY = 'cp-theme'`, the theme names and the Theme label.
- notes:
  - This task sets the patterns the rest copy:
    - folder layout: `src/components/` for components, `src/lib/` for shared modules, `src/constants.ts` for constants;
    - colocated `*.test.ts(x)` files;
    - one component per file, with plain function components and props typed inline;
    - global CSS that reuses the existing class names.
  - QA owns `src/test/setup.ts`, which imports `@testing-library/jest-dom/vitest` and adds Testing Library cleanup. QA commits it with T1's tests. Testing `ThemeToggle` this way exercises the component plus Testing Library pattern from day one.
  - Delete the old inline script along with the root `index.html` content it replaces. The rest of the logic is rebuilt in T2–T5.
  - Write the comment about the dark-mode media query once, in CSS.
  - Edit `.team/config.json` in the working tree only (AC16). Never stage it.

### T2 · Pure link, share and response-mapping modules
- complexity: medium
- sets_pattern: true
- assignee: engineer
- depends_on: [T1]
- covers: [AC5, AC6, AC7, AC8, AC15]
- interface:
  - `src/lib/types.ts`:
    - `Platform = 'apple'|'spotify'|'ytm'`
    - `ParsedLink = { src:'spotify'|'apple'; kind?:'track'|'album'; id?:string; slug?:string; link:string }`
    - `Lookup = { title?:string; artist?:string; art?:string; links:Partial<Record<Platform,string>>; alts?:AppleAlt[] }`
    - `AppleAlt = { title:string; artist:string; url:string }`
    - `Conversion = Lookup & { links:Record<Platform,string>; exact:Record<Platform,boolean> }`
    - minimal response types for Odesli, iTunes and oEmbed: only the fields that are read.
  - `src/lib/links.ts`:
    - `parseLink(raw: string): ParsedLink|null`
    - `canonicalSpotifyLink(kind, id): string`
    - `searchUrl(platform: Platform, query: string): string`
    - `withSearchFallbacks(lookup: Lookup): Conversion`
  - `src/lib/share.ts`: `shareText(c: Pick<Conversion,'title'|'artist'|'links'>): string`
  - `src/lib/text.ts`: `titleCase(s?: string): string`
  - `src/lib/lookup.ts`:
    - `odesliUrl(link)`, `fromOdesli(body): Lookup`
    - `itunesLookupUrl(p: ParsedLink)`, `fromItunesLookup(body|null, p): Lookup`
    - `spotifyOembedUrl(link)`, `resolveSpotifyShortLink(oembed): ParsedLink|null`
    - `itunesSearchUrl(title, kind?)`, `fromSpotifyFallback(oembed, itunesBody|null, p): Lookup`
- notes:
  - Port the logic from the old `index.html` script exactly; the old script is the reference.
  - Constants to add:
    - `PLATFORMS` (key and display name)
    - `SPOTIFY_HOST_RE`, `SPOTIFY_SHORT_HOST`, `SPOTIFY_ORIGIN`, `SPOTIFY_EMBED_RE`
    - `APPLE_MUSIC_HOST`, `APPLE_SONG_PARAM`
    - `SEARCH_URL_BASES`
    - `ODESLI_API_URL`, `ODESLI_COUNTRY`
    - `ITUNES_LOOKUP_URL`, `ITUNES_SEARCH_URL`, `ITUNES_COUNTRY`, `ITUNES_SEARCH_LIMIT = 5`
    - `ARTWORK_SIZE_SMALL` and `ARTWORK_SIZE_LARGE`
    - `ITUNES_HOST`, `ITUNES_TRACKING_PARAM`
    - `SHARE_LABELS`, `TITLE_ARTIST_SEPARATOR`
  - `resolveSpotifyShortLink` reuses `canonicalSpotifyLink`. The album-vs-song entity choice is written once.
  - Tests use JSON fixtures shaped like real responses. There is no mocking, because these functions are pure.

### T3 · Network layer and useConversion hook
- complexity: high
- sets_pattern: true
- assignee: sr-engineer
- depends_on: [T2]
- covers: [AC9, AC10, AC15]
- interface:
  - `src/lib/api.ts`:
    - `jsonp<T>(url: string): Promise<T>`, which rejects with `Error('timeout')` or `Error('network')` and always removes its script tag and callback;
    - `lookupLink(parsed: ParsedLink): Promise<{ conversion: Conversion|null; parsed: ParsedLink }>`. It returns the possibly resolved `parsed` so the caller can tell whether a short link was resolved.
  - `src/hooks/useConversion.ts`: `useConversion(): { status; conversion: Conversion|null; message: string; isError: boolean; convert(raw: string): void; chooseAlt(alt: AppleAlt): void }`, with the behavior in AC10 and AC12.
- notes:
  - This sets the data-fetching and async-state pattern. Plain `fetch` plus `useState`, with a ref holding the run ID to guard against stale results.
  - `chooseAlt` lives here so all state changes stay in one place. It returns new objects and never mutates.
  - Constants to add: `JSONP_TIMEOUT_MS = 8000`, `JSONP_CALLBACK_PREFIX`, the `?u=` param name `SHARE_URL_PARAM`, and the messages (invalid link, looking up, short-link failure, not found).
  - Tests mock only `fetch` and the JSONP script load, which cross the network boundary. Use fake timers for the timeout. Use deferred promises to check that a stale response is dropped.

### T4 · Convert form, result card, alternates, `?u=` auto-convert
- complexity: medium
- sets_pattern: false
- assignee: engineer
- depends_on: [T3]
- covers: [AC11, AC12, AC15]
- preview: ["/", "/?u=https%3A%2F%2Fopen.spotify.com%2Ftrack%2F4cOdK2wGLETKBW3PvgPWqT", "/?u=not-a-link"]
- interface:
  - `src/components/ConvertForm.tsx` with props `{ busy: boolean; initialValue?: string; onConvert(raw: string): void }`.
    - It renders a labeled `type="url"` input with the existing placeholder and a "Convert" button that is disabled while busy.
    - Submitting, or a paste event (deferred one tick), calls `onConvert` with the input value.
  - `src/components/ResultCard.tsx` with props `{ conversion: Conversion; onChooseAlt(alt: AppleAlt): void }`.
    - It renders the artwork, the title, the artist, and one row per platform with a link (`target="_blank" rel="noopener"`) and an `EXACT`/`SEARCH` tag.
    - It also renders the alternates block from AC12.
  - `App.tsx` wiring:
    - It connects `useConversion` to these components and adds the `busy` class to `<main>`.
    - It shows the status line with `role="status"` (adding `err` on errors).
    - On mount it reads `?u=` once and converts it.
- notes:
  - Reuse `PLATFORMS` and the T3 messages.
  - Constants to add: `INPUT_PLACEHOLDER`, `CONVERT_LABEL`, `TAG_EXACT`, `TAG_SEARCH`, `WRONG_MATCH_LABEL`, `ALT_SEPARATOR`.
  - Leave the Copy buttons and the share button to T5. Leave a single slot for them, and add no placeholder buttons.
  - Component tests drive `App` with a mocked `fetch`, through the public render output only.
  - Make sure the `?u=` effect runs once under StrictMode in dev.

### T5 · Copy buttons, share text, clipboard fallback
- complexity: medium
- sets_pattern: false
- assignee: engineer
- depends_on: [T4]
- covers: [AC13, AC7, AC15]
- preview: ["/?u=https%3A%2F%2Fmusic.apple.com%2Fus%2Falbum%2Fx%2F1440857781%3Fi%3D1440857786"]
- interface:
  - `src/lib/clipboard.ts`: `copyText(text: string, fallbackBox: HTMLTextAreaElement): Promise<'copied'|'manual'>`. It tries `navigator.clipboard.writeText`, then `execCommand('copy')` on the box, and returns `'manual'` with the box left selected.
  - `src/components/CopyButton.tsx` with props `{ text: string; label: string; className?: string; fallbackRef: RefObject<HTMLTextAreaElement> }`. It shows "Copied" or "Copy it below", then goes back to its label after `COPY_RESET_MS`.
  - `ResultCard` gains a Copy button on each row, a "Copy share text" button (`className="share"`) that copies `shareText(conversion)`, and the hidden, read-only, `aria-label`led fallback textarea.
- notes:
  - Reuse `shareText` from T2. Do not rebuild the string.
  - Constants to add: `COPY_LABEL`, `COPIED_LABEL`, `COPY_MANUAL_LABEL`, `SHARE_LABEL`, `FALLBACK_TEXTAREA_LABEL`, `COPY_RESET_MS = 1400`.
  - Tests stub `navigator.clipboard` and `document.execCommand`, which are platform APIs jsdom lacks, and use fake timers.

### T6 · GitHub Pages build-and-deploy workflow and README
- complexity: low
- sets_pattern: true
- assignee: engineer
- depends_on: [T1]
- covers: [AC3]
- interface:
  - `.github/workflows/deploy.yml`:
    - triggers: every push to `main`, plus manual dispatch (`workflow_dispatch`);
    - permissions: `pages: write`, `id-token: write`, `contents: read`;
    - concurrency group `pages`;
    - steps: `actions/setup-node` with `node-version-file` or `22` and npm cache; `npm ci`; test; lint; typecheck; `npm run build`; `actions/upload-pages-artifact` with `path: dist`; `actions/deploy-pages`.
  - README:
    - Replace "upload everything to the root" with the Actions-based deploy steps (Settings → Pages → Source: GitHub Actions).
    - Add a Development section covering `npm install`, `npm run dev`, `npm test`, `npm run lint` and `npm run typecheck`.
    - Keep the iPhone, Shortcut and How-it-works sections. Update the URLs only if they change; they do not, since the base is `/crossplay/`.
- notes:
  - This is the first CI file in the repo, hence `sets_pattern`.
  - QA can check the workflow with a Node test that reads the file as text and asserts the trigger, the gate steps and `path: dist` (adding a YAML parser dependency is not justified), and can check the `base` by building and asserting that `dist/index.html` asset URLs start with `/crossplay/`.
