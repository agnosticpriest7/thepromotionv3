/* BACK OF HOUSE — a corridor along the north, every room hung off it, and a cooler whose south
   wall is the dairy wall.

   ⚠️ EVERY POSITIONAL ASSERTION RUNS AFTER A TICK. createWorld() does not finish the world:
   `blockers` is empty at module scope and is filled from CONTAINERS during the first buildGrid, so
   at tick 0 solid() cannot return true for ANY container and a standability check is measuring a
   building with no furniture in it. t_grocery_crew shipped exactly that and stayed green through
   three stations sitting inside desks.

   ⚠️ AND THE ANTI-VACUITY ANCHOR IS ON CONTAINERS, NOT WALLS. A wall-based anchor passed in the
   very world where ten containers were missing from collision, because walls and blockers are
   filled from different places. It proved the wrong subsystem was alive. */
'use strict';
const { createWorld } = require('./harness');

let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log('  ' + (c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '   ' + d : '')); c ? pass++ : fail++; };
const mk = lv => createWorld({ storage: { 'promo:level': lv, 'promo:newgame': '0', 'promo:char': '0' } });

const w = mk('grocery');
const S = w.sandbox, g = w.g, L = g.layout, sc = L.S, P = g.player;
w.run(1);                                   // <- the tick. Nothing below means anything without it.
const A = v => Math.round(v / sc);
const body = (x, y) => { try { return S.solid({ x: x - P.w / 2, y: y - P.h / 2, w: P.w, h: P.h }); } catch (e) { return true; } };
const roomOf = (x, y) => { const r = S.roomAt(x, y); return (r && r.name) || 'NONE'; };
const R = n => (L.ROOMS || []).filter(r => r.name === n);

{
  const cons = L.containers || [];
  const dead = cons.filter(c => !S.solid({ x: c.x + c.w / 2 - 2, y: c.y + c.h / 2 - 2, w: 4, h: 4 }));
  ck('solid() sees the furniture, so everything below is capable of failing', dead.length === 0,
     dead.length ? dead.length + ' of ' + cons.length + ' containers are not solid at their own centre'
                 : cons.length + ' containers, all solid at their centre');
}

/* ---- 1. the rooms, and no zone claiming the same floor twice ---------------------------- */
const BOH = ['WALK-IN COOLER', 'STORE MANAGER', 'OWNER', 'ASSISTANT MANAGER', 'BREAK ROOM', 'RECEIVING'];
{
  const missing = BOH.filter(n => R(n).length === 0);
  ck('the back of house has all its rooms', missing.length === 0,
     missing.length ? 'missing ' + missing.join(', ') : BOH.join(', '));
  ck('  ^ and a corridor to reach them by', R('BOH CORRIDOR').length >= 1,
     R('BOH CORRIDOR').length + ' corridor rect(s) — the run along the north and the spur to the shop');

  const rs = L.ROOMS || [], ov = [];
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    const a = rs[i], b = rs[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) ov.push(a.name + '/' + b.name);
  }
  ck('no two zones overlap', ov.length === 0, ov.join(', ') || rs.length + ' zones, all disjoint');
}

/* ---- 2. THE COOLER'S SOUTH WALL IS THE DAIRY WALL --------------------------------------
   The one thing this layout is not free to move: the dairy cases sit in that wall, loaded from
   inside the cooler and served from the aisle. Asserted as a RELATIONSHIP between two rooms, not
   as a coordinate, so it survives the block being re-cut. */
{
  const cool = R('WALK-IN COOLER')[0], dairy = R('DAIRY')[0];
  const share = Math.min(cool.x + cool.w, dairy.x + dairy.w) - Math.max(cool.x, dairy.x);
  const gap = dairy.y - (cool.y + cool.h);
  ck('the cooler sits directly above the dairy run', share > 0 && gap >= 0 && gap <= Math.round(24 * sc),
     A(share) + ' authored of shared width, ' + A(gap) + ' between them (one wall)');

  const cx = Math.max(cool.x, dairy.x) + share / 2;
  ck('  ^ and it is a wall, not a gap you can walk through', body(cx, cool.y + cool.h + gap / 2),
     'the dairy wall is solid at x=' + A(cx));

  const cases = (L.containers || []).filter(c => /Dairy/i.test(c.label || ''));
  const under = cases.filter(c => c.x >= cool.x && c.x <= cool.x + cool.w);
  ck('  ^ and the dairy cases are in that wall, under the cooler',
     cases.length >= 2 && under.length === cases.length,
     cases.length + ' dairy case(s), ' + under.length + ' of them under the cooler');
}

