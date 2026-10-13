// Works things out from the flat lists that store.loadAll() returns. Nothing here is stored; see docs/DATA-MODEL.md.
// `data` is { areas, goals, milestones, tasks, habits, habit_checkins, entries, funding }.

const byPosition = (a, b) => a.position - b.position || String(a.created_at).localeCompare(String(b.created_at));
const sum = (rows, field) => rows.reduce((total, r) => total + Number(r[field]), 0);

// An area's own goals and targets (not the paths under a target).
export const goalsIn = (data, areaId) => data.goals.filter((g) => g.area_id === areaId && !g.parent_id).sort(byPosition);
export const pathsOf = (data, targetId) => data.goals.filter((g) => g.parent_id === targetId).sort(byPosition);
export const milestonesOf = (data, goalId) => data.milestones.filter((m) => m.goal_id === goalId).sort(byPosition);

// A goal row plays one of three roles.
export const kindOf = (goal) => (goal.target_amount != null ? 'target' : goal.parent_id ? 'path' : 'goal');

// Every milestone under a goal: its own, plus its paths' if it is a target.
export function milestonesUnder(data, goal) {
  return [...milestonesOf(data, goal.id), ...pathsOf(data, goal.id).flatMap((p) => milestonesOf(data, p.id))];
}

// { done, total, percent } for a list of milestones.
export function progress(milestones) {
  const done = milestones.filter((m) => m.done_at).length;
  return { done, total: milestones.length, percent: milestones.length ? Math.round(100 * done / milestones.length) : 0 };
}
export const areaProgress = (data, areaId) => progress(goalsIn(data, areaId).flatMap((g) => milestonesUnder(data, g)));

// What has been logged on a path, and on a target through its paths.
export const earnedOn = (data, goalId) => sum(data.entries.filter((e) => e.goal_id === goalId), 'amount');
export const targetTotal = (data, targetId) => pathsOf(data, targetId).reduce((total, p) => total + earnedOn(data, p.id), 0);

export const tasksOf = (data, milestoneId) => data.tasks.filter((t) => t.milestone_id === milestoneId).sort(byPosition);
// What has been put toward a milestone that is locked until it is funded.
export const fundedOn = (data, milestoneId) => sum(data.funding.filter((f) => f.milestone_id === milestoneId), 'amount');

// Where a milestone stands: 'done', 'locked' (it needs funding it does not have yet),
// 'next' (the first one on its road that is not done), or 'todo'.
export function milestoneState(data, milestone) {
  if (milestone.done_at) return 'done';
  if (milestone.fund_amount != null && fundedOn(data, milestone.id) < Number(milestone.fund_amount)) return 'locked';
  const first = milestonesOf(data, milestone.goal_id).find((m) => !m.done_at);
  return first && first.id === milestone.id ? 'next' : 'todo';
}

// Every goal that has a road of its own (plain goals and paths, not targets), in the order they sit on the map.
export const roads = (data) => data.areas.flatMap((a) => goalsIn(data, a.id).flatMap((g) => (kindOf(g) === 'target' ? pathsOf(data, g.id) : [g])));

// ---------- Habits ----------
// Days are 'YYYY-MM-DD' strings, as the database stores them, so they compare and sort as text.
export const localDay = (date = new Date()) => date.toLocaleDateString('en-CA');   // today on this device
export function shiftDay(day, by) {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
}
// The Monday of the week a day falls in.
export const weekStart = (day) => shiftDay(day, -((new Date(day + 'T00:00:00Z').getUTCDay() + 6) % 7));

export const habitsIn = (data, areaId) => data.habits.filter((h) => h.area_id === areaId).sort(byPosition);

// How a habit stands on `today`:
//   done    checked in today
//   daily   it is an every-day habit (times_per_week of 7)
//   week    check-ins so far this week (Monday to Sunday), against `target`
//   due     still worth showing as to-do today: a daily habit, or a weekly one that has not reached its target
//   streak  days in a row for a daily habit (ending today, or yesterday if today is not done yet);
//           weeks in a row that reached the target for a weekly one. The current week counts once it is
//           reached, and does not break the streak while it is still in progress.
export function habitStatus(data, habit, today) {
  const days = new Set(data.habit_checkins.filter((c) => c.habit_id === habit.id).map((c) => c.day));
  const target = habit.times_per_week, daily = target >= 7, done = days.has(today);
  const inWeek = (monday) => [0, 1, 2, 3, 4, 5, 6].filter((i) => days.has(shiftDay(monday, i))).length;
  const monday = weekStart(today), week = inWeek(monday);
  let streak = 0;
  if (daily) {
    for (let d = done ? today : shiftDay(today, -1); days.has(d); d = shiftDay(d, -1)) streak++;
  } else {
    if (week >= target) streak++;
    for (let w = shiftDay(monday, -7); inWeek(w) >= target; w = shiftDay(w, -7)) streak++;
  }
  return { done, daily, week, target, due: daily || done || week < target, streak };
}

// The next free place at the end of a list of siblings.
export const nextPosition = (rows) => rows.reduce((max, r) => Math.max(max, r.position), -1) + 1;

// Deleting a row also deletes what hangs under it. The database does this itself; this keeps the copy in memory in step.
const CHILDREN = {
  areas: [['goals', 'area_id'], ['habits', 'area_id']],
  goals: [['goals', 'parent_id'], ['milestones', 'goal_id'], ['entries', 'goal_id']],
  milestones: [['tasks', 'milestone_id'], ['funding', 'milestone_id']],
  habits: [['habit_checkins', 'habit_id']],
};
export function removeLocal(data, table, id) {
  for (const [child, column] of CHILDREN[table] || []) {
    for (const row of data[child].filter((r) => r[column] === id)) removeLocal(data, child, row.id);
  }
  // Funding that came from a deleted path stays, with the link cleared.
  if (table === 'goals') for (const f of data.funding) if (f.from_goal_id === id) f.from_goal_id = null;
  data[table] = data[table].filter((r) => r.id !== id);
}
