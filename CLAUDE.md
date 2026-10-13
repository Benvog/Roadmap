# Vektor

A personal life-areas roadmap: areas → goals → milestones → tasks, habits per area, and targets
(e.g. KES 100,000 in 12 months) fed by linked paths and funding from any source.
Read `docs/PRD.md` for the why and scope, and `docs/PLAN.md` for where the build is.

## Where things stand (2026-10-13)
- The app is built, live at https://benvog.github.io/Roadmap/, and installed on the user's phone from the home
  screen. Everything is committed and pushed.
- Done: the design (Phase 1), the database and sign-in (Phase 2), the whole core app (Phases 3 and 4: the map,
  goal roads with milestones and tasks, habits, logging amounts, funding locked milestones), the deploy and the
  home-screen install (Phase 5).
- Left, in the order recommended to the user:
  1. **View offline.** Keep the last loaded data on the device and show it, read-only, with an "offline" note
     when there is no connection. Keep the copy per account and clear it on sign-out (see "Security"). The
     service worker already makes the app itself open offline; with no connection it currently reaches
     "Your map could not be loaded". `loadAll` in `store.js` and `load` in `app.js` are where this goes, and
     every change (`create`, `change`, `destroy`, check-ins) must be refused with a clear message while offline.
  2. **List view** of areas as a second view. `mockups/areas-map.html` is the old mockup; it is still green.
  3. **Accessibility check** with no problems, in light and dark at phone width. Not started. No tool is set up
     for it yet.
  4. **Check every "Done looks like" item in the PRD** on the phone and the PC.
- Waiting on the user: feedback from using the app on the phone. They said nothing looked out of place but
  want more time with it before commenting. Ask before assuming there is none.
- Undecided or unconfirmed: whether to rename the repo to `vektor` (it would change the site address and the
  Supabase settings); whether new sign-ups were switched off in Supabase; whether past days should be editable
  for habit check-ins.

## Stack
- Static site: plain HTML, CSS and JavaScript (ES modules), no build step.
- Supabase (free tier) for the database and sign-in, with row-level security so each user only sees their own rows.
- `supabase-js` is a pinned copy in `js/vendor` (see its README), loaded by `index.html` as `window.supabase`.
  Do not load code from a CDN at run time. Google Fonts (a stylesheet) is the only outside resource.
- Sign-in is by email and password (`signInWithPassword` in `store.js`). A password is set from the account
  sheet (`openPassword` in `app.js`). An emailed link is the fallback for an account with no password yet; it
  uses the PKCE flow, so it only works in the browser that asked for it, and on a phone the email app often
  opens links elsewhere. Decided on 2026-10-13 after that failed on the phone. A code typed from the email was
  tried and dropped: Supabase's built-in email cannot be edited to include a code without custom SMTP.
- Hosted on GitHub Pages at https://benvog.github.io/Roadmap/ (public repo `Benvog/Roadmap`, pushed over SSH;
  Pages deploys the `main` branch root about a minute after a push). The capital R matters: the lowercase
  address is a 404, and Supabase must be given the address with the capital R.
- Installable to the home screen: `manifest.webmanifest`, PNG icons in `assets/` (drawn by `tools/make_icons.py`,
  which must be kept in step with `assets/icon.svg`), and the service worker `sw.js`.

## Files
- `index.html`, `css/app.css`: the app shell and styles. Tokens at the top of `app.css` match "Look" below.
- `js/main.js`: starts the app, registers the service worker, and switches between the sign-in screens and the
  app as people sign in and out.
- `js/signin.js`: the sign-in screens (email and password, or an emailed link). The store is passed in.
- `js/app.js`: the signed-in app. `startApp(root, user, store)` loads the data, runs the map and the roads, and
  owns every add, edit and delete, the sheets and the forms. The store is passed in, so tests can run the real
  app with a stand-in.
- `js/map.js`: the map itself (layout, the opening motion, the camera, pan and zoom). It only draws and reports taps.
- `js/road.js`: a goal's road (header, goal chips, progress card, the winding road of stops). It only draws and
  reports taps too; the milestone sheet and its saving live in `app.js`.
