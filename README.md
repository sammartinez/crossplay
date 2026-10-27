# Crossplay

Paste a Spotify or Apple Music link and get matching Apple Music, Spotify and YouTube Music links, plus share text you can copy.

## Deploy to GitHub Pages

1. Create a public repo named `crossplay` and push this project to its `main` branch.
2. Open **Settings → Pages** and set **Source** to *GitHub Actions*.
3. Every push to `main` runs `.github/workflows/deploy.yml`, which installs dependencies, runs the tests, lint and typecheck, builds the site and deploys `dist/`. You can also run it by hand from the **Actions** tab.
4. After a minute or so, the site is live at `https://<your-username>.github.io/crossplay/`.

## Development

You need Node 22.

- `npm install` installs dependencies.
- `npm run dev` starts the dev server at `http://localhost:5173/crossplay/`.
- `npm test` runs the tests.
- `npm run lint` runs ESLint.
- `npm run typecheck` runs the TypeScript compiler without emitting files.
- `npm run build` builds the site into `dist/`.

## Add to iPhone Home Screen

Open the site in Safari, tap **Share**, then tap **Add to Home Screen**.

## iOS Share Sheet shortcut

1. Create a new Shortcut.
2. Turn on **Show in Share Sheet** and set it to accept URLs.
3. Add an **Open URL** action set to `https://<your-username>.github.io/crossplay/?u=` followed by **Shortcut Input**.

After that, tapping Share → Crossplay on a song converts it right away.

## How it works

- **Lookup:** an Apple Music link is looked up with the iTunes Search API. A Spotify link is looked up with Spotify oEmbed, which gives the title and art but no artist, then the iTunes Search API is searched for that title. Both are free and need no API key.
- **Tags:** the link you pasted is tagged EXACT. The other platforms open a search for the song, tagged SEARCH. oEmbed gives no artist, so for a Spotify link the artists the title search found are shown as buttons for you to pick. When exactly one of them has a song with the same title (ignoring suffixes such as remaster and featuring credits), that artist is pre-selected and its Apple Music link is tagged LIKELY; otherwise the artist stays blank. Picking an artist links Apple Music to that artist's release, tagged EXACT.
- **Shareable link:** `?u=<link>` in the address converts that link as soon as the page opens.
