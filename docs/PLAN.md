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
- [ ] Journey road per goal: milestones as stops, tasks in the milestone sheet, roll-up progress and due dates
- [ ] List view of areas
- [ ] Habits with check-ins and streak counts, daily or a number of times a week (with a "how often" choice in the add and edit forms)

## Phase 4: Targets and paths
- [ ] Number targets on goals; log amounts with a note
- [ ] Paths: link goals to a target; "next step" per path
- [ ] Funding targets on milestones, filled from linked paths or other cash; lock/unlock

## Phase 5: Ship
- [ ] PWA: manifest, icon, install to home screen
- [ ] GitHub repo + Pages deploy
- [ ] Check every "Done looks like" item in the PRD on phone and PC
- [ ] Accessibility check (no problems) in light and dark at phone width
