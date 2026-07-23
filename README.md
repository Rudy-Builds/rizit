# rizit

Paste a URL, get its archived copy. A zero-dependency PWA that resolves any webpage to its latest snapshot on [archive.is](https://archive.is) or the [Wayback Machine](https://web.archive.org).

## How it works

1. Paste a URL (or share a page to the app on Android)
2. Rizit builds the archive lookup URL for the selected backend
3. The archived snapshot opens directly

| Backend | Lookup |
|---|---|
| archive.is (default) | `https://archive.is/newest/<url>` |
| Wayback Machine | `https://web.archive.org/web/99999999999999/<url>` |

## Features

- **Share target** — on Android, "Share → Rizit" from any browser archives the page in one tap
- **Backend selector** — switch between archive.is and Wayback Machine, persisted in `localStorage`
- **History** — last 10 lookups with one-tap re-archive
- **Offline** — service worker with network-first caching (`sw.js`)
- **Dark mode** — follows system preference, manual toggle persisted
- **Installable** — home-screen install on Android, iOS, and desktop

## Stack

Vanilla HTML/CSS/JS. No build step, no dependencies, no backend — all state lives in `localStorage`.

```
index.html      UI
app.js          Theme, backend, history, share-target handling, install prompt
styles.css      Styling + dark mode
sw.js           Service worker (versioned cache, network-first)
manifest.json   PWA manifest + Android share_target
```

## Run locally

Serve the directory over HTTP (service workers require it):

```bash
npx serve .
```

## Deploy

Static hosting of any kind. Bump `CACHE_VERSION` in `sw.js` when shipping changes so clients pick up the new assets.
