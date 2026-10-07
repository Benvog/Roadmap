# Build plan

One task at a time: do it, show it, get approval, tick it, commit. See `docs/PRD.md` for scope.

## Phase 1: Design (mockups, no app code)
- [ ] Areas map home screen (phone width, light + dark)
- [ ] Area screen: goals, milestones, tasks, habits
- [ ] Target screen: KES 100,000 with paths, funding target, locked milestone
- [ ] Add/edit flows: area, goal, milestone, task, habit, logging an amount
- [ ] Settle look: colours, type, name and icon; write them into CLAUDE.md

## Phase 2: Data and setup
- [ ] Data model (tables and links) written here and approved
- [ ] Create Supabase project; tables + row-level security
- [ ] Magic-link sign-in working locally
- [ ] `js/store.js` data layer

## Phase 3: Core app
- [ ] Areas map: list, add, rename, reorder, remove; progress per area
- [ ] Goals → milestones → tasks with roll-up progress and due dates
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
