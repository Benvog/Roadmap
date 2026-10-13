// Starts the app: shows the sign-in screens, or the map once there is a user.
import * as store from './store.js';
import { startApp } from './app.js';
import { showSignIn } from './signin.js';

// A theme the person picked with the moon button wins over the system setting.
try { const theme = localStorage.getItem('theme'); if (theme) document.documentElement.dataset.theme = theme; } catch (err) { /* follow the system */ }

const app = document.getElementById('app');

// The service worker (sw.js) keeps the app's own files so it opens offline, and makes each update arrive whole.
// On this PC it stays off unless the address ends in ?sw=1, so day-to-day changes are never served from a kept copy.
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
if ('serviceWorker' in navigator && (!local || new URLSearchParams(location.search).get('sw') === '1')) {
  navigator.serviceWorker.register('sw.js').catch((err) => console.error('Service worker not registered:', err));
}

// Supabase puts a message in the address when the link in a sign-in email could not be used.
function linkError() {
  const params = new URLSearchParams(location.hash.slice(1) || location.search);
  if (!params.get('error') && !params.get('error_code')) return '';
  history.replaceState(null, '', location.pathname);
  return 'That sign-in link did not work here. A link only works in the browser that asked for it. Sign in with your password, or send a new link and open it in this same browser.';
}

let stopApp = null;   // stops the running map when the person signs out or another account signs in
let shownFor;   // the user id on screen, so a repeated sign-in event doesn't redraw it
function show(user) {
  if (user) {
    if (shownFor === user.id) return;
    shownFor = user.id;
    // If another account signs in (say, in a second tab) without a sign-out first, the first one's map must not keep running.
    stopApp?.();
    stopApp = startApp(app, user, store);
  } else {
    if (shownFor === null) return;
    shownFor = null;
    stopApp?.();
    stopApp = null;
    showSignIn(app, store, { error: linkError() });
  }
}

store.onAuthChange(show);
show(await store.currentUser());
