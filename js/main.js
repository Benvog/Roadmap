// Starts the app: shows the sign-in screen, or the signed-in screen once there is a user.
import * as store from './store.js';
import { dataLayerCheck } from './dev-check.js';   // temporary

const app = document.getElementById('app');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const brand = '<div class="brand"><img src="assets/icon.svg" alt=""><b>Vektor</b></div>';

// Supabase puts a message in the address when a sign-in link is expired or already used.
function linkError() {
  const params = new URLSearchParams(location.hash.slice(1) || location.search);
  if (!params.get('error') && !params.get('error_code')) return '';
  history.replaceState(null, '', location.pathname);
  return 'That sign-in link did not work. It may have expired, been used already, or been opened in a different browser. Send yourself a new one.';
}

function showSignIn({ email = '', error = '' } = {}) {
  app.innerHTML = `<div class="gate"><form class="card" id="sign-in" novalidate>
    ${brand}
    <h1>Sign in</h1>
    <p class="muted">Enter your email and we'll send you a link. There is no password.</p>
    <div class="field"><label for="email">Email</label>
      <input id="email" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false"
        placeholder="you@example.com" value="${esc(email)}" required></div>
    <p class="error" id="sign-in-error" role="alert" ${error ? '' : 'hidden'}>${esc(error)}</p>
    <button class="btn primary wide" type="submit">Send sign-in link</button>
  </form></div>`;

  const form = document.getElementById('sign-in'), input = document.getElementById('email');
  const fail = (message) => {
    const el = document.getElementById('sign-in-error');
    el.textContent = message;
    el.hidden = false;
    input.focus();
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const address = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return fail('Enter a full email address, like you@example.com.');
    const button = form.querySelector('button');
    button.disabled = true;
    button.textContent = 'Sending…';
    try {
      await store.sendSignInLink(address);
      showLinkSent(address);
    } catch (err) {
      button.disabled = false;
      button.textContent = 'Send sign-in link';
      fail(err.status === 429
        ? 'Too many sign-in emails were requested. Wait a few minutes, then try again.'
        : 'The link could not be sent. Check your connection and try again.');
    }
  });
}

function showLinkSent(address) {
  app.innerHTML = `<div class="gate"><div class="card">
    ${brand}
    <h1 tabindex="-1" id="sent-title">Check your email</h1>
    <p>We sent a sign-in link to <span class="email">${esc(address)}</span>.</p>
    <p class="muted">Open it in this same browser and you'll land back here, signed in. It can take a minute to arrive.</p>
    <button class="btn wide" type="button" id="other-email">Use a different email</button>
  </div></div>`;
  document.getElementById('sent-title').focus();
  document.getElementById('other-email').addEventListener('click', () => showSignIn({ email: address }));
}

// Placeholder until the map is built.
function showSignedIn(user) {
  app.innerHTML = `<div class="gate"><div class="card">
    ${brand}
    <h1>You're signed in</h1>
    <p>As <span class="email">${esc(user.email)}</span>.</p>
    <p class="muted">Your map goes here next.</p>
    <button class="btn wide" type="button" id="sign-out">Sign out</button>
  </div></div>`;
  document.getElementById('sign-out').addEventListener('click', () => store.signOut());
}

let shownFor;   // the user id on screen, so a repeated sign-in event doesn't redraw it
function show(user) {
  if (user) {
    if (shownFor === user.id) return;
    shownFor = user.id;
    showSignedIn(user);
  } else {
    if (shownFor === null) return;
    shownFor = null;
    showSignIn({ error: linkError() });
  }
}

store.onAuthChange(show);
show(await store.currentUser());
