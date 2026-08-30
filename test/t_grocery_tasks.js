/* A BAGGER'S DAY IS COMPLETABLE.

   Save-Rite's tasks were named in store words and none of them could be finished: loadLevel
   clears `objects`, and every task's `via` resolves against one. This drives each task through
   THE REAL INTERACTION PATH — build the fixture's actual menu with buildOptions(), find the item
   the player would press, call it, and check the task moved to done.

   It deliberately does NOT set task state directly. Setting `t.done=true` and asserting it is the
   uncraftable-recipes failure: it proves the test can write a boolean, not that a player can
   finish a shift. */
'use strict';
const { createWorld } = require('./harness');
let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${d ? '   ' + d : ''}`); c ? pass++ : fail++; };

const mk = lv => createWorld({ storage: Object.assign({ 'promo:newgame': '0', 'promo:char': '0' },
                                                      lv ? { 'promo:level': lv } : {}) });

/* walk the real menu for a fixture and press the item that completes a task */
function pressTaskItem(w, fixture) {
  const S = w.sandbox;
  /* buildOptions takes the {kind, ref} shape nearestInteractable produces, not the prop itself —
     handing it the raw object returns the bare [Close] menu and every completion silently "fails". */
  const t = fixture.type ? { kind: 'obj', ref: fixture } : { kind: 'desk', ref: fixture };
  let opts = null;
  try { opts = S.buildOptions(t); } catch (e) { return 'buildOptions threw: ' + e.message; }
  if (!opts || !opts.items) return 'no menu';
  const item = opts.items.find(i => !i.disabled && /\(task\)/i.test(i.label || ''));
  if (!item) return 'no task item in menu: [' + opts.items.map(i => i.label).join(' / ') + ']';
  try { item.act(); } catch (e) { return 'act threw: ' + e.message; }
  w.run(400, { ignoreGameOver: true });          // timed actions (startAct) need to tick out
  return null;
}

/* Only two tasks roll per day, so completing "today's list" exercises two pool entries out of
   seven. Reroll until every trigger kind in the rank-0 pool has been driven through the menu at
   least once — otherwise the assertion is "the two that happened to come up work". */
function completionRun(level, rolls) {
  const w = mk(level === 'office' ? null : level);
  w.run(9000, { ignoreGameOver: true });          // into a work phase
  const S = w.sandbox, g = w.g;
  const L = g.layout || {};
  const objs = L.objects || [], desks = g.desks || [];
  const done = {}, failed = {}, skipped = {};
  for (let r = 0; r < (rolls || 40); r++) {
    S.rollTasks();
    const labels = S.taskLabels(), vias = S.taskVias();
    for (let i = 0; i < labels.length; i++) {
      const via = vias[i], label = labels[i];
      if (done[via] || failed[via]) continue;
      if (via === 'coffee' || via === 'npc' || via === 'meeting') { skipped[via] = label; continue; }
      const fixture = via === 'desk' ? desks.find(d => d.owner === 'you') : objs.find(o => o.type === via);
      if (!fixture) { failed[via] = label + ' — no fixture for via:' + via; continue; }
      const before = S.taskDoneCount();
      const err = pressTaskItem(w, fixture);
      if (err) failed[via] = label + ' — ' + err;
      else if (S.taskDoneCount() <= before) failed[via] = label + ' — menu pressed but task not done';
      else done[via] = label;
    }
  }
  return { w, done, failed, skipped };
}

/* ---- 1. every grocery trigger kind actually completes --------------------------------------- */
{
  const { done, failed, skipped } = completionRun('grocery');
  Object.keys(done).forEach(v => console.log('     v [' + v + '] ' + done[v]));
  Object.keys(failed).forEach(v => console.log('     x [' + v + '] ' + failed[v]));
  Object.keys(skipped).forEach(v => console.log('     - [' + v + '] ' + skipped[v] + '   (needs an NPC)'));
  ck('every grocery trigger kind completes via the real menu',
     Object.keys(failed).length === 0 && Object.keys(done).length >= 4,
     Object.keys(done).length + ' kinds completed: ' + Object.keys(done).join(', ') +
     (Object.keys(failed).length ? ' — BROKEN: ' + Object.keys(failed).join(', ') : ''));
}

/* ---- 2. the office still completes its own, unchanged -------------------------------------- */
{
  const { done, failed } = completionRun('office');
  ck('office task completion is unchanged',
     Object.keys(failed).length === 0 && Object.keys(done).length >= 4,
     Object.keys(done).length + ' kinds completed' +
     (Object.keys(failed).length ? ' — BROKEN: ' + Object.values(failed).join('; ') : ''));
}

/* ---- 3. every fixture is reachable on foot from spawn -------------------------------------- */
{
  const w = mk('grocery');
  w.run(3000, { ignoreGameOver: true });
  const S = w.sandbox, L = w.g.layout || {};
  const CE = Math.round(20 * 1.8);
  const cols = Math.floor(L.W / CE), rows = Math.floor(L.H / CE);
  const sp = S.levelSpawnPoint();
  const seen = new Set(), q = [[Math.floor(sp.y / CE), Math.floor(sp.x / CE)]];
  seen.add(q[0][0] + ',' + q[0][1]);
  while (q.length) {
    const [r, c] = q.shift();
    for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nr = r + dr, nc = c + dc, k = nr + ',' + nc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || seen.has(k)) continue;
      if (!S.walkableAt(nc * CE + CE / 2, nr * CE + CE / 2)) continue;
      seen.add(k); q.push([nr, nc]);
    }
  }
  const near = (x, y) => {
    for (let dy = -CE * 2; dy <= CE * 2; dy += CE)
      for (let dx = -CE * 2; dx <= CE * 2; dx += CE)
        if (seen.has(Math.floor((y + dy) / CE) + ',' + Math.floor((x + dx) / CE))) return true;
    return false;
  };
  const unreachable = [];
  (L.objects || []).forEach(o => { if (!near(o.x + o.w / 2, o.y + o.h / 2)) unreachable.push(o.label); });
  (w.g.desks || []).forEach(d => { if (d.owner === 'you' && !near(d.x + d.w / 2, d.y + d.h / 2)) unreachable.push('your station'); });
  ck('every fixture is reachable on foot from spawn', unreachable.length === 0,
     ((L.objects || []).length + 1) + ' fixtures' + (unreachable.length ? ' — UNREACHABLE: ' + unreachable.join(', ') : ''));

  /* ---- 4. aisles still traversable WITH the fixtures placed ------------------------------- */
  const shelfX = [...new Set((L.containers || []).filter(c => c.label === 'Shelf').map(c => Math.round(c.x + c.w / 2)))].sort((a, b) => a - b);
  const mids = [];
  for (let i = 1; i < shelfX.length; i++) mids.push(Math.round((shelfX[i - 1] + shelfX[i]) / 2));
  const gz = (L.ROOMS || []).find(r => r.name === 'GROCERY');
  const blocked = mids.filter(mx => {
    for (let y = gz.y + CE / 2; y < gz.y + gz.h; y += CE) if (!S.walkableAt(mx, y)) return true;
    return false;
  });
  /* FOUR aisles since the re-plan: five runs, the westmost of them the frozen aisle. The count
     is an authoring fact and stays written down, so adding or dropping a run goes red here. */
  ck('every aisle is still traversable with fixtures placed', mids.length === 4 && blocked.length === 0,
     mids.length + ' aisles' + (blocked.length ? ' — BLOCKED: ' + blocked.join(',') : ''));
}

console.log(`grocery tasks: ${pass} pass, ${fail} fail`);
console.log(fail ? 'GROCERY TASKS: RED ❌' : "GROCERY TASKS: GREEN ✅ (a bagger's day completes)");
process.exit(fail ? 1 : 0);
