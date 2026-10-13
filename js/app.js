// The signed-in app: loads the user's data and runs the map and the goal roads.
// `store` is passed in (js/store.js in the real app) so tests can supply a stand-in with the same functions.
import { createMap } from './map.js';
import { createRoad } from './road.js';
import * as model from './model.js';
import { esc, ICONS, FormError, SAVE_FAILED, niceDate, openForm, showSheet, sheetHead, closeSheet } from './ui.js';

const STARTERS = ['Career', 'Health', 'Money', 'Mental'];   // clockwise from the top, so Money sits at the bottom
const STATE_LABEL = { done: 'Done', next: 'Next step', todo: 'Coming up', locked: 'Locked' };

// Starts the app inside `root` and returns a function that stops it (used on sign-out).
export function startApp(root, user, store) {
  let stopped = false, map = null, road = null, data = null, screen = 'map';

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
    root.innerHTML = `<div id="map-screen">
        <div id="map"></div>
        <header class="topbar">
          <h1>Vektor</h1>
          <button class="icon-btn" type="button" id="theme" aria-label="Switch between light and dark theme">${ICONS.moon}</button>
          <button class="icon-btn" type="button" id="account" aria-label="Your account">${ICONS.person}</button>
        </header>
        <div class="notice" id="starter" hidden>
          <p><b>Your map is empty.</b> Start with the usual four areas, or tap You and add your own with +.</p>
          <button class="btn primary" type="button" id="add-starters">Add ${STARTERS.slice(0, -1).join(', ')} and ${STARTERS.at(-1)}</button>
          <p class="error" id="starter-error" role="alert" hidden>Those could not all be added. Check your connection and try again.</p>
        </div>
        <div class="habit-strip" id="strip" role="group" aria-label="Today's habits"></div>
      </div>
      <div id="road-screen" hidden></div>`;
    map = createMap(root.querySelector('#map'), { onAdd, onEdit, onOpen: openRoad, onHabits: openHabits });
    road = createRoad(root.querySelector('#road-screen'), {
      getData: () => data,
      onBack: () => showScreen('map'),
      onEdit: editGoal,
      onMilestone: openMilestone,
      onAddMilestone: (goal) => onAdd('milestone', goal),
    });
    showScreen('map');
    map.centre();

    root.querySelector('#theme').addEventListener('click', toggleTheme);
    root.querySelector('#account').addEventListener('click', openAccount);
    root.querySelector('#add-starters').addEventListener('click', addStarters);
    root.querySelector('#strip').addEventListener('click', tapStrip);
  }

  // The map fills the screen and does its own panning; a road is an ordinary page that scrolls.
  function showScreen(name) {
    screen = name;
    closeSheet();
    root.querySelector('#map-screen').hidden = name !== 'map';
    root.querySelector('#road-screen').hidden = name !== 'road';
    document.body.classList.toggle('lock', name === 'map');
    refresh();
  }
  function openRoad(goal) {
    showScreen('road');
    road.show(goal);
  }

  // Redraws whichever screen is showing from the data in memory.
  function refresh() {
    root.querySelector('#starter').hidden = data.areas.length > 0;
    map.setData(data);
    if (screen === 'map') { map.render(); renderStrip(); } else road.render();
  }

  // Saves a new row and adds it to the data in memory.
  async function create(table, fields) {
    const row = await store.add(table, fields);
    data[table].push(row);
    return row;
  }
  // Saves changes to a row and applies them to the copy in memory.
  async function change(table, row, changes) {
    Object.assign(row, await store.update(table, row.id, changes));
  }
  // Deletes a row; the database removes what hangs under it, and removeLocal does the same in memory.
  async function destroy(table, row) {
    await store.remove(table, row.id);
    model.removeLocal(data, table, row.id);
  }
  const setDone = (table, row, done) => change(table, row, { done_at: done ? new Date().toISOString() : null });
  const name = (placeholder, value) => ({ id: 'name', label: 'Name', placeholder, value });
  const dueField = (value) => ({ id: 'due', label: 'Due date (optional)', type: 'date', value });
  // A whole amount above zero, or null when the field was left empty. Anything else is a mistake to point out.
  function wholeAmount(text) {
    if (text === '') return null;
    const n = Math.floor(Number(text));
    if (!(n > 0)) throw new FormError('Enter an amount above zero, or leave it empty.');
    return n;
  }

  async function addStarters(e) {
    e.target.disabled = true;
    root.querySelector('#starter-error').hidden = true;
    try {
      for (const starter of STARTERS) await create('areas', { name: starter, position: model.nextPosition(data.areas) });
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
  // `parent` is the row the "+" hangs from: an area for a goal or a habit, a target for a path, a goal for a
  // milestone, a milestone for a task.
  function onAdd(kind, parent) {
    if (kind === 'area') {
      openForm({ kicker: 'Your map', title: 'Add an area', submit: 'Add area', fields: [name('Learning, Faith, Family')],
        onSubmit: async (v) => {
          await create('areas', { name: v.name, position: model.nextPosition(data.areas) });
          closeSheet();
          refresh();
          map.centre(true);
        } });
    }
    if (kind === 'goal') {
      openForm({ kicker: parent.name, title: 'Add a goal', submit: 'Add goal',
        fields: [name('Read 12 books'), { id: 'target', label: 'Target amount in KES (optional)', type: 'number', placeholder: 'Only for money goals' }],
        onSubmit: async (v) => {
          const target = wholeAmount(v.target);
          await create('goals', { area_id: parent.id, name: v.name, position: model.nextPosition(model.goalsIn(data, parent.id)),
            ...(target ? { target_amount: target } : {}) });
          closeSheet();
          refresh();
        } });
    }
    if (kind === 'path') {
      openForm({ kicker: parent.name, title: 'Add a path', submit: 'Add path', fields: [name('A way to reach this target')],
        onSubmit: async (v) => {
          await create('goals', { area_id: parent.area_id, parent_id: parent.id, name: v.name, position: model.nextPosition(model.pathsOf(data, parent.id)) });
          closeSheet();
          refresh();
        } });
    }
    if (kind === 'milestone') {
      openForm({ kicker: parent.name, title: 'Add a milestone', submit: 'Add milestone', fields: [name('The next big step'), dueField()],
        onSubmit: async (v) => {
          await create('milestones', { goal_id: parent.id, name: v.name, due_date: v.due || null, position: model.nextPosition(model.milestonesOf(data, parent.id)) });
          closeSheet();
          refresh();
        } });
    }
    if (kind === 'habit') {
      openForm({ kicker: parent.name, title: 'Add a habit', submit: 'Add habit', fields: [name('Read 20 minutes'), oftenField()],
        onSubmit: async (v) => {
          await create('habits', { area_id: parent.id, name: v.name, times_per_week: Number(v.often), position: model.nextPosition(model.habitsIn(data, parent.id)) });
          refresh();
          openHabits(parent);
        } });
    }
    if (kind === 'task') {
      openForm({ kicker: parent.name, title: 'Add a task', submit: 'Add task', fields: [name('One small thing to do')],
        onSubmit: async (v) => {
          await create('tasks', { milestone_id: parent.id, name: v.name, position: model.nextPosition(model.tasksOf(data, parent.id)) });
          // A finished milestone with a new, unticked task is no longer finished.
          if (parent.done_at) await setDone('milestones', parent, false);
          refresh();
          openMilestone(parent);
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
          if (a.position !== i) await change('areas', a, { position: i });
        }
        onEdit('area', row);
      };
      openForm({ kicker: 'Area', title: 'Edit ' + row.name, submit: 'Save', fields: [name('', row.name)],
        extras: data.areas.length > 1 ? [{ label: 'Move clockwise', run: move(1) }, { label: 'Move anticlockwise', run: move(-1) }] : [],
        onSubmit: async (v) => {
          await change('areas', row, { name: v.name });
          closeSheet();
          refresh();
        },
        remove: { label: 'Delete this area', confirm: `Delete ${row.name} and everything in it?`,
          run: async () => {
            await destroy('areas', row);
            closeSheet();
            refresh();
            map.centre(true);
          } } });
    }
    if (kind === 'target') {
      openForm({ kicker: 'Target', title: 'Edit ' + row.name, submit: 'Save',
        fields: [name('', row.name), { id: 'target', label: 'Target amount in KES', type: 'number', value: Number(row.target_amount) }],
        onSubmit: async (v) => {
          const target = wholeAmount(v.target);
          if (!target) throw new FormError('A target needs an amount above zero.');
          await change('goals', row, { name: v.name, target_amount: target });
          closeSheet();
          refresh();
        },
        remove: { label: 'Delete this target', confirm: `Delete ${row.name} and its paths?`,
          run: async () => { await destroy('goals', row); closeSheet(); refresh(); } } });
    }
  }

  // The pencil in a road's header: the goal or path that road belongs to.
  function editGoal(goal) {
    const path = model.kindOf(goal) === 'path';
    openForm({ kicker: path ? 'Path' : 'Goal', title: 'Edit ' + goal.name, submit: 'Save', fields: [name('', goal.name), dueField(goal.due_date)],
      onSubmit: async (v) => {
        await change('goals', goal, { name: v.name, due_date: v.due || null });
        closeSheet();
        refresh();
      },
      remove: { label: path ? 'Delete this path' : 'Delete this goal', confirm: `Delete ${goal.name} and its milestones?`,
        run: async () => { await destroy('goals', goal); showScreen('map'); } } });
  }

  // ---------- A milestone's sheet: its tasks, and marking it done ----------
  function openMilestone(m, problem = '') {
    const goal = data.goals.find((g) => g.id === m.goal_id);
    const stops = model.milestonesOf(data, goal.id), tasks = model.tasksOf(data, m.id);
    const state = model.milestoneState(data, m);
    const main = state === 'done' ? '<button class="btn" type="button" data-act="undo">Mark as not done</button>'
      : state === 'locked' ? '<button class="btn" type="button" disabled>Locked until funded</button>'
      : '<button class="btn primary" type="button" data-act="done">Mark milestone done</button>';
    const el = showSheet(`${sheetHead(`${goal.name} · milestone ${stops.indexOf(m) + 1} of ${stops.length}`, m.name)}
      <span class="pill ${state}">${STATE_LABEL[state]}</span>
      ${m.due_date ? `<p class="muted">Due ${esc(niceDate(m.due_date))}</p>` : ''}
      ${tasks.length ? `<ul class="tasks">${tasks.map((t) => `<li><label>
          <input type="checkbox" id="task-${t.id}" data-task="${t.id}" ${t.done_at ? 'checked' : ''}><span>${esc(t.name)}</span></label></li>`).join('')}</ul>`
        : '<p class="muted">No tasks added to this milestone yet.</p>'}
      <p class="error" id="sheet-error" role="alert" ${problem ? '' : 'hidden'}>${esc(problem)}</p>
      <div class="actions">${main}
        <button class="btn" type="button" data-act="add-task">+ Add a task</button>
        <button class="btn" type="button" data-act="edit">Edit</button></div>`);

    // Saves, then redraws the road and this sheet from what was actually saved.
    const attempt = async (work) => {
      el.querySelectorAll('button, input').forEach((c) => (c.disabled = true));
      let failed = '';
      try { await work(); } catch (err) { failed = SAVE_FAILED; }
      refresh();
      openMilestone(m, failed);
    };
    el.onclick = (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'close') closeSheet();
      if (act === 'add-task') onAdd('task', m);
      if (act === 'edit') editMilestone(m);
      // Marking a milestone done ticks its tasks too; marking it not done clears them.
      if (act === 'done' || act === 'undo') {
        attempt(async () => {
          await setDone('milestones', m, act === 'done');
          for (const t of tasks) if (!!t.done_at !== (act === 'done')) await setDone('tasks', t, act === 'done');
        });
      }
    };
    el.onchange = (e) => {
      const task = tasks.find((t) => t.id === e.target.dataset.task);
      if (!task) return;
      attempt(async () => {
        await setDone('tasks', task, e.target.checked);
        // Ticking the last task finishes the milestone (unless it is locked); unticking one reopens it.
        const all = tasks.every((t) => t.done_at);
        if (all !== !!m.done_at && !(all && state === 'locked')) await setDone('milestones', m, all);
      });
    };
  }

  function editMilestone(m) {
    const goal = data.goals.find((g) => g.id === m.goal_id), tasks = model.tasksOf(data, m.id);
    openForm({ kicker: goal.name, title: 'Edit milestone', submit: 'Save',
      fields: [name('', m.name), dueField(m.due_date),
        ...tasks.map((t, i) => ({ id: 'task' + i, label: `Task ${i + 1} (clear to remove)`, value: t.name }))],
      onSubmit: async (v) => {
        await change('milestones', m, { name: v.name, due_date: v.due || null });
        for (const [i, t] of tasks.entries()) {
          if (!v['task' + i]) await destroy('tasks', t);
          else if (v['task' + i] !== t.name) await change('tasks', t, { name: v['task' + i] });
        }
        refresh();
        openMilestone(m);
      },
      remove: { label: 'Delete this milestone', confirm: `Delete ${m.name}?`,
        run: async () => { await destroy('milestones', m); closeSheet(); refresh(); } } });
  }

  // ---------- Habits: the Today strip under the map, and each area's habits sheet ----------
  const OFTEN = [{ value: 7, label: 'Every day' }, ...[6, 5, 4, 3, 2].map((n) => ({ value: n, label: n + ' times a week' })), { value: 1, label: 'Once a week' }];
  const oftenField = (value = 7) => ({ id: 'often', label: 'How often', options: OFTEN, value });
  let stripProblem = false;   // the last check-in from the strip did not save

  // Checks a habit in for today, or takes today's check-in back.
  async function toggleHabit(habit) {
    const day = model.localDay();
    if (model.habitStatus(data, habit, day).done) {
      await store.undoCheckIn(habit.id, day);
      data.habit_checkins = data.habit_checkins.filter((c) => !(c.habit_id === habit.id && c.day === day));
    } else {
      await store.checkIn(habit.id, day);
      data.habit_checkins.push({ id: `local-${habit.id}-${day}`, habit_id: habit.id, day });
    }
  }
  const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

  function renderStrip() {
    const el = root.querySelector('#strip'), today = model.localDay();
    const all = data.areas.flatMap((area) => model.habitsIn(data, area.id)).map((h) => [h, model.habitStatus(data, h, today)]);
    const due = all.filter(([, s]) => s.due);
    const left = el.querySelector('.strip-chips')?.scrollLeft || 0, focused = document.activeElement?.dataset?.chip;
    const count = stripProblem ? 'Not saved. Check your connection.'
      : !all.length ? 'No habits yet'
      : due.length ? `${due.filter(([, s]) => s.done).length} of ${plural(due.length, 'habit')}` : 'All done this week';
    el.innerHTML = `<span class="strip-label${stripProblem ? ' problem' : ''}"><b>Today</b><small${stripProblem ? ' role="alert"' : ''}>${count}</small></span>
      <div class="strip-chips">${all.length ? all.map(([h, s]) => `<button class="habit-chip" type="button" data-chip="${h.id}" aria-pressed="${s.done}">
        <span class="ic">${ICONS.check}</span><span>${esc(h.name)}</span>
        <small>${s.daily ? plural(s.streak, 'day') : s.week + ' of ' + s.target + ' this week'}</small></button>`).join('')
        : '<span class="strip-empty">Open an area and tap Habits to add one.</span>'}</div>`;
    el.querySelector('.strip-chips').scrollLeft = left;
    if (focused) el.querySelector(`[data-chip="${focused}"]`)?.focus({ preventScroll: true });
  }
  async function tapStrip(e) {
    const chip = e.target.closest('[data-chip]');
    const habit = chip && data.habits.find((h) => h.id === chip.dataset.chip);
    if (!habit || chip.disabled) return;
    chip.disabled = true;
    try { await toggleHabit(habit); stripProblem = false; } catch (err) { stripProblem = true; }
    refresh();
  }

  function openHabits(area, problem = '') {
    const today = model.localDay(), habits = model.habitsIn(data, area.id);
    const el = showSheet(`${sheetHead(area.name, 'Habits')}
      ${habits.length ? `<ul class="tasks habit-list">${habits.map((h) => {
        const s = model.habitStatus(data, h, today);
        const note = s.daily ? (s.streak ? s.streak + '-day streak' : 'No streak yet')
          : s.week + ' of ' + s.target + ' this week' + (s.streak ? ' · ' + s.streak + '-week streak' : '');
        return `<li><label><input type="checkbox" id="habit-${h.id}" data-habit="${h.id}" ${s.done ? 'checked' : ''}>
          <span>${esc(h.name)}<small class="muted streak">${note}</small></span></label>
          <button class="icon-btn small" type="button" data-edit="${h.id}" aria-label="Edit ${esc(h.name)}">${ICONS.pencil}</button></li>`;
      }).join('')}</ul>
        <p class="muted">Tick a habit on the days you do it. A streak counts days in a row, or weeks in a row for a habit you do a few times a week.</p>`
        : '<p class="muted">No habits in this area yet.</p>'}
      <p class="error" id="sheet-error" role="alert" ${problem ? '' : 'hidden'}>${esc(problem)}</p>
      <div class="actions"><button class="btn primary" type="button" data-act="add-habit">+ Add a habit</button></div>`);
    el.onclick = (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act, edit = e.target.closest('[data-edit]')?.dataset.edit;
      if (act === 'close') closeSheet();
      if (act === 'add-habit') onAdd('habit', area);
      if (edit) editHabit(habits.find((h) => h.id === edit), area);
    };
    el.onchange = async (e) => {
      const habit = habits.find((h) => h.id === e.target.dataset.habit);
      if (!habit) return;
      el.querySelectorAll('button, input').forEach((c) => (c.disabled = true));
      let failed = '';
      try { await toggleHabit(habit); } catch (err) { failed = SAVE_FAILED; }
      refresh();
      openHabits(area, failed);
    };
  }

  function editHabit(habit, area) {
    openForm({ kicker: area.name, title: 'Edit ' + habit.name, submit: 'Save', fields: [name('', habit.name), oftenField(habit.times_per_week)],
      onSubmit: async (v) => {
        await change('habits', habit, { name: v.name, times_per_week: Number(v.often) });
        refresh();
        openHabits(area);
      },
      remove: { label: 'Delete this habit', confirm: `Delete ${habit.name} and its check-ins?`,
        run: async () => { await destroy('habits', habit); refresh(); openHabits(area); } } });
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
    road?.destroy();
    closeSheet();
    document.body.classList.remove('lock');
  };
}
