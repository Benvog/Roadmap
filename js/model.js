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
