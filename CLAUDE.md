# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser Fingerprint Mirror is an educational web tool that visualizes browser fingerprinting information. It's a static site that runs entirely client-side with no backend or external data transmission (except IP/ISP lookup via external APIs).

## Architecture

This is a single-page application with three tab-based modes:

1. **Simple Mode** (`#simple`) - Displays basic browser environment info grouped by category: browser/OS, network (IPv4/IPv6/ISP via external API), language/timezone, hardware, and privacy settings
2. **Advanced + Analysis Mode** (`#advanced`) - Comprehensive fingerprint collection including Canvas/WebGL/Audio hashing, with a uniqueness score calculation (0-100)
3. **Learn Mode** (`#learn`) - Educational accordion content explaining browser fingerprinting concepts and countermeasures

### Key Files

- `index.html` - Tab-based UI with CSP meta tag, three panel sections, and accessibility attributes
- `script.js` - All functionality: tab switching, data collection, rendering, scoring, and theme toggle
- `style.css` - Dark/light theme support via CSS custom properties and `data-theme` attribute

### Data Collection (`collectAll()` in script.js:195)

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
- Network/ISP info (via ipify.org and ipapi.co APIs, cached 5 minutes)

### Uniqueness Score (`uniquenessScore()` in script.js:290)

Heuristic scoring system (0-118 pts normalized to 0-100) that weighs:
- Language diversity (10 pts)
- Screen resolution + DPR uniqueness (15 pts)
- Timezone (8 pts)
- Hardware specs (15 pts)
- WebGL renderer/vendor (18 pts)
- Canvas/Audio hashes (24 pts)
- DNT/Cookie settings (10 pts)
- Plugin count (10 pts)
- ISP/Network (8 pts)

## Development

### Running Locally

This is a static site - simply open `index.html` in a browser or use any local HTTP server:

```bash
# Python
python -m http.server 8000

# Node.js
npx http-server

# Windows (direct open - some APIs may behave differently)
start index.html
```

### No Build Process

There are no build, lint, or test commands. This project uses vanilla HTML/CSS/JavaScript with no dependencies or bundling.

### Coding Conventions

- **JavaScript**: 2-space indent, semicolons, single quotes, `const`/`let`, camelCase for variables/functions
- **DOM**: IDs/classes in kebab-case (e.g., `#theme-toggle`, `.score-wrap`). Use `$`/`$$` selector helpers
- **CSS**: Use existing CSS variables in `:root`; preserve dark/light theme tokens
- **HTML**: Maintain strict CSP in `<meta http-equiv="Content-Security-Policy">`; update `connect-src` only when adding new API endpoints

### Testing

Manual cross-browser testing recommended (Chromium, Firefox, Safari/iOS):
- Tab switching works correctly
- Theme toggle persists to localStorage
- Simple mode displays all info without console errors
- Advanced mode collects fingerprint data and calculates score
- JSON copy button works
- External API calls (ipify/ipapi) fail gracefully when offline or rate-limited

### Commit Guidelines

Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `style:`, `chore:`

## Privacy & Security Notes

- All data collection happens client-side only
- External API calls limited to: `api4.ipify.org`, `api6.ipify.org`, `ipapi.co` (for IP/ISP info)
- API responses cached in localStorage for 5 minutes to avoid rate limits
- Canvas/WebGL/Audio fingerprinting is for educational demonstration only
- Do not add analytics or trackers; this is an educational privacy tool
