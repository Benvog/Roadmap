// The branching map: You in the middle, your areas around you, goals and paths unfolding from them.
// Ported from mockups/prototype.html.
import { esc, ICONS, amount } from './ui.js';
import * as model from './model.js';

const AREA_GAP = 132, GOAL_GAP = 104, SIDE_GAP = 150, SLOT_W = 166, SLOT_H = 76;
const LINE_EACH = 110, LINE_TIME = 240;   // ms between siblings, and for one line to draw
const OVERVIEW = 0.82;                    // the overview sits a little further out than full size

const ease = (t) => 1 - (1 - t) ** 3;
const unit = (t) => Math.min(1, Math.max(0, t));
const mix = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function edgePath({ a, b, straight, vertical }) {
  if (straight) return `M${a.x},${a.y} L${b.x},${b.y}`;
  if (vertical) { const m = (a.y + b.y) / 2; return `M${a.x},${a.y} C${a.x},${m} ${b.x},${m} ${b.x},${b.y}`; }
  const m = (a.x + b.x) / 2;
  return `M${a.x},${a.y} C${m},${a.y} ${m},${b.y} ${b.x},${b.y}`;
}

// `onAdd(kind, parentRow)` and `onEdit(kind, row)` are called when a "+" or a pencil is tapped,
// `onOpen(goalRow)` when a goal or a path is tapped, and `onHabits(areaRow)` when an area's Habits node is tapped.
export function createMap(root, { onAdd, onEdit, onOpen, onHabits }) {
  root.innerHTML = `<div id="viewport"><div id="world"><svg id="edges" aria-hidden="true"></svg><div id="nodes"></div></div></div>
    <div class="zoom">
      <button class="icon-btn" type="button" data-zoom="in" aria-label="Zoom in">+</button>
      <button class="icon-btn" type="button" data-zoom="out" aria-label="Zoom out">−</button>
      <button class="icon-btn" type="button" data-zoom="home" aria-label="Back to the centre">◎</button>
    </div>
    <div class="hint" id="hint">Tap You to open your map</div>`;
  const $ = (id) => root.querySelector('#' + id);
  const vp = $('viewport'), world = $('world'), nodesEl = $('nodes'), edgesEl = $('edges'), hint = $('hint');
  const off = new AbortController(), listen = { signal: off.signal };

  const open = new Set();
  const view = { x: 0, y: 0, k: 1 };
  let data = { areas: [], goals: [], milestones: [], entries: [], habits: [], habit_checkins: [] };
  let byId = {}, seen = new Set();

  // ---------- Layout ----------
  const addNode = (src, add) => ({ id: src.id + '-add', type: 'add', add, src, kids: [], sw: 56, sh: 76 });
  // A target unfolds its paths and a "+" to add one. A plain goal or a path opens its road instead of unfolding.
  const goalNode = (g) => {
    const kind = model.kindOf(g);
    return { id: g.id, type: 'goal', kind, src: g, kids: kind === 'target' ? [...model.pathsOf(data, g.id).map(goalNode), addNode(g, 'path')] : [] };
  };
  // Each area unfolds its goals, a "+" to add a goal, and its Habits node.
  const buildTree = () => data.areas.map((a) => ({ id: a.id, type: 'area', src: a, kids: [
    ...model.goalsIn(data, a.id).map(goalNode), addNode(a, 'goal'), { id: a.id + '-habits', type: 'habits', src: a, kids: [], sw: 142, sh: 64 }] }));
  // Room a branch needs across its direction of growth (px, py is that sideways axis).
  const span = (n, px, py) => (open.has(n.id) && n.kids.length
    ? n.kids.reduce((sum, k) => sum + span(k, px, py), 0)
    : Math.abs(px) * (n.sw || SLOT_W) + Math.abs(py) * (n.sh || SLOT_H));

  function layout() {
    const you = { id: 'you', type: 'you', x: 0, y: 0 }, nodes = [you], edges = [];
    const place = (n, x, y, d, parent) => {
      Object.assign(n, { x, y, d, parent });
      nodes.push(n);
      if (!open.has(n.id)) return;
      if (n.type === 'area') nodes.push({ id: n.id + '-edit', type: 'edit', kind: 'area', src: n.src, parent: n, x: x + 38, y: y - 38 });
      if (n.kind === 'target') nodes.push({ id: n.id + '-edit', type: 'edit', kind: 'target', src: n.src, parent: n, x: x + 76, y: y - 30 });
      const [dx, dy] = d;
      let px = dy, py = -dx;
      if (py < -1e-9 || (Math.abs(py) < 1e-9 && px < 0)) { px = -px; py = -py; }
      const gap = Math.abs(dy) * GOAL_GAP + Math.abs(dx) * SIDE_GAP;
      let at = -span(n, px, py) / 2;
      for (const k of n.kids) {
        const w = span(k, px, py), shift = at + w / 2;
        at += w;
        edges.push({ a: n, b: k, vertical: Math.abs(dy) >= Math.abs(dx) });
        place(k, x + dx * gap + px * shift, y + dy * gap + py * shift, d, n);
      }
    };
    if (!open.has('you')) return { nodes, edges };
    const areas = buildTree(), R = Math.max(AREA_GAP, 16 * areas.length);
    areas.forEach((a, i) => {
      const angle = -Math.PI / 2 + i * 2 * Math.PI / areas.length, d = [Math.cos(angle), Math.sin(angle)];
      edges.push({ a: you, b: a, straight: true });
      place(a, d[0] * R, d[1] * R, d, you);
    });
    nodes.push({ id: 'add-area', type: 'add', add: 'area', parent: you, x: 40, y: 40 });
    return { nodes, edges };
  }

  function nodeHTML(n) {
    const at = `left:${n.x}px;top:${n.y}px`;
    const cls = (seen.has(n.id) ? '' : ' new') + (open.has(n.id) ? ' open' : '');
    if (n.type === 'you') return `<button class="node you${open.has('you') ? '' : ' closed'}" data-id="you" style="${at}" aria-expanded="${open.has('you')}">You</button>`;
    if (n.type === 'area') {
      const p = model.areaProgress(data, n.id).percent, hasGoals = n.kids.length > 2;
      return `<button class="node area${cls}" data-id="${n.id}" style="${at};--p:${p}" aria-expanded="${open.has(n.id)}">
        <span class="disc"><b>${esc(n.src.name)}</b><small>${hasGoals ? p + '%' : 'No goals'}</small></span></button>`;
    }
    if (n.type === 'goal') {
      const g = n.src, unit = g.unit || 'KES';
      if (n.kind === 'target') {
        const have = model.targetTotal(data, g.id), want = Number(g.target_amount);
        return `<button class="node goal${cls}" data-id="${n.id}" style="${at}" aria-expanded="${open.has(n.id)}"><b>${esc(g.name)}</b>
          <small>${esc(amount(have, unit))} of ${esc(amount(want, unit, true))}</small>
          <span class="bar"><i style="width:${Math.min(100, 100 * have / want)}%"></i></span></button>`;
      }
      const { done, total } = model.progress(model.milestonesOf(data, g.id));
      const steps = total ? `${done} of ${total} done` : 'No milestones yet';
      const sub = n.kind === 'path' ? (total ? `${done} of ${total} · ` : '') + amount(model.earnedOn(data, g.id), unit) + (total ? '' : ' earned') : steps;
      return `<button class="node goal${cls}" data-id="${n.id}" style="${at}"><b>${esc(g.name)}</b><small>${esc(sub)}</small></button>`;
    }
    if (n.type === 'habits') {
      const today = model.localDay(), due = model.habitsIn(data, n.src.id).map((h) => model.habitStatus(data, h, today)).filter((s) => s.due);
      const none = !model.habitsIn(data, n.src.id).length;
      return `<button class="node habits${cls}" data-id="${n.id}" style="${at}"><b>Habits</b>
        <small>${none ? 'None yet' : due.length ? due.filter((s) => s.done).length + ' of ' + due.length + ' today' : 'All done this week'}</small></button>`;
    }
    if (n.type === 'edit') return `<button class="node edit${cls}" data-id="${n.id}" style="${at}" aria-label="Edit ${esc(n.src.name)}">${ICONS.pencil}</button>`;
    const label = 'Add ' + (n.add === 'area' ? 'an area' : 'a ' + n.add + ' to ' + n.src.name);
    return `<button class="node add${cls}" data-id="${n.id}" style="${at}" aria-label="${esc(label)}">+<small>${n.add[0].toUpperCase() + n.add.slice(1)}</small></button>`;
  }

  // ---------- Drawing, with the opening motion: each line draws out of the parent, then its node pops in ----------
  // `shown` is where every node is drawn right now, so a change can animate from it.
  let shown = {}, lastEdges = [], anim = 0, snap = 0;
  function render() {
    const focused = document.activeElement?.dataset?.id;
    const { nodes, edges } = layout();
    const old = byId;
    byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

    // A node starts where it is now; a new one starts where its parent is now, and takes its turn among its siblings.
    const start = (n) => {
      for (let p = n; p; p = p.parent) if (shown[p.id]) return { ...shown[p.id] };
      return { x: n.x, y: n.y };
    };
    const from = {}, to = {}, els = {}, turn = {}, count = {};
    for (const n of nodes) {
      from[n.id] = start(n);
      to[n.id] = { x: n.x, y: n.y };
      if (!shown[n.id]) { const key = n.parent?.id || ''; turn[n.id] = count[key] = (count[key] ?? -1) + 1; }
    }

    // Nodes that are going away fold back into the nearest parent that stays, and fade.
    const leaving = [...nodesEl.children].filter((el) => !byId[el.dataset.id] && shown[el.dataset.id]);
    for (const id in shown) if (!byId[id] && !leaving.some((el) => el.dataset.id === id)) delete shown[id];
    for (const el of leaving) {
      const id = el.dataset.id;
      let p = old[id]?.parent;
      while (p && !byId[p.id]) p = p.parent;
      from[id] = { ...shown[id] };
      to[id] = p ? { x: byId[p.id].x, y: byId[p.id].y } : from[id];
      el.classList.remove('new');
      el.classList.add('leaving');
      el.style.visibility = '';
      els[id] = el;
    }
    const holder = document.createElement('div');
    holder.innerHTML = nodes.map(nodeHTML).join('');
    const fresh = [...holder.children];
    for (const el of fresh) els[el.dataset.id] = el;
    nodesEl.replaceChildren(...leaving, ...fresh);

    const live = edges.map((e) => ({ a: e.a.id, b: e.b.id, straight: e.straight, vertical: e.vertical }));
    const fading = lastEdges.filter((e) => !byId[e.b] && to[e.a] && to[e.b]);
    lastEdges = live;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const D = still ? 0 : Math.max(340, LINE_TIME + LINE_EACH * Math.max(0, ...Object.values(turn)));
    if (!still) for (const id in turn) { els[id].classList.remove('new'); els[id].style.visibility = 'hidden'; }
    const t0 = performance.now();
    cancelAnimationFrame(anim);
    clearTimeout(snap);
    const frame = (now) => {
      const ms = Math.min(D, Math.max(0, now - t0)), done = ms >= D, shift = done ? 1 : ease(unit(ms / 340));
      const tips = {};
      for (const id in to) {
        let p;
        if (id in turn && !still) {
          // The line's tip travels; the node waits hidden in its place until the tip arrives.
          const t = done ? 1 : unit((ms - LINE_EACH * turn[id]) / LINE_TIME);
          tips[id] = mix(from[id], to[id], ease(t));
          p = to[id];
          if (t >= 1 && els[id].style.visibility) { els[id].style.visibility = ''; els[id].classList.add('new'); }
        } else p = mix(from[id], to[id], shift);
        shown[id] = { x: p.x, y: p.y };
        els[id].style.left = p.x + 'px';
        els[id].style.top = p.y + 'px';
      }
      const d = (e) => edgePath({ ...e, a: shown[e.a], b: tips[e.b] || shown[e.b] });
      edgesEl.innerHTML = live.map((e) => `<path d="${d(e)}"/>`).join('')
        + (done ? '' : fading.map((e) => `<path style="opacity:${1 - shift}" d="${d(e)}"/>`).join(''));
      if (!done) { anim = requestAnimationFrame(frame); return; }
      for (const el of leaving) { delete shown[el.dataset.id]; el.remove(); }
    };
    frame(t0);
    // If frames stop coming (a hidden tab), still land on the final layout.
    snap = setTimeout(() => { cancelAnimationFrame(anim); frame(t0 + D + 1); }, D + 80);

    seen = new Set(nodes.map((n) => n.id));
    if (focused) nodesEl.querySelector(`[data-id="${focused}"]:not(.leaving)`)?.focus({ preventScroll: true });
  }

  // ---------- Camera ----------
  function apply(glide) {
    world.classList.toggle('glide', !!glide);
    vp.classList.toggle('glide', !!glide);
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`;
    vp.style.backgroundSize = `${26 * view.k}px ${26 * view.k}px`;
    vp.style.backgroundPosition = `${view.x}px ${view.y}px`;
  }
  function centre(glide) {
    Object.assign(view, { x: vp.clientWidth / 2, y: vp.clientHeight * 0.45, k: OVERVIEW });
    apply(glide);
  }
  // Opening a node travels in to full size and puts it on the side it grows away from, clear of the top bar
  // and the Today strip (about 70px) along the bottom.
  function focusOn(n) {
    view.k = 1;
    const w = vp.clientWidth, h = vp.clientHeight - 70, [dx, dy] = n.d;
    const deeper = n.type === 'area' ? 0 : 80;
    view.x = w / 2 - dx * (w / 2 - 84) - n.x * view.k;
    view.y = h / 2 + 40 - dy * (h / 2 - 110 - deeper) - n.y * view.k;
    apply(true);
  }
  function zoomAt(k, cx, cy) {
    k = Math.min(2.2, Math.max(0.45, k));
    const wx = (cx - view.x) / view.k, wy = (cy - view.y) / view.k;
    Object.assign(view, { k, x: cx - wx * k, y: cy - wy * k });
  }

  // ---------- Taps ----------
  nodesEl.addEventListener('click', (e) => {
    const n = byId[e.target.closest('.node')?.dataset.id];
    if (!n) return;
    hint.classList.add('gone');
    if (n.type === 'you') {
      // You opens the areas; tapping it again folds the whole map back up.
      if (open.has('you')) open.clear(); else open.add('you');
      render();
      return centre(true);
    }
    if (n.type === 'add') return onAdd(n.add, n.src);
    if (n.type === 'edit') return onEdit(n.kind, n.src);
    if (n.type === 'habits') return onHabits(n.src);
    if (n.type === 'goal' && n.kind !== 'target') return onOpen(n.src);
    if (open.has(n.id)) open.delete(n.id); else open.add(n.id);
    render();
    if (open.has(n.id)) focusOn(byId[n.id]);
    else if (n.type === 'area') centre(true);
    else focusOn(byId[n.parent.id]);
  }, listen);

  // ---------- Drag to pan, pinch or wheel to zoom ----------
  const pts = new Map();
  let drag = null, pinch = null, moved = false;
  vp.addEventListener('pointerdown', (e) => {
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; moved = false; }
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: dist(a, b), k: view.k, wx: ((a.x + b.x) / 2 - view.x) / view.k, wy: ((a.y + b.y) / 2 - view.y) / view.k };
      moved = true;
    }
  }, listen);
  addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size === 2) {
      const [a, b] = [...pts.values()];
      const k = Math.min(2.2, Math.max(0.45, pinch.k * dist(a, b) / pinch.d));
      Object.assign(view, { k, x: (a.x + b.x) / 2 - pinch.wx * k, y: (a.y + b.y) / 2 - pinch.wy * k });
      apply();
    } else if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.hypot(dx, dy) > 6) moved = true;
      if (moved) { view.x = drag.vx + dx; view.y = drag.vy + dy; vp.classList.add('dragging'); apply(); }
    }
  }, listen);
  const lift = (e) => {
    pts.delete(e.pointerId);
    pinch = null;
    const rest = [...pts.values()][0];
    drag = rest ? { x: rest.x, y: rest.y, vx: view.x, vy: view.y } : null;
    vp.classList.remove('dragging');
  };
  addEventListener('pointerup', lift, listen);
  addEventListener('pointercancel', lift, listen);
  // A drag that ends on a node must not count as a tap on it.
  vp.addEventListener('click', (e) => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, { capture: true, signal: off.signal });
  vp.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomAt(view.k * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    apply();
  }, { passive: false, signal: off.signal });
  root.querySelector('.zoom').addEventListener('click', (e) => {
    const how = e.target.closest('[data-zoom]')?.dataset.zoom;
    if (how === 'home') return centre(true);
    if (how) { zoomAt(view.k * (how === 'in' ? 1.25 : 0.8), vp.clientWidth / 2, vp.clientHeight / 2); apply(true); }
  }, listen);
  // Keyboard: when a node off screen takes focus, bring it into view.
  nodesEl.addEventListener('focusin', (e) => {
    vp.scrollTo(0, 0);
    const r = e.target.getBoundingClientRect();
    if (r.left < 0 || r.top < 60 || r.right > vp.clientWidth || r.bottom > vp.clientHeight) {
      const n = byId[e.target.dataset.id];
      view.x = vp.clientWidth / 2 - n.x * view.k;
      view.y = vp.clientHeight / 2 - n.y * view.k;
      apply(true);
    }
  }, listen);

  return {
    setData(next) { data = next; },
    render,
    centre,
    openYou() { open.add('you'); },
    destroy() {
      off.abort();
      cancelAnimationFrame(anim);
      clearTimeout(snap);
    },
  };
}
