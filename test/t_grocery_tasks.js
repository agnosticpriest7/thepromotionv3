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
  /* ⚠️ THREE KINDS, NOT TWO. A CONTAINER HAS NO `.type`, so the old two-way test called it a
     desk and handed back the desk menu -- Snoop / Search their drawers / Plant evidence -- and
     the completion 'failed' with a menu that was never the right menu to begin with. Anything
     carrying a `kind` is a container (that is the field CONTAINERS entries use). */
  const t = fixture.type ? { kind: 'obj', ref: fixture }
          : fixture.kind || fixture.section ? { kind: 'container', ref: fixture }
          : { kind: 'desk', ref: fixture };
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
      /* ⚠️ NOT EVERY VIA LANDS ON AN `objects` ENTRY. The store's floor work completes at
       CONTAINERS -- a shelf section, or the bagging end of a checkstand -- and a lookup that
       only knows about objects reports those as "no fixture", which reads like a missing prop
       rather than a test that cannot see it. The routes are real; the enumeration was short. */
    const conts = L.containers || [];
    const fixture =
      via === 'desk'    ? desks.find(d => d.owner === 'you') :
      via === 'lane'    ? conts.find(c => /Checkstand/i.test(c.label || '')) :
      via === 'carts'   ? conts.find(c => /^Trolley/i.test(c.label || '')) :
      via === 'section' ? conts.find(c => c.section && (!g.player.storeDept || c.dept === g.player.storeDept)) :
      objs.find(o => o.type === via);
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

/* ---- SHELF SECTIONS: THE WORK HAPPENS AT THE FIXTURE ----------------------------------------
   ⚠️ EVERY CONTAINER IS A BLOCKER. buildBlockers pushes one rect per CONTAINERS entry, so the
   sixty-six sections added here are sixty-six new solid boxes -- and dropped in the aisles they
   would have walled the shop in. They are placed strictly INSIDE the fixture's own blocker, which
   is already solid, so the nav grid should see exactly what it saw before. That is the assertion
   worth having: not "sections exist" but "sections cost nothing". */
{
  const w = mk('grocery'); const g = w.g, S = w.sandbox;
  const sc = g.layout.S, A = v => Math.round(v / sc);
  w.run(400);

  const secs = g.layout.containers.filter(c => c.section);
  const byDept = {};
  secs.forEach(c => { byDept[c.dept] = (byDept[c.dept] || 0) + 1; });

  ck('the fixtures are divided into workable sections', secs.length >= 50,
     secs.length + ' sections: ' + JSON.stringify(byDept));

  /* every department a clerk can be assigned to must have somewhere to do its floor work --
     otherwise a produce clerk rolls "rotate the berries" and has nowhere to complete it */
  const need = ['grocery', 'produce', 'deli', 'bakery'];
  const without = need.filter(d => !byDept[d]);
  ck('  ^ and every department with floor work has sections to do it in', without.length === 0,
     without.length ? 'no sections in: ' + without.join(', ') : need.join(', ') + ' all covered');

  /* THE ONE THAT MATTERS: the aisles must be exactly as walkable as before */
  const runs = g.layout.levelBlockers
    .filter(b => b.h > 150 * sc && b.w < 80 * sc && b.y > 380 * sc && b.y < 720 * sc)
    .sort((a, b) => a.x - b.x);
  const blocked = [];
  for (let i = 0; i < runs.length - 1; i++) {
    const mid = Math.round((A(runs[i].x + runs[i].w) + A(runs[i + 1].x)) / 2);
    let open = 0, rows = 0;
    for (let y = 430; y <= 640; y += 10) { rows++; if (S.walkableAt(mid * sc, y * sc)) open++; }
    if (open < rows) blocked.push('x' + mid + ' ' + open + '/' + rows);
  }
  ck('  ^ and they add NO collision — every aisle is still clear end to end',
     runs.length >= 5 && blocked.length === 0,
     blocked.length ? 'pinched: ' + blocked.join(', ') : runs.length + ' runs, every aisle fully walkable');

  /* ⚠️ AND THEY MUST NOT FLOOD THE LOOT. A full container roll on all sixty-six took the store
     from 92 items on the floor to 243 -- searching anywhere else would have stopped being worth
     doing. A section is somewhere you WORK; something turning up behind the stock is occasional. */
  const inSections = secs.reduce((n, c) => n + ((c.loot || []).length), 0);
  const inFixtures = g.layout.containers.filter(c => !c.section)
    .reduce((n, c) => n + ((c.loot || []).length), 0);
  ck('  ^ and a section is sparse, so the shop is still worth searching',
     inSections < inFixtures * 0.35,
     inSections + ' items across ' + secs.length + ' sections vs ' + inFixtures + ' in the fixtures');
}