- `js/model.js`: works things out from the flat lists (an area's goals, a target's paths, progress, totals,
  milestone states, habit streaks and weeks) and `removeLocal`, which mirrors the database's cascade when a row
  is deleted. Pure functions, checked by `tests/model.test.mjs`.
- `js/session.js`: reads how a session began from its token, to decide whether to ask for the current password.
- `js/ui.js`: `esc`, `amount`, `niceDate`, icons, and the bottom sheet with its forms (`openForm`).
- `js/store.js`: the only module that talks to Supabase. Sign-in functions, then `loadAll` (flat lists keyed by
  table name), `add`, `update`, `remove`, `checkIn`, `undoCheckIn`.
- `js/config.js`: the Supabase project URL and publishable key. Both are public by design.
- `sw.js`: the service worker. For the app's own files only (the page and anything under `js/`, `css/`, `assets/`)
  it asks the server for the current copy every time and falls back to the last copy it kept when offline. It
  never handles Supabase requests and stores no account data. A new file the app needs offline must be added to
  its `SHELL` list. `main.js` registers it everywhere except localhost, where it needs `?sw=1`.
- `manifest.webmanifest`: the name, icons and full-screen setting a phone uses when the app is installed.
- `assets/icon.svg`: the app icon. The PNGs beside it are generated from the same shapes by `tools/make_icons.py`.
- `tools/serve.py`: the local server (see "Run locally"). `tools/make_icons.py`: redraws the PNG icons (needs Pillow).
- `supabase/schema.sql` and `supabase/2026-10-12-same-owner.sql`: the scripts that created the database.
  Both have been run. Change the schema by adding a new dated script and having the user run it in the
  Supabase SQL editor; never edit a script that has already been run.
- `docs/DATA-MODEL.md`: the eight tables, the rules, and what is calculated instead of stored.
- `tests/`: see "Testing".
- `mockups/`: the prototype and earlier design options (see "Mockups").

## Run locally
- `"%LOCALAPPDATA%\Programs\Python\Python313\python.exe" tools/serve.py` from the repo root,
  then open http://localhost:8000. (Plain `python` is broken on this PC.) Node 24 is installed and is
  handy for `node --check <file>`. A server started by one session stops when that session ends; start it again.
- Use `tools/serve.py`, not `python -m http.server`: it tells the browser not to keep copies of files. With the
  plain server, Chrome kept an old `store.js` for hours while loading a new `app.js`, so a new function was
  missing and the app reported a failed save. If something that passes the tests fails in the user's browser
  right after a change, suspect a stale file first and ask for a hard refresh (Ctrl+Shift+R).
- On the live site the service worker prevents that: it re-checks every app file with the server on each load.
  The first load after the service worker itself changes can still use the old worker once.
- The user is signed in on this PC at http://localhost:8000 and on their phone, with their real data in both.
- Sign-in links only return to addresses allowed in Supabase (Authentication, URL Configuration):
  `http://localhost:8000/**` and `https://benvog.github.io/Roadmap/**`. Password sign-in does not depend on this.
- Supabase's built-in email only sends a few sign-in emails an hour. Several tries in a row lock sign-in out for
  a while ("Too many sign-in emails"); the only fix is to wait.

## Testing
All three scripts run from Git Bash, start and stop their own server and headless browser, and exit 1 on a problem.
- `bash tests/run.sh` runs `model.test.mjs` with Node, then `drive.html`, which drives the real app and the
  real sign-in screens through `app.html` and `signin.html` using stand-in stores, and prints what each scenario
  saw. It takes about a minute and a half. Read the printed lines, not only the last one: a scenario prints
  what it found without judging it (the script only fails on errors and on tell-tale text such as `[object`,
  `undefined`, `NaN` or `Invalid Date`). Add steps to `tests/drive.html` for each new feature, and run it before
  every commit.
- `bash tests/load.sh` loads the real page (the one that talks to Supabase) and checks the sign-in screen draws.
  `run.sh` cannot notice the real page failing to start, such as a bad import in `main.js` or `store.js`; this
  does. Run it before every commit too. A leftover import of a deleted file once broke the app in a commit.
- `bash tests/offline.sh` checks the service worker on a temp copy of the app: it installs, the app opens with
  the server stopped, and a changed file replaces the kept copy. Run it when `sw.js` or the list of files changes.
