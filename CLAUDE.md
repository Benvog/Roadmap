# Roadmap

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
