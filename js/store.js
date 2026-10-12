// The only module that talks to Supabase. Everything else goes through these functions.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
