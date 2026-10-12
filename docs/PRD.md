# Roadmap: PRD

Started 2026-10-07. One page to start; add phases, decisions and a progress log as the project grows.

## Problem
My goals live in my head and scattered notes, so I lose track of them, don't know the next concrete step, drop habits, and can't tell if I'm progressing across my life. Big goals also depend on each other (e.g. remote work funds a trading account, and both feed a yearly income target), and nothing shows me those paths.

## Who it's for
Me, mostly on my phone: checking in on goals and habits through the day.

## Must-haves
<3 to 7 features: the smallest version worth having.>
1. Life areas map as the home screen: an explorable branching map (drag, pinch to zoom) with me in the middle and areas around, each showing its progress. Tapping an area unfolds its goals, a target unfolds its paths, and tapping a goal opens its journey road: milestones as stops along a winding road with a "you are here" marker. A plain list of areas stays as a second view. Areas are my own: I can add, rename, reorder and remove them (starting with Career, Money, Health, Mental). Every area works the same way: goals, milestones, tasks, habits and targets.
2. Inside each area: Goals → Milestones → Tasks, with progress rolling up from tasks.
3. Recurring habits per area, with check-ins.
4. Works well on a phone; installable to the home screen.
5. Data syncs across devices, private to me (login).
6. Optional due dates on goals, milestones and tasks.
7. Targets and paths: a goal can have a number target (e.g. 100,000 in 12 months); other goals plug in as paths, log amounts toward it, and can feed or unlock each other. A milestone can have its own funding target (e.g. the trading deposit) that fills from any source: a linked path like remote work, or money logged from elsewhere (a gift, savings). Each path shows its next step.

## Not building
- Reminders and notifications.
- Charts and history (streak calendars, progress over time); v1 shows current progress and streak counts only.
- Sharing with other people.

## Done looks like
- On my phone I can sign in, add the app to my home screen, and see my areas with their progress.
- I can set up "Make 100,000 in 12 months" with Remote work and Trading as paths, log an amount, and watch the target fill.
- Trading's "Deposit & go live" milestone shows as locked until its deposit amount is funded, from Remote work, other cash I log, or both.
- Ticking a task updates its milestone, goal, area and target progress.
- I can check in a habit and see its streak count.
- A change on my phone shows on my PC after a refresh.
- Light and dark themes both work; automated accessibility check passes at phone width.

## Constraints
- Free tiers only.
- Money in KES.
- Static site (HTML/CSS/JS, no server of our own) hosted on GitHub Pages or Netlify.
- Supabase for the database and email login, with row-level security.
- Mobile-first; light and dark themes.

## Open questions
<What isn't decided yet. Remove each one once it's answered.>
- None yet.

## Decisions
- 2026-10-07: Life-areas map (not goal-only or timeline). Hierarchy Area → Goal → Milestone → Task, plus habits per area.
- 2026-10-07: Hosted with sync (B: static site + Supabase) over a claude.ai Artifact, since it's used on the phone daily and doubles as a portfolio piece.
- 2026-10-07: Home screen is the areas map (not a Today screen or a single focus goal).
- 2026-10-07: v1 keeps due dates; skips reminders, charts/history and sharing.
- 2026-10-07: Big targets with linked paths: goals can have a number target, log amounts, and feed or unlock other goals.
- 2026-10-07: Currency is KES. Funding targets (like the trading deposit) fill from any source, not only a linked path.
- 2026-10-12: Map style is "both": branching map as home, each goal opens as a journey road. Chosen from interactive mockups in `mockups/`; the areas list is kept as a List view.
- 2026-10-12: Habits show in two places: a "Today" strip under the map for one-tap check-ins, and a Habits node that unfolds in each area.
- 2026-10-12: Money is logged on the path that earned it ("Log amount" on the path's road, with a note) and rolls up to the target. Funding a milestone such as the trading deposit is logged separately on that milestone.
- 2026-10-12: Things are added with a "+" where they will live (next to You for areas, at the end of each branch, road, task list and habit list). Editing goes through an Edit button on each thing's own screen, so a plain tap only explores.
- 2026-10-12: The map starts on You alone. Tapping You opens the areas; tapping it again folds the whole map back.
- 2026-10-12: Motion: You pulses until the map is opened. Opening draws a line out of the parent and pops each node in when its line arrives. The camera sits zoomed out on the overview, travels in when an area opens and back out when it closes. Chosen from five motions tried side by side.
- 2026-10-12: Accent colour is amber on warm neutrals, chosen over green, indigo and violet.
- 2026-10-12: Typeface stays Manrope, kept over Bricolage Grotesque, Plus Jakarta Sans, Outfit and a headings-only mix.
