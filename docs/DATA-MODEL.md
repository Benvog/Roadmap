# Data model

What Vektor stores in Supabase and how it links. Status: **approved and created** (2026-10-12) by running `supabase/schema.sql`.

## The shape

```
You (your login)
└─ areas                      Career, Money, Health, Mental ...
   ├─ habits                  "Study the charts"
   │  └─ habit_checkins       one row per day you did it
   └─ goals                   "Find my focus avenue", "Make KES 100,000"
      ├─ goals (paths)        "Remote work", "Trading": goals that sit under a target
      │  └─ entries           money (or counts) logged on that path
      └─ milestones           the stops on a goal's road
         ├─ tasks             the checklist inside a milestone
         └─ funding           money put toward a locked milestone, from any source
```

## Tables

Every table also has `id` (uuid), `user_id` (who owns the row, filled in automatically) and `created_at`.

| Table | What one row is | Columns |
|---|---|---|
| `areas` | A life area | `name`, `position` (its place around You) |
| `goals` | A goal, a target, or a path | `area_id`, `parent_id` (set only for a path: the target it feeds), `name`, `target_amount` (set only for a target), `unit` (default `KES`), `due_date`, `position` |
| `milestones` | A stop on a goal's road | `goal_id`, `name`, `due_date`, `position`, `done_at`, `fund_amount` (set only when the milestone is locked until funded) |
| `tasks` | A checklist item in a milestone | `milestone_id`, `name`, `position`, `done_at` |
| `habits` | A habit in an area | `area_id`, `name`, `position`, `times_per_week` (7 means every day; 3 means three times a week) |
| `habit_checkins` | One day a habit was done | `habit_id`, `day` (one row per habit per day) |
| `entries` | An amount logged on a path | `goal_id` (the path), `amount`, `note`, `logged_on` |
| `funding` | Money put toward a locked milestone | `milestone_id`, `amount`, `note`, `from_goal_id` (the path it came from, or empty for other cash), `logged_on` |

## Rules

- **One kind of goal row, three roles.** A plain goal has milestones. A target has a `target_amount` and paths under it, and no milestones of its own. A path is a goal whose `parent_id` points at a target; it has milestones and entries.
- **Deleting cascades.** Deleting an area deletes its goals and habits; deleting a goal deletes its paths, milestones and entries; and so on down. This matches the "and everything in it" confirmation in the prototype.
- **Order is stored.** `position` keeps areas in their place around You, and goals, milestones, tasks and habits in the order you made or moved them.
- **Done is a time, not a yes/no.** `done_at` is empty until the thing is done, then holds when. Ticking every task in a milestone marks the milestone done, as in the prototype.

## Worked out, not stored

These are calculated from the rows above each time, so they can never disagree with the data:

- **Progress** of a goal, an area or the whole map: done milestones out of all milestones underneath.
- **A path's earned total:** the sum of its `entries`.
- **A target's total:** the sum of its paths' totals.
- **Locked or unlocked:** a milestone with a `fund_amount` is locked until its `funding` rows add up to it.
- **Next step:** the first milestone on a road that is not done and not locked.
- **Streak:** for a daily habit, how many days in a row (ending today or yesterday) it has a check-in. For a weekly habit, how many weeks in a row (Monday to Sunday) it reached its `times_per_week`; the current week counts once it is reached and does not break the streak while it is still in progress.
- **This week:** for a weekly habit, how many check-ins it has since Monday, shown as "2 of 3 this week".

## Privacy

Row-level security is on for every table: a row can only be read or changed by the login whose `user_id` is on it.
The site's Supabase key is public by design (it ships in the page), so this rule is what keeps the data private.

## Choices made

1. **Funding does not reduce a path's earned total.** Logging KES 8,000 from Remote work toward the trading deposit records where the deposit money came from; Remote work still shows everything it earned. (This is how the prototype behaves.)
2. **Targets can count things other than money.** `unit` defaults to `KES`, but a target could be "12 books" with entries of 1 each. The first version only offers KES in the form; the column is there so it does not need changing later.
3. **Habits can be daily or a number of times a week** (decided 2026-10-12). The add and edit forms need a "how often" choice; the prototype does not have it yet.
4. **View offline, no offline changes** (decided 2026-10-12). The phone keeps a copy of the last data it loaded, so the map and roads can be opened and read with no connection, under an "offline" note. Changing anything needs a connection. Full offline (changes queued and synced later) is left out of the first version.
