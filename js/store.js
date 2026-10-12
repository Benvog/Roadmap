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

// Emails a sign-in link that brings the person back to this page.
export async function sendSignInLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
