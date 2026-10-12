# Build plan

One task at a time: do it, show it, get approval, tick it, commit. See `docs/PRD.md` for scope.

## Phase 1: Design (mockups, no app code)
- [x] Areas map home screen (phone width, light + dark): list version mocked in `mockups/areas-map.html`, kept as the List view
- [x] Choose the explorable map style from `mockups/index.html`: chose both (branching map home, journey road per goal)
- [x] Habits: a "Today" strip under the map plus a Habits node in each area (mocked in `mockups/prototype.html`)
- [x] Target view: amounts are logged on each path's road ("Log amount" with a note and a list of entries) and roll up to the KES 100,000 total (mocked in `mockups/prototype.html`)
- [ ] Add/edit flows: area, goal, milestone, task, habit, logging an amount
- [ ] Settle look: colours, type, name and icon; write them into CLAUDE.md

## Phase 2: Data and setup
- [ ] Data model (tables and links) written here and approved
- [ ] Create Supabase project; tables + row-level security
- [ ] Magic-link sign-in working locally
- [ ] `js/store.js` data layer

## Phase 3: Core app
- [ ] Branching map home: pan and zoom, unfold areas and goals; add, rename, reorder, remove areas; progress per area
- [ ] Journey road per goal: milestones as stops, tasks in the milestone sheet, roll-up progress and due dates
- [ ] List view of areas
- [ ] Habits with check-ins and streak counts

## Phase 4: Targets and paths
- [ ] Number targets on goals; log amounts with a note
- [ ] Paths: link goals to a target; "next step" per path
- [ ] Funding targets on milestones, filled from linked paths or other cash; lock/unlock

## Phase 5: Ship
- [ ] PWA: manifest, icon, install to home screen
- [ ] GitHub repo + Pages deploy
- [ ] Check every "Done looks like" item in the PRD on phone and PC
- [ ] Accessibility check (no problems) in light and dark at phone width
