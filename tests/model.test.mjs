// Checks js/model.js. Run with: node tests/model.test.mjs
import assert from 'node:assert/strict';
import * as model from '../js/model.js';
import { needsCurrentPassword } from '../js/session.js';

const data = {
  areas: [{ id: 'money', position: 0 }, { id: 'health', position: 1 }],
  goals: [
    { id: 'emergency', area_id: 'money', parent_id: null, target_amount: null, position: 1 },
    { id: '100k', area_id: 'money', parent_id: null, target_amount: '100000.00', position: 0 },
    { id: 'trading', area_id: 'money', parent_id: '100k', target_amount: null, position: 1 },
    { id: 'remote', area_id: 'money', parent_id: '100k', target_amount: null, position: 0 },
    { id: 'run', area_id: 'health', parent_id: null, target_amount: null, position: 0 },
  ],
  milestones: [
    { id: 'm1', goal_id: 'remote', position: 0, done_at: '2026-10-01T00:00:00Z' },
    { id: 'm2', goal_id: 'remote', position: 1, done_at: null },
    { id: 'm3', goal_id: 'trading', position: 0, done_at: null },
    { id: 'm4', goal_id: 'emergency', position: 0, done_at: '2026-10-02T00:00:00Z' },
  ],
  tasks: [{ id: 't1', milestone_id: 'm1' }, { id: 't2', milestone_id: 'm3' }],
  habits: [{ id: 'h1', area_id: 'money' }],
  habit_checkins: [{ id: 'c1', habit_id: 'h1' }],
  entries: [{ id: 'e1', goal_id: 'remote', amount: '8000.00' }, { id: 'e2', goal_id: 'remote', amount: '4000.00' }, { id: 'e3', goal_id: 'trading', amount: '500.50' }],
  funding: [{ id: 'f1', milestone_id: 'm3', from_goal_id: 'remote' }, { id: 'f2', milestone_id: 'm3', from_goal_id: null }],
};
const ids = (rows) => rows.map((r) => r.id).join(',');

assert.equal(ids(model.goalsIn(data, 'money')), '100k,emergency', 'an area lists its own goals in order, without paths');
assert.equal(ids(model.pathsOf(data, '100k')), 'remote,trading', 'a target lists its paths in order');
assert.equal(model.kindOf(data.goals[1]), 'target');
assert.equal(model.kindOf(data.goals[2]), 'path');
assert.equal(model.kindOf(data.goals[0]), 'goal');
assert.equal(ids(model.milestonesUnder(data, data.goals[1])), 'm1,m2,m3', 'a target counts its paths\' milestones');
assert.deepEqual(model.progress(model.milestonesOf(data, 'remote')), { done: 1, total: 2, percent: 50 });
assert.deepEqual(model.progress([]), { done: 0, total: 0, percent: 0 }, 'nothing to do is 0%, not a division by zero');
assert.deepEqual(model.areaProgress(data, 'money'), { done: 2, total: 4, percent: 50 });
assert.equal(model.earnedOn(data, 'remote'), 12000, 'amounts arrive as text from the database and still add up');
assert.equal(model.targetTotal(data, '100k'), 12500.5);
assert.equal(model.nextPosition(model.pathsOf(data, '100k')), 2);
assert.equal(model.nextPosition([]), 0);

assert.equal(ids(model.tasksOf(data, 'm1')), 't1');
assert.equal(model.milestoneState(data, data.milestones[0]), 'done');
assert.equal(model.milestoneState(data, data.milestones[1]), 'next', 'the first milestone not done is the next step');
assert.equal(ids(model.roads(data)), 'remote,trading,emergency,run', 'roads are plain goals and paths, in map order, without targets');
// A milestone that needs funding is locked until the funding adds up, wherever it came from.
const funded = structuredClone(data);
funded.milestones.push({ id: 'm5', goal_id: 'trading', position: 1, done_at: null, fund_amount: '20000.00' });
funded.funding = [{ id: 'f1', milestone_id: 'm5', from_goal_id: 'remote', amount: '8000.00' }, { id: 'f2', milestone_id: 'm5', from_goal_id: null, amount: '4000.00' }];
const deposit = funded.milestones.at(-1);
assert.equal(model.fundedOn(funded, 'm5'), 12000);
assert.equal(model.milestoneState(funded, deposit), 'locked');
funded.funding.push({ id: 'f3', milestone_id: 'm5', from_goal_id: null, amount: '8000.00' });
assert.equal(model.milestoneState(funded, deposit), 'todo', 'once funded it is an ordinary milestone waiting its turn');

// Deleting a path takes its milestones, tasks and entries, and clears the link on funding that came from it.
const afterPath = structuredClone(data);
model.removeLocal(afterPath, 'goals', 'remote');
assert.equal(ids(afterPath.goals), 'emergency,100k,trading,run');
assert.equal(ids(afterPath.milestones), 'm3,m4');
assert.equal(ids(afterPath.tasks), 't2');
assert.equal(ids(afterPath.entries), 'e3');
assert.equal(afterPath.funding.find((f) => f.id === 'f1').from_goal_id, null);
assert.equal(afterPath.funding.length, 2);

// Deleting an area takes everything under it and leaves other areas alone.
const afterArea = structuredClone(data);
model.removeLocal(afterArea, 'areas', 'money');
assert.equal(ids(afterArea.areas), 'health');
assert.equal(ids(afterArea.goals), 'run');
assert.equal(afterArea.milestones.length + afterArea.tasks.length + afterArea.habits.length + afterArea.habit_checkins.length
  + afterArea.entries.length + afterArea.funding.length, 0);

