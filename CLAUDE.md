# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser Fingerprint Mirror is an educational web tool that visualizes browser fingerprinting information. It's a static site that runs entirely client-side with no backend or external data transmission (except for the ISP check feature which uses external services).

## Architecture

This is a single-page application with three main modes:

1. **Simple Mode** (`#simple`) - Displays basic browser environment info (browser, OS, screen resolution, language, timezone, hardware)
2. **ISP Check Mode** (`#isp`) - Embeds or opens external ISP checking services (env.b4iine.net/isp.php or ugtop.com/spill.shtml)
3. **Advanced + Analysis Mode** (`#advanced`) - Comprehensive fingerprint collection including Canvas/WebGL/Audio hashing, with a uniqueness score calculation

### Key Files

- `index.html` - Tab-based UI structure with three main sections
- `script.js` - All functionality: tab switching, data collection, rendering, and scoring
- `style.css` - Dark-themed styling with CSS custom properties

### Data Collection (`collectAll()` in script.js)

Gathers fingerprint data from multiple browser APIs:
- User-Agent and UA-CH (Client Hints)
- Screen properties (resolution, color depth, DPR)
- Hardware info (cores, memory, touch capability)
- Storage APIs (localStorage, sessionStorage, IndexedDB)
- WebGL vendor/renderer via `WEBGL_debug_renderer_info` extension
- Canvas fingerprint using `toDataURL()` and djb2 hash
- Audio fingerprint using OfflineAudioContext with oscillator/compressor
- Media queries (color scheme, reduced motion)
- Fonts (basic detection via width measurement)
- Plugins enumeration

### Uniqueness Score (`uniquenessScore()` in script.js:189)

Heuristic scoring system (0-100) that weighs:
- Language diversity (10 pts)
- Screen resolution uniqueness (15 pts)
- Timezone (8 pts)
- Hardware specs (15 pts)
- WebGL renderer/vendor (18 pts)
- Canvas/Audio hashes (24 pts)
- DNT/Cookie settings (10 pts)
- Plugin count (10 pts)

## Development

### Running Locally

This is a static site - simply open `index.html` in a browser or use any local HTTP server:

```bash
# Python
python -m http.server 8000

# Node.js (if http-server is installed)
npx http-server

# Or just open index.html directly in a browser
start index.html  # Windows
```

### No Build Process

There are no build, lint, or test commands. This project uses vanilla HTML/CSS/JavaScript with no dependencies or bundling.

### Testing

Manual testing in multiple browsers recommended:
- Chrome/Edge (Chromium-based)
- Firefox
- Safari (macOS/iOS)

Test all three modes and verify:
- Tab switching works correctly
- Simple mode displays basic info
- ISP mode can embed/open external sites
- Advanced mode collects all fingerprint data and calculates score
- JSON copy button works

## Privacy & Security Notes

- All data collection happens client-side only (no external transmission except ISP check)
- ISP check uses external sites: env.b4iine.net and ugtop.com
- Canvas/WebGL/Audio fingerprinting is for educational demonstration only
- This is a defensive security tool for education about browser fingerprinting