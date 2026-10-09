# Crossplay

Paste a Spotify or Apple Music link and get matching Apple Music, Spotify and YouTube Music links, plus share text you can copy.

## Deploy to GitHub Pages

1. Create a public repo named `crossplay`.
2. Upload everything in this folder to the root of the repo.
3. Open **Settings → Pages**, set **Source** to *Deploy from a branch*, choose `main` and `/ (root)`, then save.
4. After a minute or so, the site is live at `https://<your-username>.github.io/crossplay/`.

## Add to iPhone Home Screen

Open the site in Safari, tap **Share**, then tap **Add to Home Screen**.

## iOS Share Sheet shortcut

1. Create a new Shortcut.
2. Turn on **Show in Share Sheet** and set it to accept URLs.
3. Add an **Open URL** action set to `https://<your-username>.github.io/crossplay/?u=` followed by **Shortcut Input**.

After that, tapping Share → Crossplay on a song converts it right away.

## How it works

- **Primary lookup:** Odesli (`api.song.link`) returns exact links for all platforms. It's free and needs no API key, but it's limited to about 10 lookups per minute.
- **Fallback:** if Odesli fails, the page uses Spotify oEmbed and the iTunes Search API. Links that couldn't be matched exactly open a search on that platform and are tagged SEARCH.
- **Shareable link:** `?u=<link>` in the address converts that link as soon as the page opens.
