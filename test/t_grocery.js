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
ck('  ^ and with a room and its walls', (L.ROOMS || []).length === 1 && (L.walls || []).length === 4,
   (L.ROOMS || []).length + ' rooms, ' + (L.walls || []).length + ' walls');

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

console.log(`grocery: ${pass} pass, ${fail} fail`);
console.log(fail ? 'GROCERY: RED ❌' : 'GROCERY: GREEN ✅ (the seam holds an empty room)');
process.exit(fail ? 1 : 0);
