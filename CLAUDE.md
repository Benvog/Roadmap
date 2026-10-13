# Vektor

A personal life-areas roadmap: areas → goals → milestones → tasks, habits per area, and targets
(e.g. KES 100,000 in 12 months) fed by linked paths and funding from any source.
Read `docs/PRD.md` for the why and scope, and `docs/PLAN.md` for where the build is.

## Where things stand (2026-10-13)
- Phase 1 (design) is done: every screen and behaviour is decided and mocked in `mockups/prototype.html`.
- Phase 2 (data and setup) is done except view-offline, which waits until a screen shows real data.
- The real app so far is sign-in, the data layer, the map (You, areas, goals, targets and paths), a goal's
  road with milestones and tasks, habits (the Habits node, the Today strip, check-ins and streaks), logging
  amounts on a path, and funding a locked milestone. All of it saves to Supabase.
- Phase 3 goes in slices: You and areas (done); goals, targets and paths (done); a goal's road with milestones
  and tasks (done); habits (done); logging and funding (done). Port behaviour
  from the prototype, do not redesign it.
- Each slice has gone the same way and should keep doing so: build it, extend `tests/drive.html`, run
  `bash tests/run.sh`, look at phone-width screenshots, then ask the user to try it signed in at
  http://localhost:8000 before committing.
- Not yet in the real app: the List view, view-offline, and everything in Phase 5 (installing to the home
  screen, the GitHub Pages deploy, the accessibility check).

## Stack
- Static site: plain HTML, CSS and JavaScript (ES modules), no build step.
- Supabase (free tier) for the database and email sign-in links, with row-level security
  so each user only sees their own rows.
- `supabase-js` is a pinned copy in `js/vendor` (see its README), loaded by `index.html` as `window.supabase`.
  Do not load code from a CDN at run time. Google Fonts (a stylesheet) is the only outside resource.
- Sign-in is by email and password (`signInWithPassword` in `store.js`). A password is set from the account
  sheet (`openPassword` in `app.js`). An emailed link is the fallback for an account with no password yet; it
  uses the PKCE flow, so it only works in the browser that asked for it, and on a phone the email app often
  opens links elsewhere. Decided on 2026-10-13 after that failed on the phone. A code typed from the email was
  tried and dropped: Supabase's built-in email cannot be edited to include a code without custom SMTP.
- Hosted on GitHub Pages at https://benvog.github.io/Roadmap/ (public repo `Benvog/Roadmap`, pushed over SSH). The
  capital R matters: the lowercase address is a 404, and Supabase must be given the address with the capital R.
  Installable as a PWA (not built yet).

## Files
- `index.html`, `css/app.css`: the app shell and styles. Tokens at the top of `app.css` match "Look" below.
- `js/main.js`: starts the app and switches between the sign-in screens and the app as people sign in and out.
- `js/signin.js`: the sign-in screens (email and password, or an emailed link). The store is passed in, as with `app.js`.
- `js/app.js`: the signed-in app. `startApp(root, user, store)` loads the data, runs the map and handles adding and
  editing. The store is passed in, so tests can run the real app with a stand-in.
- `js/map.js`: the map itself (layout, the opening motion, the camera, pan and zoom). It only draws and reports taps.
- `js/road.js`: a goal's road (header, goal chips, progress card, the winding road of stops). It only draws and
  reports taps too; the milestone sheet and its saving live in `app.js`.
- `js/model.js`: works things out from the flat lists (an area's goals, a target's paths, progress, totals) and
  `removeLocal`, which mirrors the database's cascade when a row is deleted. Checked by `tests/model.test.mjs`.
- `js/ui.js`: `esc`, icons, and the bottom sheet with its forms (`openForm`).
- `tests/`: `run.sh` runs `model.test.mjs` with Node, then `drive.html`, which drives the real app through
  `app.html` using `fake-store.js` (an in-memory stand-in for `store.js`). `tests/app.html` can also be opened by
  hand to see the app without signing in (`?seed=1` adds a target with paths, `?seed=2` also adds milestones,
  tasks, a part-funded locked deposit and habits with some history). `tests/signin.html` does the same for the sign-in screens (the right
  password is "correct horse"). `tests/shot.html` taps through a list of things inside a 390px frame, for phone-width screenshots.
- `js/store.js`: the only module that talks to Supabase. Sign-in functions, then `loadAll`, `add`, `update`,
  `remove`, `checkIn`, `undoCheckIn`. `loadAll` returns flat lists keyed by table name; nothing computes totals yet.
- `js/config.js`: the Supabase project URL and publishable key. Both are public by design.
- `supabase/schema.sql` and `supabase/2026-10-12-same-owner.sql`: the scripts that created the database.
  Both have been run. Change the schema by adding a new dated script and having the user run it in the
  Supabase SQL editor; never edit a script that has already been run.