/* ---- and the floor work COMPLETES at a section, of your own department --------------------- */
{
  const w = mk('grocery'); const g = w.g, S = w.sandbox;
  w.run(2000);
  g.player.rank = 1; g.player.storeDept = 'grocery';
  for (let i = 0; i < 120 && !S.openTask('section'); i++) S.rollTasks();
  const task = S.openTask('section');
  ck('a floor job routes to a section rather than to your locker', !!task,
     task ? '"' + task.label + '"' : 'no section task ever rolled');

  if (task) {
    const mine = g.layout.containers.find(c => c.section && c.dept === 'grocery');
    g.player.x = mine.x; g.player.y = mine.y;
    const m = S.buildOptions({ kind: 'container', ref: mine });
    const item = (m.items || []).find(i => /\(task\)/.test(i.label) && !i.disabled);
    ck('  ^ and the section offers it', !!item, item ? item.label : (m.items || []).map(i => i.label).join(' | '));
    if (item) { item.act(); for (let i = 0; i < 400; i++) w.run(10); }
    ck('  ^ and working it actually completes the job', task.done === true, 'done=' + task.done);

    /* ⚠️ AND ANOTHER DEPARTMENT'S SECTION MUST REFUSE IT -- otherwise "in your aisle" is a lie
       and a grocery clerk zones the deli from the bread aisle. */
    const theirs = g.layout.containers.find(c => c.section && c.dept === 'deli');
    const m2 = S.buildOptions({ kind: 'container', ref: theirs });
    const offered = (m2.items || []).some(i => /\(task\)/.test(i.label) && !i.disabled);
    ck('  ^ and a deli section will not take a grocery clerk\'s work', !offered,
       offered ? 'the deli accepted it' : 'refused, as it should');
  }
}

/* ---- every rung's jobs match the rung's TITLE ----------------------------------------------
   ⚠️ THE TABLE WAS THE OFFICE'S, ONE ROW OUT OF STEP. Save-Rite's ladder is BAGGER > DEPARTMENT
   CLERK > DEPARTMENT MANAGER > ASSISTANT MANAGER > STORE MANAGER > OWNER, and the pool still had
   the office's rungs, so everyone above the clerk did the job of the rung below -- and the OWNER,
   who has nobody above them, prepared a district report and took a call from the district manager. */
{
  const w = mk('grocery'); const g = w.g, S = w.sandbox;
  w.run(600);
  g.player.storeDept = 'grocery';
  const labelsAt = r => { g.player.rank = r; return S.taskPoolFor(r).map(t => t.label).join(' | '); };

  const owner = labelsAt(g.RANKS.length - 1);
  ck('the OWNER does not report to a district manager', !/district/i.test(owner),
     /district/i.test(owner) ? owner : 'owner work is owner-level');

  /* every rung must have work, and no two adjacent rungs may be identical -- an offset table
     shows up as a rung wearing its neighbour's list */
  const pools = [];
  for (let r = 0; r < g.RANKS.length; r++) pools.push(labelsAt(r));
  const empty = pools.filter(p => !p.length).length;
  const dupes = pools.filter((p, i) => i > 0 && p === pools[i - 1]).length;
  ck('  ^ and every rung has its own work', empty === 0 && dupes === 0,
     g.RANKS.length + ' rungs, ' + empty + ' empty, ' + dupes + ' identical to the rung below');

  /* and every via a rung can roll must have somewhere to be completed */
  const have = {}; (g.layout.objects || []).forEach(o => { have[o.type] = 1; });
  have.desk = 1; have.npc = 1;
  have.section = g.layout.containers.some(c => c.section) ? 1 : 0;
  const dead = [];
  for (let r = 0; r < g.RANKS.length; r++) {
    g.player.rank = r;
    S.taskPoolFor(r).forEach(t => { if (!have[t.via]) dead.push('rung ' + r + ':' + t.via); });
  }
  ck('  ^ and no rung can roll a job with nowhere to do it', dead.length === 0,
     dead.length ? dead.join(', ') : 'every via has a fixture on the floor');
}

console.log(`grocery tasks: ${pass} pass, ${fail} fail`);
console.log(fail ? 'GROCERY TASKS: RED ❌' : "GROCERY TASKS: GREEN ✅ (a bagger's day completes)");
process.exit(fail ? 1 : 0);
