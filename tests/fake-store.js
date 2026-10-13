// A stand-in for js/store.js that keeps everything in memory, so the app can be run and tested without signing in.
// It offers the same functions and the same shapes; nothing here touches Supabase.
import { removeLocal } from '../js/model.js';

const TABLES = ['areas', 'goals', 'milestones', 'tasks', 'habits', 'habit_checkins', 'entries', 'funding'];

export function createFakeStore({ areas = [], failing = false } = {}) {
  let n = 0;
  const now = () => new Date().toISOString();
  const row = (fields) => ({ id: 'fake-' + (++n), user_id: 'fake-user', created_at: now(), ...fields });
  const db = Object.fromEntries(TABLES.map((t) => [t, []]));
  areas.forEach((name, position) => db.areas.push(row({ name, position })));

  const store = {
    calls: [],          // every change the app asked for, for tests to inspect
    failing,            // set to true to make every call fail, like having no connection
    signedOut: false,
  };
  const guard = (what) => {
    if (store.failing) throw new Error('No connection (fake)');
    store.calls.push(what);
  };

  store.loadAll = async () => { guard('loadAll'); return structuredClone(db); };
  store.add = async (table, fields) => {
    guard(`add ${table} ${fields.name ?? ''}`.trim());
    const made = row(fields);
    db[table].push(made);
    return { ...made };
  };
  store.update = async (table, id, changes) => {
    guard(`update ${table} ${JSON.stringify(changes)}`);
    const found = db[table].find((r) => r.id === id);
    Object.assign(found, changes);
    return { ...found };
  };
  store.remove = async (table, id) => {
    guard(`remove ${table}`);
    removeLocal(db, table, id);   // the real database cascades the same way
  };
  store.checkIn = async (habitId, day) => {
    guard(`checkIn ${day === new Date().toLocaleDateString('en-CA') ? 'today' : day}`);
    if (!db.habit_checkins.some((c) => c.habit_id === habitId && c.day === day)) db.habit_checkins.push(row({ habit_id: habitId, day }));
  };
  store.undoCheckIn = async (habitId, day) => {
    guard('undoCheckIn');
    db.habit_checkins = db.habit_checkins.filter((c) => !(c.habit_id === habitId && c.day === day));
  };
  store.setPassword = async (password) => { guard('setPassword'); store.password = password; };
  store.signOut = async () => { store.signedOut = true; };
  store.rows = (table) => db[table];
  return store;
}