- `tests/fake-store.js` is the in-memory stand-in for `store.js`; give it any new function `store.js` gains.
  `tests/app.html` can be opened by hand to see the app without signing in (`?seed=1` adds a target with paths,
  `?seed=2` also adds milestones, tasks, a part-funded locked deposit and habits with some history;
  `?areas=empty`, `?fail=1`, `?theme=dark`). `tests/signin.html` does the same for sign-in (the right password is
  "correct horse").
- Phone-width screenshots: headless Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe
  --headless=new`) will not go narrower than about 500px, so `tests/shot.html` loads a test page in a 390px frame
  and taps through a list of things. With the local server running:
  `msedge --headless=new --disable-gpu --hide-scrollbars --window-size=390,844 --virtual-time-budget=30000
  --screenshot=<file.png> "http://127.0.0.1:8000/tests/shot.html?q=theme%3Dlight%26seed%3D2&taps=you,area:Money"`.
  Look at light and dark for anything new.
- `--virtual-time-budget` with `--dump-dom` is unreliable for checking that a page drew: it sometimes dumps
  before the page has drawn. Use the scripts above, which wait in real time. It is fine for screenshots.
- Do not leave headless browsers running: several at once made loads take six to eight seconds and looked like
  a bug.
- Anything that needs the user's login cannot be run from here: only their browser holds their session. Ask
  them to try it at http://localhost:8000 before committing. For a check with many steps, add a temporary
  button on the signed-in screen that runs it and lists Pass or Fail lines, then remove it.
- After removing temporary code, search for every reference to it and run `tests/load.sh`.
- Long Bash commands that carry JavaScript or HTML in a heredoc have failed to parse here several times
  ("unexpected EOF while looking for matching quote"); the exact cause is unknown. Create or patch such files with
  the Write tool (for a patch, write a small Python script to the scratchpad and run it) instead of a heredoc.

## Rules
- Mobile-first: design at 360–430px wide first, then check desktop.
- Light and dark themes; accent colour for actions, selection and highlights only.
- Money shows as `KES 100,000`. Targets can also count non-money things (books, kg); the forms only offer KES so far.
- All Supabase calls go through `js/store.js` so the data layer can change in one place.
- Anything a user typed is escaped before it goes into HTML (`esc` in `js/ui.js`). `openForm` and `sheetHead`
  escape what they are given.
- Habits are daily or a number of times a week (`times_per_week`, 7 means daily), chosen with "How often" in the
  add and edit forms. `habitStatus` in `model.js` works out done today, this week's count and the streak; weeks
  run Monday to Sunday and a week still in progress does not break a weekly streak. A check-in is for today on
  the device (`model.localDay()`); past days cannot be changed. Each habit is edited on its own (the pencil on
  its row), not all in one form as in the prototype, because each now has its own "how often".
- Offline is to be view-only: the last loaded data is kept on the device and shown with an "offline" note;
  changes need a connection.
- No reminders, charts/history or sharing in v1 (see PRD "Not building").

## Security
- A background security review runs on each commit and has found real issues six times. Its findings arrive as
  a notice after the commit. Treat them as work to do: explain the finding to the user in plain terms, fix it,
  say what was tested, and ask before pushing the fix.
- Decisions that came from it: child rows must share their parent's owner (composite foreign keys);
  sign-in links use PKCE; no third-party code is fetched at run time; when the signed-in account changes, the
  running app is stopped before the next one starts, and closing the sheet empties it. Anything kept on the
  device for one account (the offline copy, when it is built) must be kept per account and cleared on sign-out.
- Changing a password asks for the current one unless the session clearly began with an emailed link
  (`needsCurrentPassword` in `js/session.js`, checked in `tests/model.test.mjs`). That link is the recovery route
  for a forgotten password. Any decision like this must fail closed: a missing, unreadable or unfamiliar
  answer means "ask". This check is in the app; Supabase's own "Secure password change" setting enforces it on
  the server, and the user turned it on on 2026-10-13.
- Everything in the repo is published on the live site, including `tests/` and `mockups/`. A page there runs on
  the same address as the real app and can reach a signed-in person's session. So a test page must never load
  a path taken from its address, and the pages that script taps or drive the real page (`tests/shot.html`,
  `tests/drive.html`, `tests/offline.html`, `tests/load.html`) refuse to run anywhere but localhost.
- New sign-ups can be switched off in Supabase (Authentication, Sign In / Providers). Recommended to the
  user for a personal app; not confirmed done.
- Never ask for or store the Supabase `service_role` key or the database password.

## How the app is put together
- `main.js` decides between the sign-in screens and the app. `app.js` owns the data in memory (`data`, the flat
  lists from `store.loadAll()`), every add, edit and delete, and the forms. `map.js` and `road.js` only draw
  `data` and call back. `showScreen` in `app.js` switches between the map (fixed, pans itself) and a road
  (an ordinary scrolling page); the map keeps its state while a road is showing.
- A change is saved first, then applied to `data`, then the screen is redrawn (`create`, `change`, `destroy` and
  `refresh` in `app.js`). If the save fails, the form stays open with a message and nothing changes on screen;
  the real error goes to the browser console.
- A goal row plays one of three roles (`kindOf` in `model.js`): a plain goal, a target (it has a
  `target_amount` and unfolds its paths on the map), or a path (it has a `parent_id`). Tapping a plain goal or a
  path opens its road; the pencil in the road's header edits it.
- Marking a milestone done ticks its tasks; marking it not done clears them; ticking the last task finishes the
  milestone and unticking one reopens it; adding a task to a finished milestone reopens it.
- Money: an entry is logged on a path (`openLog`), dated today, and adds to that path's total and its target's.
  A milestone with a `fund_amount` is locked until its funding rows add up to it (`fundingBox`, `openFund`);
  funding names the path it came from or is "Other cash", and never reduces a path's earnings. Clearing a
  milestone's funding amount leaves its funding rows in the database, hidden; they show again if an amount is set.
- A "Remove" button on an entry or a funding row asks once: the first tap changes it to "Really remove?" (`armed`).
- A form's `onSubmit` can throw `FormError('message')` (from `ui.js`) to show a specific message, such as a bad amount.
- Map nodes are rebuilt on every draw and animated from where they were (`shown` in `map.js`). Node ids are the
  row ids; the small "+", pencil and Habits nodes are the parent's id plus `-add`, `-edit` or `-habits`.
- The Today strip under the map and each area's Habits sheet both check a habit in for today (`toggleHabit`).

## Workflow
- Follow `docs/PLAN.md`: one small task at a time, show the result, wait for approval,
  then tick it off and commit. Push only when told "push".
- The routine that has worked for every feature: build it, extend `tests/drive.html`, run the tests, look at
  phone-width screenshots, then ask the user to try it signed in at http://localhost:8000 before committing.
  After a push, check the live site has the change (it takes about a minute) and tell the user what to try on
  the phone.
- Keep this file, the PLAN and the PRD's Decisions current at each step.
- For a choice that is easier to judge by seeing it (motion, colour, type, icon), the user prefers all the
  options built into the mockup behind a temporary switch, then the switch and the losers removed.
- The user reads the result, not the code. Say what to open and tap, what was checked and what was not, and
  what a setting does before asking them to change it. When something they were told to do fails, find out
  why before suggesting a retry: twice the cause was a wrong instruction (a lowercase address, a locked
  Supabase screen), not anything they did.

## Mockups
- `mockups/prototype.html` is the interactive prototype with sample data: the branching map, journey roads,
  habits, logging, add and edit flows, the opening motion and the zoom camera. It was the reference for how
  the real app looks and behaves, and the real app has now caught up with it.
  Open it in a browser, or serve the repo and open `/mockups/prototype.html`.
- The same page is published privately at https://claude.ai/artifact/KC5KC9HxN1Eziw3dtz1DLM.
  To update it, publish the file without its first two lines (the doctype and `<html>`/meta line) to that URL.
- `mockups/icons.html` shows the four icon options that were compared (also at
  https://claude.ai/artifact/JCpeZmNsWPgisjTmSLPBFx).
- `mockups/areas-map.html` is the earlier list of areas, kept as the future List view. It still uses the
  earlier green and needs the amber tokens when it becomes the List view.

## Look
- Accent: amber on warm neutrals. Chosen from four palettes tried side by side on 2026-10-12.
- Name: Vektor (direction plus force). The folder is `D:\Roadmap` and the GitHub repo is `Roadmap`.
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