- `docs/DATA-MODEL.md`: the eight tables, the rules, and what is calculated instead of stored.
- `assets/icon.svg`: the app icon.
- `mockups/`: the prototype and earlier design options (see "Mockups").

## Run locally
- `"%LOCALAPPDATA%\Programs\Python\Python313\python.exe" tools/serve.py` from the repo root,
  then open http://localhost:8000. (Plain `python` is broken on this PC.) Node 24 is installed and is
  handy for `node --check <file>`.
- Use `tools/serve.py`, not `python -m http.server`: it tells the browser not to keep copies of files. With the
  plain server, Chrome kept an old `store.js` for hours while loading a new `app.js`, so a new function was
  missing and the app reported a failed save. If something that passes the tests fails in the user's browser
  right after a change, suspect a stale file first and ask for a hard refresh (Ctrl+Shift+R).
- The live site has the same risk for about ten minutes after a push (GitHub Pages lets browsers keep files that
  long). The service worker planned for the home-screen install should load each new version as a whole.
- Sign-in links only return to addresses allowed in Supabase (Authentication, URL Configuration):
  `http://localhost:8000/**` and `https://benvog.github.io/Roadmap/**`. Password sign-in does not depend on this.
- Supabase's built-in email only sends a few sign-in emails an hour. Several tries in a row lock sign-in out for
  a while ("Too many sign-in emails"); the only fix is to wait.

## Testing
- `bash tests/run.sh` (Git Bash) runs the real app in headless Edge against a stand-in store and prints what each
  scenario saw. Read the printed lines, not only the last one: a scenario prints what it found without judging it
  (the script only fails on errors and on tell-tale text such as `[object`, `undefined`, `NaN` or `Invalid Date`). It starts and stops its own server and browser, and exits 1 on a problem. Add steps to
  `tests/drive.html` for each new slice, and run it before every commit.
- Headless Edge is `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe --headless=new`.
- Long Bash commands that carry JavaScript or HTML in a heredoc have failed to parse here three times
  ("unexpected EOF while looking for matching quote"); the exact cause is unknown. Create or patch such files with
  the Write tool (for a patch, write a small Python script and run it) instead of a heredoc.
- Headless Edge will not go narrower than about 500px. For a phone-width screenshot, load the page in a
  390px-wide iframe from a small same-origin wrapper page and screenshot that.
- `--virtual-time-budget` with `--dump-dom` is unreliable for this app: it sometimes dumps before the page
  has drawn, and reports a blank page that is fine in a real browser. For a load check that can be trusted,
  open a wrapper page that polls the iframe in real time and reports back with a `fetch` to the local server
  (the result shows in the server log), then stop the browser process. Do not leave headless browsers
  running: several at once made loads take six to eight seconds and looked like a bug.
- Anything that needs a login cannot be run from here: only the user's browser holds their session.
  The pattern that has worked: add a temporary button on the signed-in screen that runs the check as the
  user and lists Pass or Fail lines, ask the user to click it, then remove it.
- After removing temporary code, search for every reference to it and run the load check before committing.
  A leftover import of a deleted file once broke the app in a commit.

## Rules
- Mobile-first: design at 360–430px wide first, then check desktop.
- Light and dark themes; accent colour for actions, selection and highlights only.
- Money shows as `KES 100,000`. Targets can also count non-money things (books, kg).
- All Supabase calls go through `js/store.js` so the data layer can change in one place.
- Anything a user typed is escaped before it goes into HTML (`esc` in `js/ui.js`). `openForm` and `sheetHead` escape what they are given.
- Habits are daily or a number of times a week (`times_per_week`, 7 means daily), chosen with "How often" in the
  add and edit forms. `habitStatus` in `model.js` works out done today, this week's count and the streak; weeks
  run Monday to Sunday and a week still in progress does not break a weekly streak. A check-in is for today on
  the device (`model.localDay()`); past days cannot be changed. Each habit is edited on its own (the pencil on
  its row), not all in one form as in the prototype, because each now has its own "how often".
- Offline is view-only: the last loaded data is kept on the device and shown with an "offline" note;
  changes need a connection.
- No reminders, charts/history or sharing in v1 (see PRD "Not building").

## Security
- A background security review runs on each commit and has found real issues four times. Treat its
  findings as work to do: explain the finding to the user in plain terms, fix it, and say what was tested.
- Decisions that came from it: child rows must share their parent's owner (composite foreign keys);
  sign-in uses PKCE; no third-party code is fetched at run time; when the signed-in account changes, the running
  app is stopped before the next one starts, and closing the sheet empties it. Anything kept on the device for
  one account (the offline copy, when it is built) must be kept per account and cleared on sign-out.
