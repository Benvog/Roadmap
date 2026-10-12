// Shared helpers for the map-style mockups: theme, data helpers and the milestone sheet.
const PARAMS = new URLSearchParams(location.search);

(function theme() {
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) {}
  const start = PARAMS.get('theme') || saved;
  if (start) root.dataset.theme = start;
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#theme')) return;
    const dark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  });
})();

const ICONS = {
  check: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  dot: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>',
  flag: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 21V4M6 4h11l-2 4 2 4H6"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
};

const KES = (n) => 'KES ' + n.toLocaleString('en-KE');

// Every goal that has milestones, with its area and (for paths) the target it feeds.
function allGoals() {
  const out = [];
  for (const area of DATA) {
    for (const g of area.goals) {
      if (g.steps) out.push({ goal: g, area, parent: null });
      for (const p of g.paths || []) out.push({ goal: p, area, parent: g });
    }
  }
  return out;
}
const findGoal = (id) => allGoals().find((x) => x.goal.id === id);

function stepsUnder(goal) {
  return (goal.steps || []).concat(...(goal.paths || []).map(stepsUnder));
}
function percent(steps) {
  return steps.length ? Math.round(100 * steps.filter((s) => s.done).length / steps.length) : 0;
}
const funded = (step) => step.fund.sources.reduce((sum, s) => sum + s.amount, 0);

function stepState(goal, i) {
  const s = goal.steps[i];
  if (s.done) return 'done';
  if (s.fund && funded(s) < s.fund.need) return 'locked';
  return goal.steps.findIndex((x) => !x.done) === i ? 'next' : 'todo';
}
const STATE_LABEL = { done: 'Done', next: 'Next step', todo: 'Coming up', locked: 'Locked' };

function goalSub(goal) {
  if (goal.target) {
    const have = goal.paths.reduce((sum, p) => sum + p.earned, 0);
    return KES(have) + ' of ' + goal.target.of.toLocaleString('en-KE');
  }
  const done = goal.steps.filter((s) => s.done).length;
  const text = done + ' of ' + goal.steps.length + ' done';
  return goal.earned !== undefined ? text + ' · ' + KES(goal.earned) : text;
}

// The milestone sheet. `rerender` redraws the page behind it after a change.
function openSheet(goal, i, rerender) {
  let el = document.getElementById('sheet');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sheet';
    el.className = 'sheet';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', 'sheet-title');
    document.body.appendChild(el);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  }
  const s = goal.steps[i];
  const state = stepState(goal, i);
  let body = `<span class="pill ${state}">${STATE_LABEL[state]}</span>`;

  if (s.fund) {
    const have = funded(s);
    const left = Math.max(0, s.fund.need - have);
    body += `<div class="fund">
      <div class="fund-row"><b>${KES(have)}</b><span class="muted">of ${KES(s.fund.need)} to unlock</span></div>
      <span class="bar"><i style="width:${Math.min(100, 100 * have / s.fund.need)}%"></i></span>
      <ul>${s.fund.sources.map((x) => `<li><span>${x.from}</span><b>${KES(x.amount)}</b></li>`).join('')}</ul>
    </div>
    <p class="muted">${left ? KES(left) + ' to go. Money can come from any path or from cash you log.' : 'Fully funded. This milestone is unlocked.'}</p>`;
  }
  if (s.tasks) {
    body += `<ul class="tasks">${s.tasks.map((t, n) =>
      `<li><label><input type="checkbox" data-task="${n}" ${t.done || s.done ? 'checked' : ''}>${t.t}</label></li>`).join('')}</ul>`;
  } else if (!s.fund) {
    body += `<p class="muted">No tasks added to this milestone yet.</p>`;
  }

  let actions = '';
  if (s.fund && state === 'locked') actions += `<button class="btn primary" data-act="log">Log KES 4,000 of other cash</button>`;
  if (state === 'done') actions += `<button class="btn" data-act="undo">Mark as not done</button>`;
  else if (state === 'locked') actions += `<button class="btn" disabled>Locked until funded</button>`;
  else actions += `<button class="btn ${s.fund ? '' : 'primary'}" data-act="done">Mark milestone done</button>`;

  el.innerHTML = `<div class="sheet-head">
      <div><p class="kicker">${goal.name} · milestone ${i + 1} of ${goal.steps.length}</p>
      <h2 id="sheet-title" tabindex="-1">${s.t}</h2></div>
      <button class="icon-btn" data-act="close" aria-label="Close">✕</button>
    </div>${body}<div class="actions">${actions}</div>`;
  el.hidden = false;

  const refresh = () => { rerender(); openSheet(goal, i, rerender); };
  el.onclick = (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'close') return closeSheet();
    if (act === 'done') { s.done = true; (s.tasks || []).forEach((t) => (t.done = true)); refresh(); }
    if (act === 'undo') { s.done = false; (s.tasks || []).forEach((t) => (t.done = false)); refresh(); }
    if (act === 'log') {
      const other = s.fund.sources.find((x) => x.from === 'Other cash: logged');
      if (other) other.amount += 4000; else s.fund.sources.push({ from: 'Other cash: logged', amount: 4000 });
      refresh();
    }
  };
  el.onchange = (e) => {
    const n = e.target.dataset.task;
    if (n === undefined) return;
    s.tasks[n].done = e.target.checked;
    s.done = s.tasks.every((t) => t.done);
    refresh();
  };
}
function closeSheet() {
  const el = document.getElementById('sheet');
  if (el) el.hidden = true;
}
