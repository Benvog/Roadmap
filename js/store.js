// The only module that talks to Supabase. Everything else goes through these functions.
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

// The Supabase library is a copy kept in js/vendor (loaded by index.html), not fetched from a CDN at run time.
// PKCE ties a sign-in link to the browser that asked for it, so a link made by someone else cannot sign this browser in.
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { flowType: 'pkce' } });

// ---------- Sign-in ----------
export async function currentUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

// Calls back with the user (or null) whenever someone signs in or out, including in another tab.
export function onAuthChange(callback) {
  supabase.auth.onAuthStateChange((event, session) => callback(session?.user ?? null));
}

// Emails a sign-in link that brings the person back to this page. It only works in the browser that asked for it.
export async function sendSignInLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname },
  });
  if (error) throw error;
}

export async function signInWithPassword(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

// True when this session was started with the account's password, false when it came from an emailed link.
// Supabase records how a session began in its token (the "amr" claim, newest first).
export async function signedInWithPassword() {
  const { data } = await supabase.auth.getSession();
  try {
    const claims = JSON.parse(atob(data.session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return claims.amr?.[0]?.method === 'password';
  } catch (err) {
    return true;   // if it cannot be read, take the careful path and ask for the current password
  }
}

// Sets or changes the signed-in user's password. `current` is checked first when it is given; the app requires
// it for anyone who signed in with a password, so an unlocked, signed-in device is not enough to take the account.
export async function setPassword(password, current) {
  if (current !== undefined) {
    const { data } = await supabase.auth.getSession();
    const check = await supabase.auth.signInWithPassword({ email: data.session.user.email, password: current });
    if (check.error) throw Object.assign(check.error, { wrongCurrent: check.error.status === 400 });
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ---------- Data ----------
const TABLES = ['areas', 'goals', 'milestones', 'tasks', 'habits', 'habit_checkins', 'entries', 'funding'];
const ORDER = {
  habit_checkins: [['day', true]],
  entries: [['logged_on', false], ['created_at', false]],
  funding: [['logged_on', false], ['created_at', false]],
};
const inOrder = [['position', true], ['created_at', true]];

function from(table) {
  if (!TABLES.includes(table)) throw new Error('Unknown table: ' + table);
  return supabase.from(table);
}
function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

// Everything the signed-in user owns, as flat lists keyed by table name.
export async function loadAll() {
  const lists = await Promise.all(TABLES.map((table) => {
    let query = from(table).select('*');
    for (const [column, ascending] of ORDER[table] || inOrder) query = query.order(column, { ascending });
    return query.then(unwrap);
  }));
  return Object.fromEntries(TABLES.map((table, i) => [table, lists[i]]));
}

export async function add(table, row) {
  return unwrap(await from(table).insert(row).select().single());
}

export async function update(table, id, changes) {
  return unwrap(await from(table).update(changes).eq('id', id).select().single());
}

// Removes the row and, through the database, everything underneath it.
export async function remove(table, id) {
  unwrap(await from(table).delete().eq('id', id));
}

// `day` is the date on this device, as YYYY-MM-DD. Checking in twice on one day keeps a single row.
export async function checkIn(habitId, day) {
  unwrap(await from('habit_checkins').upsert({ habit_id: habitId, day }, { onConflict: 'habit_id,day', ignoreDuplicates: true }));
}

export async function undoCheckIn(habitId, day) {
  unwrap(await from('habit_checkins').delete().eq('habit_id', habitId).eq('day', day));
}
