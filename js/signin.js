// The sign-in screens: email and password, with an emailed link as the way in when there is no password yet.
// `store` is passed in (js/store.js in the real app) so tests can supply a stand-in.
import { esc } from './ui.js';

const icon = new URL('../assets/icon.svg', import.meta.url).href;
const brand = `<div class="brand"><img src="${icon}" alt=""><b>Vektor</b></div>`;
const validEmail = (text) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
const BAD_EMAIL = 'Enter a full email address, like you@example.com.';
const NO_CONNECTION = 'That did not go through. Check your connection and try again.';
const TOO_MANY = 'Too many tries. Wait a while, then try again.';
// Supabase answers 400 for a wrong email or password, and 429 when there have been too many tries.
const problem = (err, wrong) => (err?.status === 429 ? TOO_MANY : err?.status === 400 ? wrong : NO_CONNECTION);

// `error` shows a message straight away, such as a sign-in link that did not work.
export function showSignIn(root, store, { email = '', error = '' } = {}) {
  root.innerHTML = `<div class="gate"><form class="card" id="sign-in" novalidate>
    ${brand}
    <h1>Sign in</h1>
    <div class="field"><label for="email">Email</label>
      <input id="email" type="email" inputmode="email" autocomplete="username" autocapitalize="none" spellcheck="false"
        placeholder="you@example.com" value="${esc(email)}" required></div>
    <div class="field"><label for="password">Password</label>
      <input id="password" type="password" autocomplete="current-password" required></div>
    <p class="error" id="sign-in-error" role="alert" ${error ? '' : 'hidden'}>${esc(error)}</p>
    <button class="btn primary wide" type="submit">Sign in</button>
    <button class="btn wide" type="button" id="use-link">No password yet? Email me a sign-in link</button>
  </form></div>`;

  const $ = (id) => root.querySelector('#' + id);
  const submit = root.querySelector('[type=submit]');
  const fail = (message, field) => {
    $('sign-in-error').textContent = message;
    $('sign-in-error').hidden = false;
    field?.focus();
  };
  $('sign-in').addEventListener('submit', async (e) => {
    e.preventDefault();
    const address = $('email').value.trim(), password = $('password').value.trim();
    if (!validEmail(address)) return fail(BAD_EMAIL, $('email'));
    if (!password) return fail('Enter your password.', $('password'));
    submit.disabled = true;
    submit.textContent = 'Signing in…';
    try {
      // On success the app is told someone signed in and takes over the screen.
      await store.signInWithPassword(address, password);
    } catch (err) {
      submit.disabled = false;
      submit.textContent = 'Sign in';
      fail(problem(err, 'That email and password do not match.'), $('password'));
    }
  });
  $('use-link').addEventListener('click', async (e) => {
    const address = $('email').value.trim();
    if (!validEmail(address)) return fail('Enter your email above first, then tap this again.', $('email'));
    e.target.disabled = true;
    try {
      await store.sendSignInLink(address);
      showLinkSent(root, store, address);
    } catch (err) {
      e.target.disabled = false;
      fail(problem(err, NO_CONNECTION));
    }
  });
}

// After a link is emailed. The link only works in the browser that asked for it, so this says so plainly.
function showLinkSent(root, store, address) {
  root.innerHTML = `<div class="gate"><div class="card">
    ${brand}
    <h1 tabindex="-1" id="sent-title">Check your email</h1>
    <p>We sent a sign-in link to <span class="email">${esc(address)}</span>. It can take a minute to arrive.</p>
    <p class="muted">Open the link in this same browser. If your email app opens it somewhere else, copy the link and paste it here instead.</p>
    <p class="muted">Once you are in, set a password from the account button, so you don't need an email next time.</p>
    <button class="btn wide" type="button" id="back">Back to sign in</button>
  </div></div>`;
  root.querySelector('#sent-title').focus();
  root.querySelector('#back').addEventListener('click', () => showSignIn(root, store, { email: address }));
}
