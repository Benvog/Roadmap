# Build plan

One task at a time: do it, show it, get approval, tick it, commit. See `docs/PRD.md` for scope.

## Phase 1: Design (mockups, no app code)
- [x] Areas map home screen (phone width, light + dark): list version mocked in `mockups/areas-map.html`, kept as the List view
- [x] Choose the explorable map style from `mockups/index.html`: chose both (branching map home, journey road per goal)
- [x] Habits: a "Today" strip under the map plus a Habits node in each area (mocked in `mockups/prototype.html`)
- [x] Target view: amounts are logged on each path's road ("Log amount" with a note and a list of entries) and roll up to the KES 100,000 total (mocked in `mockups/prototype.html`)
- [x] Add flows: a "+" at the end of each branch for area, goal, path, milestone, task and habit (mocked in `mockups/prototype.html`)
- [x] Edit flows: a pencil on an unfolded area or target, on a road's header, and Edit in the milestone and habits sheets, for rename, due date, moving an area and delete with a confirmation (mocked in `mockups/prototype.html`)
- [x] You opens and folds the map: the app starts on You alone, a tap opens the areas, another tap folds everything back (mocked)
- [x] Motion: You pulses until the map is opened; lines draw out of the parent and each node pops in when its line arrives; the camera sits zoomed out on the overview, travels in when an area opens and back out when it closes (mocked)
- [x] Settle look: colours, type, name and icon; write them into CLAUDE.md
  - [x] Colour: amber on warm neutrals (burnt orange in light, bright amber in dark); tokens are in CLAUDE.md
  - [x] Type: Manrope throughout (kept after trying Bricolage Grotesque, Plus Jakarta Sans, Outfit and a mix)
  - [x] Name: Vektor
  - [x] Icon: a node with three branches (You and your areas), dark on an amber tile, saved as `assets/icon.svg`; the four options are in `mockups/icons.html`

## Phase 2: Data and setup
- [x] Data model (tables and links): approved, in `docs/DATA-MODEL.md`
- [x] Create Supabase project; tables + row-level security (`supabase/schema.sql` run on 2026-10-12; project details in `js/config.js`)
- [x] Magic-link sign-in working locally (`index.html`, `css/app.css`, `js/main.js`, `js/store.js`). Signed in on the PC on 2026-10-12, and a signed-in database check passed: own rows save and read back, a row under another login and a goal under a foreign area are refused, and deleting an area removes its goal
- [x] `js/store.js` data layer (`loadAll`, `add`, `update`, `remove`, `checkIn`, `undoCheckIn`). A signed-in check passed on 2026-10-12: one of everything saved, loaded back linked, edited, and removed by deleting its area
- [ ] View offline (do this after the map shows real data, so it can be seen and tested; keep the saved copy per account and clear it on sign-out): keep a copy of the last loaded data on the device and show it, read-only, with an "offline" note when there is no connection

## Phase 3: Core app
- [x] Branching map home, slice 1: You and areas on real data (pan, zoom, the opening motion and zoom camera; add, rename, move and delete areas; a starter set for an empty map). Passing `tests/run.sh` and tried signed in on the PC on 2026-10-12
- [x] Branching map home, slice 2: goals, targets and paths inside an area, and progress per area. Passing `tests/run.sh` and tried signed in on the PC on 2026-10-12. Until the road exists, tapping a goal or path opens its edit form (name, due date, delete)
- [x] Journey road per goal (slice 3): milestones as stops, tasks in the milestone sheet, roll-up progress and due dates. Passing `tests/run.sh` and tried signed in on the PC on 2026-10-13
- [ ] List view of areas
- [x] Habits (slice 4): a Habits node in each area, the Today strip under the map, check-ins and streaks, daily or a number of times a week with a "how often" choice. Passing `tests/run.sh` and tried signed in on the PC on 2026-10-13

## Phase 4: Targets and paths
- [x] Number targets on goals (done with slice 2: a goal with an amount is a target, and its paths' totals add up to it)
- [x] Paths: link goals to a target (done with slice 2); the next step per path is the "You are here" stop on its road (slice 3)
- [x] Log amounts with a note (slice 5): "Log amount" on a path's road, a list of what was logged, and removing an entry. Passing `tests/run.sh` and tried signed in on the PC on 2026-10-13
- [x] Funding targets on milestones (slice 5): a milestone can need funding, stays locked until it is funded from any path or other cash, and unlocks. Passing `tests/run.sh` and tried signed in on the PC on 2026-10-13

## Phase 5: Ship
- [ ] PWA: manifest, icon, install to home screen
- [x] GitHub repo + Pages deploy: live at https://benvog.github.io/Roadmap/ (capital R). Sign-in on the phone failed because the email app opened the link in another browser, so sign-in is now by email and password, with a password set from the account sheet. Passing `tests/run.sh`; a password was set and used on the PC, and the user signed in on the phone, on 2026-10-13
- [ ] Check every "Done looks like" item in the PRD on phone and PC
- [ ] Accessibility check (no problems) in light and dark at phone width