/* ---- 3. RECEIVING TOUCHES THE OUTSIDE, so a truck can back up to it --------------------- */
{
  const rec = R('RECEIVING')[0], ship = R('SHIPPING / RECEIVING')[0], yard = R('YARD')[0];
  ck('there is a shipping bay outside the building', !!ship && !!yard,
     ship ? 'SHIPPING / RECEIVING ' + A(ship.w) + 'x' + A(ship.h) + ' with a yard below it' : 'absent');
  const atEdge = ship && (ship.x + ship.w >= L.W - Math.round(20 * sc) || ship.y <= Math.round(20 * sc));
  ck('  ^ and it is against the outside of the world, where a truck can reach it', !!atEdge,
     ship ? 'east edge at ' + A(ship.x + ship.w) + ' of ' + A(L.W) : '');
  let open = 0;
  for (let y = ship.y; y < ship.y + ship.h; y += Math.round(4 * sc))
    if (!body(rec.x + rec.w + Math.round(8 * sc), y)) open += 4;
  ck('  ^ and the dock is a hole in the wall, not a painted one', open >= 40,
     open + ' authored of open dock between RECEIVING and the yard');
}

/* ---- 4. EVERY ROOM HAS ITS OWN DOOR ONTO A CORRIDOR ------------------------------------
   The point of the re-plan. The old wing hung off one door that opened through the Owner's office.
   Measured by walking each room's shared edge and looking for a stretch no wall covers -- not by
   trusting that a gap was authored somewhere. */
{
  const cors = R('BOH CORRIDOR'), walls = L.walls || [], STEP = Math.round(4 * sc);
  const doorway = (r, c) => {
    let best = 0, run = 0;
    if (Math.abs(c.y + c.h - r.y) < Math.round(20 * sc)) {
      for (let x = Math.max(r.x, c.x); x < Math.min(r.x + r.w, c.x + c.w); x += STEP) {
        const blocked = walls.some(v => x >= v.x && x < v.x + v.w && r.y >= v.y - 2 && r.y <= v.y + v.h + 2);
        run = blocked ? 0 : run + 4; best = Math.max(best, run);
      }
    }
    run = 0;
    if (Math.abs(c.x + c.w - r.x) < Math.round(20 * sc)) {
      for (let y = Math.max(r.y, c.y); y < Math.min(r.y + r.h, c.y + c.h); y += STEP) {
        const blocked = walls.some(v => y >= v.y && y < v.y + v.h && r.x >= v.x - 2 && r.x <= v.x + v.w + 2);
        run = blocked ? 0 : run + 4; best = Math.max(best, run);
      }
    }
    return best;
  };
  const noDoor = BOH.filter(n => !cors.some(c => doorway(R(n)[0], c) >= 50));
  ck('every back room opens onto a corridor, not onto another room', noDoor.length === 0,
     noDoor.length ? noDoor.join(', ') + ' have no doorway' : BOH.length + ' rooms, each with its own door');
}

/* ---- 5. and you can actually walk to them ----------------------------------------------- */
{
  const CELL = Math.round(20 * sc), cel = q => ({ r: Math.floor(q.y / CELL), c: Math.floor(q.x / CELL) });
  const from = S.snapTarget(Math.round(g.player.x), Math.round(g.player.y));
  /* ⚠️ snapTarget CAN SNAP A TARGET OUT THROUGH A WALL, and then this measures a walk to the
     corridor outside and calls the room reachable. It did exactly that once. */
  const targets = BOH.concat(['BOH CORRIDOR']).map(n => {
    const r = R(n)[0], q = S.snapTarget(Math.round(r.x + r.w / 2), Math.round(r.y + r.h / 2));
    return { name: n, q: q, inside: q.x >= r.x && q.x <= r.x + r.w && q.y >= r.y && q.y <= r.y + r.h };
  });
  const escaped = targets.filter(t => !t.inside).map(t => t.name);
  ck('  ^ and each target is genuinely inside its own room', escaped.length === 0,
     escaped.length ? escaped.join(', ') + ' snapped out through a wall' : 'none snapped out');
  const stuck = targets.filter(t => {
    let path = null;
    try { path = S.astar(cel(from).r, cel(from).c, cel(t.q).r, cel(t.q).c); } catch (e) {}
    return !path;
  }).map(t => t.name);
  ck('  ^ and every one can be walked to from where the player comes in', stuck.length === 0,
     stuck.length ? stuck.join(', ') : targets.length + ' spaces, all reachable on foot');
}

