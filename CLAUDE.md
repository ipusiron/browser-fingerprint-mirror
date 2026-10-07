# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser Fingerprint Mirror is an educational static web tool that shows what a browser exposes about itself (User-Agent, UA Client Hints, screen, language, timezone, hardware, media queries, WebGL, Canvas, Audio, plugins). It computes a fingerprint ID, checks its stability, detects visible protections, and annotates every attribute with the identifying power measured by published research. Nothing is sent to a server; the only outbound request is the optional IP lookup (ipify.org), triggered by a button.

## Architecture

Plain HTML/CSS/JavaScript, no build step, no dependencies. Scripts are classic (non-module) so the page also works from `file://`.

- `js/fp-core.js` (`globalThis.FPCore`): pure functions only, no DOM or browser APIs. SHA-256 (pure JS), canonical JSON, OS/browser detection (UA-CH first, then UA order iPhone/iPad → CrOS → Android → Windows → Macintosh → Linux), attribute catalog `ATTRIBUTES` (21 rows: path, stability, `inId`, reference bits from Gómez-Boix et al. 2018 Table 3), `STUDY_TABLE`/`STUDY_META` (Panopticlick 2010, AmIUnique 2016, 2018 dataset), `fingerprintId()`, `diffAttributes()`, font detection (`FONT_LIST`, `detectedFonts()` over three generic-family baselines), `detectProtections()` (canvas randomized, plugins fixed list, WebGL masked, reduced UA, deviceMemory hidden, DNT, GPC, UTC timezone), and validation of the ipify response and the localStorage cache.
- `js/fp-collect.js` (`globalThis.FPCollect`): reads browser APIs into the data shape FPCore expects. `collect()` never contacts the network. `fetchNetwork(env)` is the only outbound call (ipify v4/v6) and is invoked only from the "fetch IP" button; responses are validated and cached in localStorage for 5 minutes.
- `js/messages.js` (`globalThis.FPMessages`): UI strings, `t(key, params)`. Static strings are referenced from `index.html` via `data-i18n` / `data-i18n-attr`.
- `script.js`: DOM only (tabs with ARIA + arrow keys, theme following `prefers-color-scheme` unless saved, fingerprint ID card, stability of repeated reads, last-visit ID in localStorage with a clear button, protections list, attribute cards, JSON copy with error toast).
- `index.html`: meta CSP (`default-src 'self'`, no `unsafe-inline`, `connect-src` limited to the two ipify hosts), `no-referrer`, `color-scheme`, data-URI favicon, noscript.
- `style.css`: CSS variables for dark/light; contrast pairs are verified by tests.

### Data shape (collect())

`{ timestamp, ua: { userAgent, platform, vendor, uaData, uaHigh }, screen, language, intl, time, storage, privacy: { cookieEnabled, doNotTrack, globalPrivacyControl }, hardware, media, webgl, canvas: { hash, hash2, sampleLen }, audio, plugins: { names, count, pdfViewerEnabled }, fonts: { tested, count, names }, network }`

The fingerprint ID is SHA-256 of the canonical JSON of the `inId` attributes (everything except `network`), first 16 hex digits.

## Development

```bash
python -m http.server 8000   # or any static server; file:// also works (clipboard is denied there)
npm test                     # node --test, Node 22+, no dependencies
```

### Tests (`test/`)

- `core.test.js`: SHA-256 against Node's crypto and known vectors, canonicalization, OS/browser detection matrix, catalog/study table consistency, fingerprint ID stability, protections, API/cache validation.
- `html.test.js`: CSP/referrer/favicon/noscript, no inline handlers, script order, tab/panel ARIA wiring, required ids, opt-in IP button.
- `contrast.test.js`: every text/background pair in both themes is at least 4.5:1; layout rules (44px targets, centered header, `minmax(min(…))`).
- `format.test.js`: no minified files, no Japanese literals outside `messages.js`, core has no DOM access, only the two ipify hosts appear in `fp-collect.js`.
- `readme.test.js`: README tables (study table, attribute catalog) recomputed from `FPCore`, YAML metadata structure, screenshots exist, directory tree complete, notation rules.

GitHub Actions runs `npm test` on push and pull_request.

### Coding Conventions

- JavaScript: 2-space indent, semicolons, single quotes, `const`/`let`, camelCase. Keep `fp-core.js` free of `document`/`window`/`navigator`.
- UI text goes into `js/messages.js` (Japanese and English share keys); `script.js` must not contain Japanese string literals.
- DOM updates use `textContent`/`createElement`, never `innerHTML`.
- Keep the strict CSP; `connect-src` lists only `api4.ipify.org` and `api6.ipify.org`. Do not add external scripts, styles, or analytics.
- Commit messages: Conventional Commits (`feat:`, `fix:`, `docs:`, …) or a short Japanese subject.

## Privacy & Security Notes

- Collected values are rendered locally only. The IP lookup is opt-in and clearly labelled; ipify.org states that it logs no visitor information. There is no ISP lookup (third-party ISP APIs answer browser requests with bot-protection challenges).
- localStorage holds only: theme, language, the last fingerprint ID (with a clear button), and the 5-minute IP cache. All reads are validated; a corrupted cache is discarded.
- The "reference bits" are dataset averages from published studies, not the rarity of the visitor's values; the tool has no population to compare against.
