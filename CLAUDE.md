# Vektor

A personal life-areas roadmap: areas → goals → milestones → tasks, habits per area, and targets
(e.g. KES 100,000 in 12 months) fed by linked paths and funding from any source.
Read `docs/PRD.md` for the why and scope, and `docs/PLAN.md` for where the build is.

## Stack
- Static site: plain HTML, CSS and JavaScript (ES modules), no build step.
- Supabase (free tier) for the database and email magic-link login, with row-level security
  so each user only sees their own rows. `supabase-js` loaded from a CDN.
- Hosted on GitHub Pages (public repo). Installable as a PWA.

## Run locally
- `"%LOCALAPPDATA%\Programs\Python\Python313\python.exe" -m http.server 8000` from the repo root,
  then open http://localhost:8000. (Plain `python` is broken on this PC.)
- Phone preview over Wi-Fi: use the PC's LAN IP; the network may need to be set to Private.

## Rules
- Mobile-first: design at 360–430px wide first, then check desktop.
- Light and dark themes; accent colour for actions, selection and highlights only.
- Money shows as `KES 100,000`. Targets can also count non-money things (books, kg).
- All Supabase calls go through one module (`js/store.js`) so the data layer can change in one place.
- No reminders, charts/history or sharing in v1 (see PRD "Not building").

## Workflow
- Follow `docs/PLAN.md`: one small task at a time, show the result, wait for approval,
  then tick it off and commit. Push only when told "push".
- Keep this file, the PLAN and the PRD's Decisions current at each step.

## Mockups
- `mockups/prototype.html` is the interactive prototype (branching map, journey roads, habits, logging, add flows) with sample data. It opens straight on the map.
  Open it in a browser, or serve the repo and open `/mockups/prototype.html`.
- The same page is published privately for phone testing at https://claude.ai/artifact/KC5KC9HxN1Eziw3dtz1DLM.
  To update it, publish the file without its first two lines (the doctype and `<html>`/meta line) to that URL.
- `mockups/areas-map.html` is the earlier list of areas, kept as the future List view.

## Look
- Accent: amber on warm neutrals. Chosen from four palettes tried side by side on 2026-10-12.
- Name: Vektor (direction plus force). The folder and GitHub repo are still called `roadmap`.
- Type: Manrope (weights 500 to 800) for everything, with a system sans fallback. Kept after trying four alternatives on 2026-10-12.
- Tokens (light / dark), as defined at the top of `mockups/prototype.html`:
  - `--bg` #f7f5f1 / #13110e, `--surface` #ffffff / #1c1915, `--line` #ddd8ce / #343029
  - `--text` #201b14 / #f0ece5, `--muted` #655d50 / #aaa294, `--track` #e9e4da / #2c2822
  - `--accent` #9c5200 / #ffb454, `--on-accent` #ffffff / #1a1206, `--accent-soft` #f8ead6 / #3a2a10
  - `--danger` #b3261e / #f2b8b5, `--on-danger` #ffffff / #3b0b08
- Light-theme accent is a burnt orange on purpose: a bright amber fails contrast as text and behind white labels.
- Every text pair is at least 4.5:1 (worst is accent on accent-soft in light, 4.9:1).
- `mockups/areas-map.html` still uses the earlier green and needs these tokens when it becomes the List view.