/* ---- 6. THE SWING DOORS OPEN ONTO FLOOR ------------------------------------------------
   They opened into the middle of the deli counter once, and the entire back of house was
   unreachable while every probe still said the doorway was a clean 90-unit gap. The gap was fine;
   the floor beyond it was not. So check the floor, not the gap. */
{
  const spur = R('BOH CORRIDOR').slice().sort((a, b) => (b.y + b.h) - (a.y + a.h))[0];
  const belowY = spur.y + spur.h + Math.round(30 * sc);
  let open = 0;
  for (let x = spur.x; x < spur.x + spur.w; x += Math.round(4 * sc)) if (!body(x, belowY)) open += 4;
  ck('the swing doors open onto shop floor, not into a fixture', open >= 40,
     open + ' authored of clear floor across the doorway, 30u into the shop');
}

/* ---- 7. stations, and the huddle -------------------------------------------------------- */
{
  const bad = g.desks.filter(d => d.station).filter(d => body(d.x + d.w / 2, d.y + d.h / 2));
  ck('every crew station is somewhere a body can stand', bad.length === 0,
     bad.length ? bad.map(d => d.owner).join(', ') : g.desks.filter(d => d.station).length + ' stations');

  const homed = ['Lorne', 'Merv', 'Garret'].map(nm => {
    const d = g.desks.filter(x => x.station).find(x => (x.owner || '').indexOf(nm) === 0);
    return { nm: nm, room: d ? roomOf(d.x + d.w / 2, d.y + d.h / 2) : 'NONE' };
  });
  ck('the three back-office rungs each work in their own office',
     homed.every(h => ['STORE MANAGER', 'OWNER', 'ASSISTANT MANAGER'].indexOf(h.room) >= 0),
     homed.map(h => h.nm + ' in ' + h.room).join(', '));

  const mc = S.meetingCentre(), mr = roomOf(mc.x, mc.y);
  ck('the store huddle happens indoors, off the shop floor',
     mr !== 'NONE' && ['GROCERY', 'FRONT END', 'PRODUCE', 'ENTRANCE', 'DAIRY', 'DELI', 'BAKERY'].indexOf(mr) < 0,
     '(' + A(mc.x) + ',' + A(mc.y) + ') -> ' + mr);
  ck('  ^ and somewhere a body can stand', !body(mc.x, mc.y), 'a 16x16 body fits');
}

/* ---- 8. THE OFFICE IS UNTOUCHED --------------------------------------------------------- */
{
  const ow = mk('office'); ow.run(1);
  const OS = ow.sandbox, oL = ow.g.layout;
  const omc = OS.meetingCentre(), orm = (OS.roomAt(omc.x, omc.y) || {}).name || 'NONE';
  ck('the office still huddles in its own meeting room', orm === 'MEETING ROOM',
     '(' + Math.round(omc.x / oL.S) + ',' + Math.round(omc.y / oL.S) + ') -> ' + orm);
  ck('  ^ and has none of the store on its floor plan',
     !(oL.ROOMS || []).some(r => ['WALK-IN COOLER', 'BOH CORRIDOR', 'YARD', 'SHIPPING / RECEIVING', 'DAIRY'].indexOf(r.name) >= 0),
     'no cooler, corridor, yard, dock or dairy zones in the office');
}

console.log('\nBACK OF HOUSE: ' + pass + ' pass, ' + fail + ' fail');
console.log(fail ? 'BACK OF HOUSE: RED ❌' : 'BACK OF HOUSE: GREEN ✅ (a corridor, a cooler on the dairy wall, and a dock)');
process.exit(fail ? 1 : 0);