// Money lists read newest first.
const logged = { entries: [{ id: 'old', goal_id: 'p', logged_on: '2026-10-01', created_at: '1' }, { id: 'new', goal_id: 'p', logged_on: '2026-10-09', created_at: '2' },
  { id: 'same-day-later', goal_id: 'p', logged_on: '2026-10-09', created_at: '3' }, { id: 'other', goal_id: 'q', logged_on: '2026-10-10', created_at: '4' }] };
assert.equal(ids(model.entriesOf(logged, 'p')), 'same-day-later,new,old');

// ---------- Habits ----------
// 2026-10-12 is a Monday.
assert.equal(model.shiftDay('2026-10-01', -1), '2026-09-30', 'days step across a month end');
assert.equal(model.shiftDay('2026-12-31', 1), '2027-01-01');
assert.equal(model.weekStart('2026-10-12'), '2026-10-12', 'a Monday starts its own week');
assert.equal(model.weekStart('2026-10-18'), '2026-10-12', 'a Sunday belongs to the week that started on Monday');
assert.equal(model.weekStart('2026-10-14'), '2026-10-12');

const habitData = (habit, days) => ({ habits: [habit], habit_checkins: days.map((day, i) => ({ id: 'c' + i, habit_id: habit.id, day })) });
const daily = { id: 'd', times_per_week: 7 }, thrice = { id: 'w', times_per_week: 3 };
const status = (habit, days, today) => model.habitStatus(habitData(habit, days), habit, today);

// A daily habit counts days in a row.
assert.deepEqual(status(daily, [], '2026-10-14'), { done: false, daily: true, week: 0, target: 7, due: true, streak: 0 });
assert.equal(status(daily, ['2026-10-12', '2026-10-13', '2026-10-14'], '2026-10-14').streak, 3);
assert.equal(status(daily, ['2026-10-12', '2026-10-13'], '2026-10-14').streak, 2, 'not done yet today does not break yesterday\'s streak');
assert.equal(status(daily, ['2026-10-11', '2026-10-12'], '2026-10-14').streak, 0, 'a missed day does');
assert.equal(status(daily, ['2026-10-10', '2026-10-13', '2026-10-14'], '2026-10-14').streak, 2, 'only the unbroken run counts');
assert.equal(status(daily, ['2026-10-14'], '2026-10-14').done, true);
assert.equal(status(daily, ['2026-10-14'], '2026-10-14').due, true, 'a daily habit always shows for today');

// A three-times-a-week habit counts this week's check-ins and weeks in a row that reached three.
const lastWeek = ['2026-10-05', '2026-10-07', '2026-10-09'], weekBefore = ['2026-09-28', '2026-09-30', '2026-10-04'];
assert.deepEqual(status(thrice, ['2026-10-12', '2026-10-13'], '2026-10-14'), { done: false, daily: false, week: 2, target: 3, due: true, streak: 0 });
assert.equal(status(thrice, [...lastWeek, '2026-10-12'], '2026-10-14').streak, 1, 'a week still in progress does not break the streak');
assert.equal(status(thrice, [...weekBefore, ...lastWeek, '2026-10-12', '2026-10-13', '2026-10-14'], '2026-10-14').streak, 3, 'this week counts once it is reached');
assert.equal(status(thrice, [...weekBefore, '2026-10-12'], '2026-10-14').streak, 0, 'a week that fell short breaks it');
assert.equal(status(thrice, ['2026-10-12', '2026-10-13', '2026-10-14'], '2026-10-15').due, false, 'a weekly habit that has met its target is not due');
assert.equal(status(thrice, ['2026-10-12', '2026-10-13', '2026-10-14'], '2026-10-14').due, true, 'unless today is one of the days it was done');
assert.equal(status(thrice, ['2026-10-11'], '2026-10-12').week, 0, 'Sunday\'s check-in belongs to last week');
assert.equal(ids(model.habitsIn(data, 'money')), 'h1');

// ---------- How a session began: asking for the current password must fail closed ----------
const token = (claims) => 'h.' + Buffer.from(JSON.stringify(claims)).toString('base64url') + '.s';
assert.equal(needsCurrentPassword(token({ amr: [{ method: 'password', timestamp: 100 }] })), true);
assert.equal(needsCurrentPassword(token({ amr: [{ method: 'otp', timestamp: 100 }] })), false, 'an emailed link is the recovery route');
assert.equal(needsCurrentPassword(token({ amr: [{ method: 'magiclink', timestamp: 100 }] })), false);
assert.equal(needsCurrentPassword(token({ amr: [{ method: 'otp', timestamp: 100 }, { method: 'password', timestamp: 200 }] })), true, 'the newest way in decides, whatever the order');
assert.equal(needsCurrentPassword(token({ amr: [{ method: 'token_refresh', timestamp: 300 }, { method: 'otp', timestamp: 100 }] })), false, 'a refresh is not a way in');
assert.equal(needsCurrentPassword(token({ amr: [{ method: 'token_refresh', timestamp: 300 }, { method: 'password', timestamp: 100 }] })), true);
assert.equal(needsCurrentPassword(token({})), true, 'no record of how the session began: ask');
assert.equal(needsCurrentPassword(token({ amr: [] })), true);
assert.equal(needsCurrentPassword(token({ amr: [{ method: 'oauth', timestamp: 100 }] })), true, 'an unfamiliar way in: ask');
assert.equal(needsCurrentPassword(token({ amr: 'otp' })), true, 'a malformed record: ask');
assert.equal(needsCurrentPassword('not-a-token'), true);
assert.equal(needsCurrentPassword(''), true);

console.log('model: all checks passed');