- New sign-ups can be switched off in Supabase (Authentication, Sign In / Providers). Recommended to the
  user for a personal app; not confirmed done.
- Never ask for or store the Supabase `service_role` key or the database password.

## How the app is put together
- `main.js` decides between the sign-in screens and the app. `app.js` owns the data in memory (`data`, the flat
  lists from `store.loadAll()`), every add, edit and delete, and the forms. `map.js` and `road.js` only draw
  `data` and call back. `showScreen` in `app.js` switches between the map (fixed, pans itself) and a road
  (an ordinary scrolling page); the map keeps its state while a road is showing.
- A change is saved first, then applied to `data`, then the screen is redrawn (`create`, `change`, `destroy` and
  `refresh` in `app.js`). If the save fails, the form stays open with a message and nothing changes on screen.
- Marking a milestone done ticks its tasks; marking it not done clears them; ticking the last task finishes the
  milestone and unticking one reopens it; adding a task to a finished milestone reopens it.
- Money: an entry is logged on a path (`openLog`), dated today, and adds to that path's total and its target's.
  A milestone with a `fund_amount` is locked until its funding rows add up to it (`fundingBox`, `openFund`);
  funding names the path it came from or is "Other cash", and never reduces a path's earnings. Clearing a
  milestone's funding amount leaves its funding rows in the database, hidden; they show again if an amount is set.
- A "Remove" button on an entry or a funding row asks once: the first tap changes it to "Really remove?" (`armed`).
- A form's `onSubmit` can throw `FormError('message')` (from `ui.js`) to show a specific message, such as a bad amount.
- Map nodes are rebuilt on every draw and animated from where they were (`shown` in `map.js`). Node ids are the
  row ids; the small "+" and pencil nodes are the parent's id plus `-add` or `-edit`.

## Workflow
- Follow `docs/PLAN.md`: one small task at a time, show the result, wait for approval,
  then tick it off and commit. Push only when told "push".
- Keep this file, the PLAN and the PRD's Decisions current at each step.
- For a choice that is easier to judge by seeing it (motion, colour, type, icon), the user prefers all the
  options built into the mockup behind a temporary switch, then the switch and the losers removed.

## Mockups
- `mockups/prototype.html` is the interactive prototype with sample data: the branching map, journey roads,
  habits, logging, add and edit flows, the opening motion and the zoom camera. It is the reference for how
  the real app should look and behave.
  Open it in a browser, or serve the repo and open `/mockups/prototype.html`.
- The same page is published privately for phone testing at https://claude.ai/artifact/KC5KC9HxN1Eziw3dtz1DLM.
  To update it, publish the file without its first two lines (the doctype and `<html>`/meta line) to that URL.
- `mockups/icons.html` shows the four icon options that were compared (also at
  https://claude.ai/artifact/JCpeZmNsWPgisjTmSLPBFx).
- `mockups/areas-map.html` is the earlier list of areas, kept as the future List view. It still uses the
  earlier green and needs the amber tokens when it becomes the List view.

## Look
- Accent: amber on warm neutrals. Chosen from four palettes tried side by side on 2026-10-12.
- Name: Vektor (direction plus force). The folder and GitHub repo are still called `roadmap`.
- Icon: `assets/icon.svg`, a centre node with three branches (You and your areas), ink #1a1206 on an amber #ffb454 tile. The amber tile was my default; the dark-tile variant is in `mockups/icons.html`.
- Type: Manrope (weights 500 to 800) for everything, with a system sans fallback. Kept after trying four alternatives on 2026-10-12.
- Tokens (light / dark), as defined at the top of `css/app.css` and `mockups/prototype.html`:
  - `--bg` #f7f5f1 / #13110e, `--surface` #ffffff / #1c1915, `--line` #ddd8ce / #343029
  - `--text` #201b14 / #f0ece5, `--muted` #655d50 / #aaa294, `--track` #e9e4da / #2c2822
  - `--accent` #9c5200 / #ffb454, `--on-accent` #ffffff / #1a1206, `--accent-soft` #f8ead6 / #3a2a10
  - `--danger` #b3261e / #f2b8b5, `--on-danger` #ffffff / #3b0b08
- Light-theme accent is a burnt orange on purpose: a bright amber fails contrast as text and behind white labels.
- Every text pair is at least 4.5:1 (worst is accent on accent-soft in light, 4.9:1).
- Motion: You pulses until the map is opened; a line draws out of the parent and each node pops in when its
  line arrives; the overview sits zoomed out (0.82) and opening an area travels in to full size, closing it
  travels back.
