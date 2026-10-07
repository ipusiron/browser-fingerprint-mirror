# Repository Guidelines

## Project Structure & Module Organization
- Static site, no build: `index.html` (UI), `script.js` (DOM only), `style.css`, `js/fp-core.js` (pure functions: SHA-256, detection, fingerprint ID, protections, validation), `js/fp-collect.js` (browser API collection and the opt-in IP lookup), `js/messages.js` (UI strings), `assets/` (screenshots), `test/` (node:test).
- Keep the app dependency-free and client-only. Logic goes into `js/fp-core.js` so it can be tested in Node; browser-only reads go into `js/fp-collect.js`.

## Build, Test, and Development Commands
- Run locally: `python -m http.server 8000` (or any static server). `file://` works except the clipboard.
- `npm test` runs all tests with `node --test` (Node 22+, no packages). GitHub Actions runs it on push and pull_request.

## Coding Style & Naming Conventions
- JavaScript: 2-space indent, semicolons, single quotes, `const`/`let`, camelCase. Small pure functions in `fp-core.js`.
- DOM: IDs/classes in kebab-case. Use `textContent`/`createElement`; never `innerHTML`.
- CSS: use the variables in `:root` / `[data-theme="light"]`; `test/contrast.test.js` enforces 4.5:1 for text/background pairs.
- UI strings live in `js/messages.js` (shared keys for ja/en); `script.js` must not contain Japanese literals.

## Testing Guidelines
- Add tests next to the behavior you change: `core.test.js` (logic), `html.test.js` (markup/CSP), `contrast.test.js` (colors/layout rules), `format.test.js` (file hygiene), `readme.test.js` (README numbers come from code).
- Manual check in Chromium and Firefox: tabs (mouse and arrow keys), theme toggle, fingerprint ID shown, "read again" keeps the same ID, IP button fetches only when pressed, JSON copy, no console errors or CSP violations.

## Commit & Pull Request Guidelines
- Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`) or a short Japanese subject. Small, focused commits that each pass `npm test`.
- PRs: summary, rationale, before/after screenshots for UI changes, and any change to the CSP or to outbound requests.

## Security & Configuration Tips
- Do not add outbound requests. The only allowed hosts are `api4.ipify.org` and `api6.ipify.org`, and only behind the explicit button. Keep the meta CSP strict (no `unsafe-inline`, no external scripts/styles, no analytics).
- Validate anything read from the network or localStorage before rendering (see `FPCore.parseIpify`, `parseIpCache`).
- Never commit screenshots that show a real IP address; take them before pressing the IP button or with mocked responses.

## Agent-Specific Notes
- Scope: repo-wide. Prefer minimal diffs, no frameworks, no build tooling. Align with `CLAUDE.md` for architecture and data shape.
