// Checks js/model.js. Run with: node tests/model.test.mjs
import assert from 'node:assert/strict';
import * as model from '../js/model.js';

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

console.log('model: all checks passed');
