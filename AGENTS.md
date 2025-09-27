# Repository Guidelines

## Project Structure & Module Organization
- Root contains a static site: `index.html` (UI), `script.js` (logic), `style.css` (styles), and `assets/` (images).
- Keep the app dependency‑free and client‑only. If adding features, prefer small helpers in `script.js` with clear section headers. For large additions, create a new JS file and load it with `<script type="module">` to avoid a build step.

## Build, Test, and Development Commands
- Run locally (any static server):
  - Python: `python -m http.server 8000`
  - Node: `npx http-server` or `npx serve`
  - Windows: `start index.html` (no server; some APIs may behave differently).
- No build or package install is required.

## Coding Style & Naming Conventions
- JavaScript: 2‑space indent, semicolons, single quotes, `const/let`, camelCase for variables/functions. Keep functions small and pure where possible.
- DOM: IDs/classes in kebab‑case (e.g., `#theme-toggle`, `.score-wrap`). Reuse `$`/`$$` helpers for selection.
- CSS: Use existing CSS variables in `:root`; prefer utility‑like, lowercase class names. Preserve dark/light theme tokens.
- HTML: Maintain the strict CSP in the `<meta http-equiv="Content-Security-Policy">` tag; update `connect-src` only when introducing new endpoints.

## Testing Guidelines
- Manual cross‑browser check (Chromium, Firefox, Safari/iOS). Verify:
  - Tab switching, theme toggle, JSON copy.
  - Simple/Advanced panels render without console errors.
  - External lookups (ipify/ipapi) fail gracefully offline.
- Optional: add lightweight unit tests only if code is modularized; keep runner dependency‑free.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `style:`, `chore:`.
- Commits: small, focused, with a clear imperative subject (<= 72 chars).
- PRs: include summary, rationale, before/after screenshots for UI, and any CSP or external‑request changes. Link related issues.

## Security & Configuration Tips
- Do not transmit fingerprint data to servers; this project is educational and client‑only. External calls are limited to ipify/ipapi. Keep timeouts and error handling robust.
- Avoid adding analytics/trackers. If absolutely required, document the privacy impact and update the CSP.

## Agent‑Specific Notes
- Scope: these rules apply repo‑wide. Prefer minimal diffs, no frameworks, and no build tooling. Align with `CLAUDE.md` architecture notes when extending features.
