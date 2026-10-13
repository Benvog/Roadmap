// A goal's journey road: its milestones as stops along a winding road. Ported from mockups/prototype.html.
import { esc, ICONS, amount, niceDate } from './ui.js';
import * as model from './model.js';

const GAP = 118, TOP = 64;   // px between stops, and above the first one
const STATE_LABEL = { done: 'Done', next: 'You are here', todo: 'Coming up', locked: 'Locked' };

// Draws into `root`. `getData()` returns the app's data; the callbacks report taps:
// `onBack()`, `onEdit(goal)`, `onMilestone(milestone)`, `onAddMilestone(goal)`, and `onLog(path)` for "Log amount".
export function createRoad(root, { getData, onBack, onEdit, onMilestone, onAddMilestone, onLog }) {
  root.innerHTML = `<div class="page">
      <div class="page-head">
        <button class="icon-btn" type="button" id="road-back" aria-label="Back to the map">${ICONS.back}</button>
        <div class="title"><p class="kicker" id="road-kicker"></p><h1 id="road-title"></h1></div>
        <button class="icon-btn" type="button" id="road-edit" aria-label="Edit this goal">${ICONS.pencil}</button>
      </div>
      <div class="chips" id="road-chips" role="group" aria-label="Your goals"></div>
      <div class="progress" id="road-progress"></div>
      <div class="road" id="road"></div>
    </div>`;
  const $ = (id) => root.querySelector('#' + id);
  let goal = null;

  function render() {
    const data = getData();
    if (!goal || !data.goals.includes(goal)) return;
    const area = data.areas.find((a) => a.id === goal.area_id);
    const parent = goal.parent_id ? data.goals.find((g) => g.id === goal.parent_id) : null;
    const unit = goal.unit || 'KES';

    $('road-kicker').textContent = [area.name, parent?.name, goal.due_date && 'Due ' + niceDate(goal.due_date)].filter(Boolean).join(' · ');
    $('road-title').textContent = goal.name;
    $('road-chips').innerHTML = model.roads(data).map((g) =>
      `<button type="button" data-goal="${g.id}" aria-pressed="${g === goal}">${esc(g.name)}</button>`).join('');

    const stops = model.milestonesOf(data, goal.id), n = stops.length;
    const { done, percent } = model.progress(stops);
    let card = `<div class="progress-row"><b>${n ? done + ' of ' + n + ' milestones' : 'No milestones yet'}</b>
        <span>${parent ? esc(amount(model.earnedOn(data, goal.id), unit)) + ' earned' : percent + '%'}</span></div>
      <span class="bar"><i style="width:${percent}%"></i></span>`;
    if (parent) {
      card += `<div class="toward"><span>Counts toward ${esc(parent.name)}
        <b>${esc(amount(model.targetTotal(data, parent.id), unit))} of ${esc(amount(parent.target_amount, unit, true))}</b></span>
        <button class="btn primary" type="button" id="log-open">Log amount</button></div>`;
    }
    $('road-progress').innerHTML = card;

    // One point per milestone, one for the "add" stop, then the finish.
    const el = $('road'), W = el.clientWidth, H = TOP + (n + 1) * GAP + 110;
    const p = [...stops, null].map((s, i) => ({ x: W * (i % 2 ? 0.74 : 0.26), y: TOP + i * GAP }));
    p.push({ x: W / 2, y: TOP + (n + 1) * GAP });
    const side = (i) => (i % 2 ? `right:${W - p[i].x - 30}px` : `left:${p[i].x - 30}px`) + `;top:${p[i].y - 30}px`;
    let svg = '', html = '';
    for (let i = 0; i <= n; i++) {
      const a = p[i], b = p[i + 1];
      const d = `M${a.x},${a.y} C${a.x},${a.y + GAP / 2} ${b.x},${b.y - GAP / 2} ${b.x},${b.y}`;
      svg += `<path class="${stops[i]?.done_at ? 'done' : ''}" d="${d}"/><path class="dash" d="${d}"/>`;
    }
    stops.forEach((m, i) => {
      const state = model.milestoneState(data, m);
      const inner = { done: ICONS.check, locked: ICONS.lock, next: ICONS.dot, todo: i + 1 }[state];
      let sub = STATE_LABEL[state];
      if (state === 'locked') sub += ' · ' + amount(model.fundedOn(data, m.id), unit) + ' of ' + amount(m.fund_amount, unit, true);
      else if (m.due_date && state !== 'done') sub += ' · due ' + niceDate(m.due_date);
      html += `<button class="stop ${state}${i % 2 ? ' right' : ''}" type="button" data-id="${m.id}" style="${side(i)};max-width:${W * 0.74 + 20}px">
        <span class="dot">${inner}</span><span><b>${esc(m.name)}</b><small>${esc(sub)}</small></span></button>`;
    });
    html += `<button class="stop add-stop${n % 2 ? ' right' : ''}" type="button" data-add="milestone" style="${side(n)}">
      <span class="dot">+</span><span><b>Add a milestone</b></span></button>`;
    const reached = n > 0 && done === n;
    html += `<div class="finish${reached ? ' reached' : ''}" style="left:${p[n + 1].x}px;top:${p[n + 1].y - 30}px">
      <div class="dot">${ICONS.flag}</div><b>${esc(goal.name)}</b>
      <small>${parent ? 'Feeds: ' + esc(parent.name) : reached ? 'Goal reached' : 'Finish line'}</small></div>`;

    const focused = document.activeElement?.dataset?.id;
    el.style.height = H + 'px';
    el.innerHTML = `<svg width="${W}" height="${H}" aria-hidden="true">${svg}</svg>${html}`;
    if (focused) el.querySelector(`[data-id="${focused}"]`)?.focus({ preventScroll: true });
  }

  $('road-back').addEventListener('click', () => onBack());
  $('road-progress').addEventListener('click', (e) => { if (e.target.closest('#log-open')) onLog(goal); });
  $('road-edit').addEventListener('click', () => onEdit(goal));
  $('road-chips').addEventListener('click', (e) => {
    const id = e.target.closest('[data-goal]')?.dataset.goal;
    const next = id && getData().goals.find((g) => g.id === id);
    if (next) { goal = next; render(); }
  });
  $('road').addEventListener('click', (e) => {
    const stop = e.target.closest('.stop');
    if (!stop) return;
    if (stop.dataset.add) return onAddMilestone(goal);
    onMilestone(getData().milestones.find((m) => m.id === stop.dataset.id));
  });
  // The road is laid out from its width, so it is redrawn when that changes.
  const off = new AbortController();
  addEventListener('resize', () => { if (!root.hidden) render(); }, { signal: off.signal });

  return {
    show(next) { goal = next; render(); scrollTo(0, 0); },
    render,
    goal: () => goal,
    destroy() { off.abort(); },
  };
}
