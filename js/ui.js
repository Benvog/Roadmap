// Shared pieces of the interface: escaping, icons and the bottom sheet with its forms.

// Anything a user typed goes through this before it is put into HTML.
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// "KES 12,000", or "12 books" for a target that counts something else. `bare` leaves the unit off a second KES figure.
export function amount(n, unit = 'KES', bare = false) {
  const figure = Number(n).toLocaleString('en-KE', { maximumFractionDigits: 2 });
  if (unit !== 'KES') return figure + (bare ? ' ' + unit : '');
  return bare ? figure : 'KES ' + figure;
}

const svg = (body, extra = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"') =>
  `<svg viewBox="0 0 24 24" ${extra} aria-hidden="true">${body}</svg>`;
export const ICONS = {
  pencil: svg('<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>'),
  moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  person: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.500 8 6.5"/>'),
};

// ---------- Bottom sheet ----------
let sheet;
export function showSheet(html) {
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.className = 'sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-labelledby', 'sheet-title');
    document.body.appendChild(sheet);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  }
  sheet.innerHTML = html;
  sheet.onclick = null;
  sheet.hidden = false;
  return sheet;
}
// Closing also empties the sheet, so nothing from one account's forms is left in the page for the next.
export function closeSheet() {
  if (!sheet) return;
  sheet.hidden = true;
  sheet.innerHTML = '';
  sheet.onclick = null;
}
export const sheetHead = (kicker, title) => `<div class="sheet-head">
    <div><p class="kicker">${esc(kicker)}</p><h2 id="sheet-title">${esc(title)}</h2></div>
    <button class="icon-btn" type="button" data-act="close" aria-label="Close">✕</button>
  </div>`;

const SAVE_FAILED = 'That could not be saved. Check your connection and try again.';

// Throw this from a form's onSubmit to show the person a specific message instead of the general one.
export class FormError extends Error {}

// A form in the sheet. `fields` are { id, label, type, value, placeholder }; a first field with id "name" is required.
// `onSubmit(values)`, each `extras[].run()` and `remove.run()` may be async; a failure shows a message and keeps the form open.
export function openForm({ kicker, title, fields, submit, onSubmit, extras = [], remove }) {
  const askDelete = remove && `<button class="btn" type="button" data-act="ask-delete">${esc(remove.label)}</button>`;
  const el = showSheet(`${sheetHead(kicker, title)}
    <form id="sheet-form" novalidate>
      ${fields.map((f) => `<div class="field"><label for="f-${f.id}">${esc(f.label)}</label>
        <input id="f-${f.id}" type="${f.type || 'text'}" ${f.type === 'number' ? 'inputmode="numeric" min="1" step="1"' : 'maxlength="60"'}
          value="${esc(f.value)}" placeholder="${esc(f.placeholder)}" autocomplete="off"></div>`).join('')}
      <p class="error" id="sheet-error" role="alert" hidden></p>
      <div class="actions"><button class="btn primary" type="submit">${esc(submit)}</button>
        ${extras.map((x, n) => `<button class="btn" type="button" data-extra="${n}">${esc(x.label)}</button>`).join('')}</div>
    </form>
    ${remove ? `<div class="danger" id="sheet-danger">${askDelete}</div>` : ''}`);

  const $ = (id) => el.querySelector('#' + id);
  const fail = (message) => { $('sheet-error').textContent = message; $('sheet-error').hidden = false; };
  // Runs a save, with every button off while it is in flight.
  const attempt = async (work) => {
    const buttons = [...el.querySelectorAll('button')];
    buttons.forEach((b) => (b.disabled = true));
    $('sheet-error').hidden = true;
    try {
      await work();
    } catch (err) {
      buttons.forEach((b) => (b.disabled = false));
      fail(err instanceof FormError ? err.message : SAVE_FAILED);
    }
  };

  el.onclick = (e) => {
    const t = e.target.closest('[data-act], [data-extra]');
    if (!t) return;
    if (t.dataset.extra) return attempt(() => extras[t.dataset.extra].run());
    const act = t.dataset.act;
    if (act === 'close') closeSheet();
    if (act === 'ask-delete') {
      $('sheet-danger').innerHTML = `<p>${esc(remove.confirm)}</p><div class="actions">
        <button class="btn danger-btn" type="button" data-act="delete">Delete</button>
        <button class="btn" type="button" data-act="keep">Keep it</button></div>`;
    }
    if (act === 'keep') $('sheet-danger').innerHTML = askDelete;
    if (act === 'delete') attempt(() => remove.run());
  };
  $('sheet-form').onsubmit = (e) => {
    e.preventDefault();
    const values = Object.fromEntries(fields.map((f) => [f.id, $('f-' + f.id).value.trim()]));
    if (fields[0].id === 'name' && !values.name) { fail('Give it a name first.'); $('f-name').focus(); return; }
    attempt(() => onSubmit(values));
  };
  if (!fields[0].value) $('f-' + fields[0].id).focus({ preventScroll: true });
}
