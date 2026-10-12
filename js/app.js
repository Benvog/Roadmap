// The signed-in app: loads the user's data and runs the map.
// `store` is passed in (js/store.js in the real app) so tests can supply a stand-in with the same functions.
import { createMap } from './map.js';
import { ICONS, openForm, showSheet, sheetHead, closeSheet } from './ui.js';

const STARTERS = ['Career', 'Health', 'Money', 'Mental'];   // clockwise from the top, so Money sits at the bottom

// Starts the app inside `root` and returns a function that stops it (used on sign-out).
export function startApp(root, user, store) {
  let stopped = false, map = null, data = null;

  async function load() {
    root.innerHTML = '<div class="gate"><div class="card"><p class="muted" role="status">Loading your map…</p></div></div>';
    try {
      data = await store.loadAll();
    } catch (err) {
      if (stopped) return;
      root.innerHTML = `<div class="gate"><div class="card">
        <h1>Your map could not be loaded</h1>
        <p class="muted">Check your connection, then try again.</p>
        <button class="btn primary wide" type="button" id="retry">Try again</button>
      </div></div>`;
      root.querySelector('#retry').addEventListener('click', load);
      return;
    }
    if (!stopped) draw();
  }

  function draw() {
    root.innerHTML = `<div id="map"></div>
      <header class="topbar">
        <h1>Vektor</h1>
        <button class="icon-btn" type="button" id="theme" aria-label="Switch between light and dark theme">${ICONS.moon}</button>
        <button class="icon-btn" type="button" id="account" aria-label="Your account">${ICONS.person}</button>
      </header>
      <div class="notice" id="starter" hidden>
        <p><b>Your map is empty.</b> Start with the usual four areas, or tap You and add your own with +.</p>
        <button class="btn primary" type="button" id="add-starters">Add ${STARTERS.slice(0, -1).join(', ')} and ${STARTERS.at(-1)}</button>
        <p class="error" id="starter-error" role="alert" hidden>Those could not all be added. Check your connection and try again.</p>
      </div>`;
    document.body.classList.add('lock');
    map = createMap(root.querySelector('#map'), { onAdd, onEdit });
    refresh();
    map.centre();

    root.querySelector('#theme').addEventListener('click', toggleTheme);
    root.querySelector('#account').addEventListener('click', openAccount);
    root.querySelector('#add-starters').addEventListener('click', addStarters);
  }

  // Redraws the map from the data in memory.
  function refresh() {
    root.querySelector('#starter').hidden = data.areas.length > 0;
    map.setData(data);
    map.render();
  }

  const nextPosition = (rows) => rows.reduce((max, r) => Math.max(max, r.position), -1) + 1;

  async function addStarters(e) {
    e.target.disabled = true;
    root.querySelector('#starter-error').hidden = true;
    try {
      for (const name of STARTERS) data.areas.push(await store.add('areas', { name, position: nextPosition(data.areas) }));
    } catch (err) {
      e.target.disabled = false;
      root.querySelector('#starter-error').hidden = false;
      if (!data.areas.length) return;
    }
    map.openYou();
    refresh();
    map.centre(true);
  }

  // ---------- Adding ----------
  function onAdd(kind) {
    if (kind === 'area') {
      openForm({ kicker: 'Your map', title: 'Add an area', submit: 'Add area',
        fields: [{ id: 'name', label: 'Name', placeholder: 'Learning, Faith, Family' }],
        onSubmit: async (v) => {
          data.areas.push(await store.add('areas', { name: v.name, position: nextPosition(data.areas) }));
          closeSheet();
          refresh();
          map.centre(true);
        } });
    }
  }

  // ---------- Editing ----------
  function onEdit(kind, row) {
    if (kind === 'area') {
      // Areas sit around You in list order, so moving one swaps it with its neighbour and saves the new places.
      const move = (by) => async () => {
        const at = data.areas.indexOf(row), to = (at + by + data.areas.length) % data.areas.length;
        [data.areas[at], data.areas[to]] = [data.areas[to], data.areas[at]];
        refresh();
        for (const [i, a] of data.areas.entries()) {
          if (a.position !== i) { await store.update('areas', a.id, { position: i }); a.position = i; }
        }
        onEdit('area', row);
      };
      openForm({ kicker: 'Area', title: 'Edit ' + row.name, submit: 'Save',
        fields: [{ id: 'name', label: 'Name', value: row.name }],
        extras: data.areas.length > 1 ? [{ label: 'Move clockwise', run: move(1) }, { label: 'Move anticlockwise', run: move(-1) }] : [],
        onSubmit: async (v) => {
          Object.assign(row, await store.update('areas', row.id, { name: v.name }));
          closeSheet();
          refresh();
        },
        remove: { label: 'Delete this area', confirm: `Delete ${row.name} and everything in it?`,
          run: async () => {
            await store.remove('areas', row.id);
            data.areas.splice(data.areas.indexOf(row), 1);
            closeSheet();
            refresh();
            map.centre(true);
          } } });
    }
  }

  // ---------- Top bar ----------
  function toggleTheme() {
    const html = document.documentElement;
    const dark = html.dataset.theme ? html.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    html.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', html.dataset.theme); } catch (err) { /* the choice just won't be remembered */ }
  }

  function openAccount() {
    const el = showSheet(`${sheetHead('Signed in as', user.email)}
      <div class="actions"><button class="btn" type="button" data-act="sign-out">Sign out</button></div>`);
    el.onclick = (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'close') closeSheet();
      if (act === 'sign-out') store.signOut();
    };
  }

  load();
  return function stop() {
    stopped = true;
    map?.destroy();
    closeSheet();
    document.body.classList.remove('lock');
  };
}
