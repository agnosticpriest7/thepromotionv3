/* GROCERY — the loadLevel seam, proved by putting the smallest possible world through it.

   One empty room, no props, no cast, no ladder. If a bare room boots, walks and saves, the seam
   is real; if it doesn't, we found out with nothing invested.

   Asserts BEHAVIOUR, not coordinates (§14): the room is derived from the live world, the
   enclosure is a flood fill over the game's own nav grid rather than a wall position, and the
   level a save is in is read back out of a snapshot rather than off a private variable.

   The grocery world can only be built at BOOT — loadLevel() runs before scaleWorld(), which
   scales in place and must run exactly once — so this drives createWorld({storage:...}) to seed
   the boot handoff. A default createWorld() is still the office, and must stay that way. */
'use strict';
const { createWorld } = require('./harness');

let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${d ? '   ' + d : ''}`); c ? pass++ : fail++; };

/* ---- the office default must be untouched by any of this ------------------------------- */
{
  const o = createWorld();
  ck('a default world is still the OFFICE', o.g.desks.length > 0 && o.g.NPCS.length > 0,
     o.g.desks.length + ' desks, ' + o.g.NPCS.length + ' NPCs');
}

const w = createWorld({ storage: { 'promo:level': 'grocery' } });
const S = w.sandbox, g = w.g, p = g.player, L = g.layout || {};
const CELL = Math.round(20 * 1.8);

/* ---- 1. it built, and it built EMPTY ---------------------------------------------------- */
ck('grocery builds with no cast and no furniture',
   g.NPCS.length === 0 && g.desks.length === 0,
   g.NPCS.length + ' NPCs, ' + g.desks.length + ' desks');
/* The zone list IS the spec for this floor, so it is named here deliberately (§14: game-rule
   constants belong hard-coded — a test SHOULD fail when the store is re-planned). This replaced
   "1 room, 4 walls", which was the empty-room shape and went correctly red when a floor arrived. */
{
  const want = ['ENTRANCE','FRONT END','GROCERY','PRODUCE','BAKERY','DELI','RECEIVING','BREAK ROOM',
                'STORE MANAGER','OWNER','STAFF WC'];
  const have = (L.ROOMS || []).map(r => r.name);
  const missing = want.filter(n => have.indexOf(n) < 0);
  ck('  ^ and with every named zone on the plan', missing.length === 0 && (L.walls || []).length >= 6,
     have.length + ' zones, ' + (L.walls || []).length + ' walls' + (missing.length ? ' — MISSING ' + missing.join(', ') : ''));
}

/* ---- 2. the nav grid coped with a world that has no desks ------------------------------- */
let total = 0, walkable = 0;
for (let y = 0; y < L.H; y += CELL) for (let x = 0; x < L.W; x += CELL) {
  total++; if (S.walkableAt(x, y)) walkable++;
}
ck('buildGrid produced a walkable world without any desks', walkable > total * 0.5,
   walkable + '/' + total + ' cells walkable');

/* ---- 3. the spawn is somewhere you can actually stand ----------------------------------- */
ck('the spawn point is walkable', S.walkableAt(Math.round(p.x), Math.round(p.y)),
   'spawn ' + Math.round(p.x) + ',' + Math.round(p.y));

/* ---- 4. THE ROOM IS ENCLOSED ------------------------------------------------------------
   Flood fill the nav grid from the spawn using the game's own walkableAt, and assert it never
   reaches the outer band. Coordinate-free: resize the room, move the walls, and this still
   means the same thing. */
{
  const cols = Math.floor(L.W / CELL), rows = Math.floor(L.H / CELL);
  const seen = new Set(), q = [];
  const key = (r, c) => r + ',' + c;
  const sr = Math.floor(p.y / CELL), sc = Math.floor(p.x / CELL);
  q.push([sr, sc]); seen.add(key(sr, sc));
  let escaped = null;
  while (q.length) {
    const [r, c] = q.shift();
    if (r <= 0 || c <= 0 || r >= rows - 1 || c >= cols - 1) { escaped = [r, c]; break; }
    for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nr = r + dr, nc = c + dc, k = key(nr, nc);
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || seen.has(k)) continue;
      if (!S.walkableAt(nc * CELL + CELL / 2, nr * CELL + CELL / 2)) continue;
      seen.add(k); q.push([nr, nc]);
    }
  }
  ck('the room is enclosed — no walk from spawn to the outer edge', escaped === null,
     escaped ? 'escaped at row/col ' + escaped.join(',') : 'flood filled ' + seen.size + ' cells, none on the edge');
  ck('  ^ and the fill is a real room, not one cell', seen.size > 100, seen.size + ' reachable cells');
}

/* ---- 5. it runs without the office's furniture underneath it ---------------------------- */
{
  const st = w.run(3000, { ignoreGameOver: true });
  ck('grocery ticks clean', st.throws === 0 && g.renderErrs === 0 && st.nonFinite === 0,
     'throws ' + st.throws + ', renderErrs ' + g.renderErrs);
}

/* ---- 6. a grocery save round-trips AS GROCERY -------------------------------------------
   The bug this guards is a save loading into the wrong world, which would look like a level
   design problem rather than a save problem. */
{
  const save = w.rawSave();
  const snap = save.buildSnapshot(false, null);
  ck('a grocery snapshot records its level', snap.level === 'grocery', 'level=' + snap.level);
  save.slot = 0; save.Store.save(0, snap);
  ck('  ^ and the slot row says grocery', (save.Store.list()[0] || {}).level === 'grocery');
  const applied = save.applySnapshot(save.Store.load(0));
  ck('  ^ and it loads back', applied === true);
  ck('  ^ still as grocery', save.buildSnapshot(false, null).level === 'grocery');
}

/* ---- 7. a save from ANOTHER level is never applied onto this world ----------------------
   The world is built at boot and cannot be rebuilt in place, so restoring a grocery save onto an
   office floor would put right state in a wrong world — desk owners that do not exist, a player
   in a wall — and would read as a level bug for weeks. In the browser this routes through a
   reload; with no reload available it must REFUSE rather than half-apply. */
{
  const o = createWorld();
  const OS = o.sandbox, osave = o.rawSave();
  o.startNewGame(0); o.run(1500, { ignoreGameOver: true });
  const snap = osave.buildSnapshot(false, null);
  snap.level = 'grocery'; snap.meta.level = 'grocery';        // a save from the other level
  osave.Store.save(1, snap);
  const before = o.g.desks.length + '/' + o.g.NPCS.length;
  OS.startGame(1, false);
  const after = o.g.desks.length + '/' + o.g.NPCS.length;
  ck('a save from another level is refused, not misapplied', before === after,
     'office world ' + before + ' -> ' + after + ' (desks/NPCs)');
  osave.Store.clear(1);
}

/* ---- 8. a new run cannot RELABEL the world it is already in -----------------------------
   startGame's no-reload fallback used to adopt the level the menu had picked, which in a world
   built as grocery meant currentLevel became 'office' while the floor stayed grocery — and the
   next save would claim a world it did not hold. */
{
  const gw = createWorld({ storage: { 'promo:level': 'grocery' } });
  const gsave = gw.rawSave();
  const before = gsave.buildSnapshot(false, null).level;
  gw.startNewGame(0);
  const after = gsave.buildSnapshot(false, null).level;
  ck('starting a run cannot relabel the level', before === 'grocery' && after === 'grocery',
     before + ' -> ' + after + ' (world: ' + gw.g.desks.length + ' desks, ' + gw.g.NPCS.length + ' NPCs)');
}

/* ---- 9. THE FLOOR PLAN: every zone reachable, every aisle walkable ----------------------
   Run PAST A DAY BOUNDARY before asserting any of it. The soak found tickLights threw from
   08:15 and froze the clock, and the previous branch missed it because its assertions stopped
   at 3,000 frames. A floor-plan check that only runs at boot proves the floor was right at
   08:00 and nothing more.

   Everything here is derived from the live world — zone rects come from ROOMS, aisle centres
   come from where the shelves actually are. Nothing is baked, so Kyle moving a checkout lane
   cannot rot it. */
{
  const fw = createWorld({ storage: { 'promo:level': 'grocery', 'promo:newgame': '0', 'promo:char': '0' } });
  const FS = fw.sandbox, fg = fw.g, FL = fg.layout || {};
  const st = fw.run(40000, { ignoreGameOver: true });          // clears a full day boundary
  ck('the floor survives a day boundary', st.throws === 0 && fg.renderErrs === 0 && fg.day >= 2,
     'day ' + fg.day + ', throws ' + st.throws + ', renderErrs ' + fg.renderErrs);

  const CE = Math.round(20 * 1.8);
  const cols = Math.floor(FL.W / CE), rows = Math.floor(FL.H / CE);
  const walk = (x, y) => FS.walkableAt(x, y);

  /* flood fill from where the player actually stands, after the day has rolled */
  const seen = new Set(), q = [[Math.floor(fg.player.y / CE), Math.floor(fg.player.x / CE)]];
  seen.add(q[0][0] + ',' + q[0][1]);
  let edge = false;
  while (q.length) {
    const [r, c] = q.shift();
    if (r <= 0 || c <= 0 || r >= rows - 1 || c >= cols - 1) edge = true;
    for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nr = r + dr, nc = c + dc, k = nr + ',' + nc;
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || seen.has(k)) continue;
      if (!walk(nc * CE + CE / 2, nr * CE + CE / 2)) continue;
      seen.add(k); q.push([nr, nc]);
    }
  }
  ck('the store is enclosed — no walk to the outer edge', !edge, seen.size + ' cells reachable');

  /* EVERY NAMED ZONE reachable on foot from the entrance. A zone counts as reached if any
     walkable cell inside its rect is in the fill — a zone packed with fixtures still has floor. */
  const unreachable = [];
  (FL.ROOMS || []).forEach(rm => {
    let hit = false;
    for (let y = rm.y + CE / 2; y < rm.y + rm.h && !hit; y += CE)
      for (let x = rm.x + CE / 2; x < rm.x + rm.w && !hit; x += CE) {
        const k = Math.floor(y / CE) + ',' + Math.floor(x / CE);
        if (seen.has(k)) hit = true;
      }
    if (!hit) unreachable.push(rm.name);
  });
  ck('every zone is reachable on foot from the entrance', unreachable.length === 0,
     (FL.ROOMS || []).length + ' zones' + (unreachable.length ? ' — MISSING: ' + unreachable.join(', ') : ''));

  /* the back-of-house offices specifically, through their one opening */
  const boh = (FL.ROOMS || []).filter(r => /MANAGER|OWNER|RECEIVING|BREAK|WC/.test(r.name));
  ck('  ^ including every back-of-house room', boh.length >= 4 && !boh.some(r => unreachable.includes(r.name)),
     boh.map(r => r.name).join(', '));

  /* EVERY AISLE TRAVERSABLE END TO END. Aisle centres are derived from where the shelves
     actually are: midway between each pair of adjacent shelf columns. This is the assertion the
     nav grid's 2px-a-side blocker inflation threatens, and a store is nothing but narrow aisles
     between long blockers. */
  const shelfX = [...new Set((FL.containers || []).filter(c => c.label === 'Shelf').map(c => Math.round(c.x + c.w / 2)))]
    .sort((a, b) => a - b);
  const mids = [];
  for (let i = 1; i < shelfX.length; i++) mids.push(Math.round((shelfX[i - 1] + shelfX[i]) / 2));
  const gz = (FL.ROOMS || []).find(r => r.name === 'GROCERY');
  const blocked = [];
  mids.forEach(mx => {
    for (let y = gz.y + CE / 2; y < gz.y + gz.h; y += CE) if (!walk(mx, y)) { blocked.push(mx); break; }
  });
  ck('every grocery aisle is walkable end to end', mids.length >= 3 && blocked.length === 0,
     mids.length + ' aisles at x=' + mids.join(',') + (blocked.length ? ' — BLOCKED: ' + blocked.join(',') : ''));
}

console.log(`grocery: ${pass} pass, ${fail} fail`);
console.log(fail ? 'GROCERY: RED ❌' : 'GROCERY: GREEN ✅ (the seam holds an empty room)');
process.exit(fail ? 1 : 0);
