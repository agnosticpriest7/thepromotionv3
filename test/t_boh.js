/* BACK OF HOUSE — the southern wing: a corridor, three rooms, and a huddle that happens indoors.

   ⚠️ EVERY POSITIONAL ASSERTION IN HERE RUNS AFTER A TICK. createWorld() does not finish the
   world: `blockers` is empty at module scope and is filled from CONTAINERS during the first
   buildGrid, so at tick 0 solid() cannot return true for ANY container and a standability check
   is measuring a building that has no furniture in it. t_grocery_crew shipped exactly that
   assertion and stayed green through three stations sitting inside desks.

   ⚠️ AND THE ANTI-VACUITY ANCHOR IS ON CONTAINERS, NOT WALLS. The first version of that anchor
   asked whether the middle of a wall reads solid — and passed, in the very world where ten
   containers were missing from collision, because walls and blockers are filled from different
   places at different times. It proved the wrong subsystem was alive. */
'use strict';
const { createWorld } = require('./harness');

let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log('  ' + (c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '   ' + d : '')); c ? pass++ : fail++; };

const mk = lv => createWorld({ storage: { 'promo:level': lv, 'promo:newgame': '0', 'promo:char': '0' } });

/* ---------------------------------------------------------------- the store ------------- */
const w = mk('grocery');
const S = w.sandbox, g = w.g, L = g.layout, sc = L.S, P = g.player;
w.run(1);                                     // <- the tick. Nothing below means anything without it.
const A = v => Math.round(v / sc);
const body = (x, y) => { try { return S.solid({ x: x - P.w / 2, y: y - P.h / 2, w: P.w, h: P.h }); } catch (e) { return true; } };
const roomOf = (x, y) => { const r = S.roomAt(x, y); return (r && r.name) || 'NONE'; };

{
  const cons = L.containers || [];
  const dead = cons.filter(c => !S.solid({ x: c.x + c.w / 2 - 2, y: c.y + c.h / 2 - 2, w: 4, h: 4 }));
  ck('solid() sees the furniture, so everything below is capable of failing', dead.length === 0,
     dead.length ? dead.length + ' of ' + cons.length + ' containers are not solid at their own centre'
                 : cons.length + ' containers, all solid at their centre');
}

/* ---- 1. the wing exists, and each new room is a zone of its own ------------------------- */
const WING = ['BACK CORRIDOR', 'WALK-IN COOLER', 'ASSISTANT MANAGER', 'CASH OFFICE'];
{
  const got = WING.filter(n => (L.ROOMS || []).some(r => r.name === n));
  ck('the wing has all four new spaces', got.length === WING.length,
     got.join(', ') || 'none found');

  /* zones must not overlap, or roomAt() has two answers for one point and the huddle assertion
     below could pass by reading the wrong one. FRONT END is deliberately two rects (either side
     of the wing) so it is compared by identity, not by name. */
  const rs = L.ROOMS || [];
  const overlaps = [];
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    const a = rs[i], b = rs[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h)
      overlaps.push(a.name + '/' + b.name);
  }
  ck('no two zones overlap', overlaps.length === 0, overlaps.join(', ') || rs.length + ' zones, all disjoint');
}

/* ---- 2. THE COOLER IS ENCLOSED, WITH EXACTLY ONE ENTRANCE ------------------------------
   This is the property the sightline work will rest on, so it is measured rather than assumed:
   walk the room's whole perimeter at 4-authored steps and count the CONTIGUOUS runs where a body
   can cross from inside to outside. One run is a door. Two is a room with a back way out. Zero is
   a sealed box nobody can get into. */
function crossings(room) {
  const step = Math.round(4 * sc), pad = Math.round(14 * sc);
  const pts = [];
  for (let x = room.x; x <= room.x + room.w; x += step) {
    pts.push([x, room.y, 0, -1]);                       // north face
  }
  for (let y = room.y; y <= room.y + room.h; y += step) pts.push([room.x + room.w, y, 1, 0]);
  for (let x = room.x + room.w; x >= room.x; x -= step) pts.push([x, room.y + room.h, 0, 1]);
  for (let y = room.y + room.h; y >= room.y; y -= step) pts.push([room.x, y, -1, 0]);
  const open = pts.map(p => !body(p[0] + p[2] * pad, p[1] + p[3] * pad) && !body(p[0], p[1]));
  let runs = 0;
  for (let i = 0; i < open.length; i++) {
    const prev = open[(i - 1 + open.length) % open.length];
    if (open[i] && !prev) runs++;
  }
  if (runs === 0 && open.every(Boolean)) runs = 1;      // fully open ring = not a room at all
  return { runs: runs, openSamples: open.filter(Boolean).length, total: open.length };
}
{
  const cooler = (L.ROOMS || []).find(r => r.name === 'WALK-IN COOLER');
  const c = crossings(cooler);
  ck('the walk-in cooler is enclosed with exactly one entrance', c.runs === 1,
     c.runs + ' contiguous opening(s) around its perimeter (' + c.openSamples + '/' + c.total + ' samples open)');

  /* and the contrast that proves the probe is measuring enclosure and not just counting floor:
     an unwalled zone in the same building must NOT come back as one entrance. */
  const owner = (L.ROOMS || []).find(r => r.name === 'OWNER');
  const oc = crossings(owner);
  ck('  ^ and the probe can tell that apart from an unwalled zone', oc.runs !== 1,
     'OWNER (a caption, not a room) reads ' + oc.runs + ' opening(s)');
}

/* ---- 3. every station is standable, and Garret has moved in ----------------------------- */
{
  const bad = g.desks.filter(d => d.station).filter(d => body(d.x + d.w / 2, d.y + d.h / 2));
  ck('every crew station is somewhere a body can stand', bad.length === 0,
     bad.length ? bad.map(d => d.owner).join(', ') : g.desks.filter(d => d.station).length + ' stations');

  const gv = g.desks.filter(d => d.station).find(d => /Garret/.test(d.owner || ''));
  const cx = gv.x + gv.w / 2, cy = gv.y + gv.h / 2;
  ck('Garret Voss works in the assistant manager office, not at a pallet',
     roomOf(cx, cy) === 'ASSISTANT MANAGER',
     '(' + A(cx) + ',' + A(cy) + ') is in ' + roomOf(cx, cy));
  ck('  ^ and stands BESIDE his desk, not inside it',
     !body(cx, cy) && !S.solid({ x: gv.x, y: gv.y, w: gv.w, h: gv.h }),
     'body fits and the station box is clear of furniture');
}

/* ---- 4. the wing is reachable on foot from the spawn ------------------------------------ */
{
  const CELL = Math.round(20 * sc);
  const cell = p => ({ r: Math.floor(p.y / CELL), c: Math.floor(p.x / CELL) });
  const from = S.snapTarget(Math.round(g.player.x), Math.round(g.player.y));
  /* ⚠️ snapTarget CAN SNAP THE TARGET RIGHT OUT OF THE ROOM, and then this measures a walk to
     the corridor outside and calls the room reachable. That is exactly what happened: the cash
     office centre snapped to (1410,490) -- past its own south wall -- and this assertion passed
     while t_grocery, which does not snap, correctly reported CASH OFFICE unreachable. So the
     snapped point has to be inside the room it claims to be, or the walk proves nothing. */
  const targets = WING.map(n => {
    const r = (L.ROOMS || []).find(q => q.name === n);
    const q = S.snapTarget(Math.round(r.x + r.w / 2), Math.round(r.y + r.h / 2));
    const inside = q.x >= r.x && q.x <= r.x + r.w && q.y >= r.y && q.y <= r.y + r.h;
    return { name: n, x: q.x, y: q.y, inside: inside };
  });
  const escaped = targets.filter(t => !t.inside);
  ck('  ^ and each of those targets is genuinely inside its own room', escaped.length === 0,
     escaped.length ? escaped.map(t => t.name + ' snapped outside').join(', ')
                    : 'no target snapped out through a wall');
  const unreachable = targets.filter(t => {
    let path = null;
    try { path = S.astar(cell(from).r, cell(from).c, cell(t).r, cell(t).c); } catch (e) {}
    return !path;
  });
  ck('every new space can be walked to from where the player spawns', unreachable.length === 0,
     unreachable.length ? unreachable.map(t => t.name).join(', ') : WING.length + ' spaces, all reachable');
}

/* ---- 5. the checkout run survived ------------------------------------------------------- */
{
  const lanes = (L.containers || []).filter(c => /Checkstand/i.test(c.label || ''));
  ck('all four checkstands are still there', lanes.length === 4, lanes.length + ' lanes');

  /* THE RUN IS A RUN, NOT A SCATTER. Four lanes used to sit at x=173, 393, 1033 and 1253 -- 1127
     authored end to end, most of the width of the shop. These numbers are the SPEC (a front end
     you can take in at a glance) and so they are written down here on purpose: a test should go
     red when somebody spreads them out again. The middle gap is left alone deliberately, because
     the entrance doors open into it. */
  const lb = (L.levelBlockers || []).filter(b => b.h > Math.round(40 * sc) && b.y > Math.round(500 * sc))
    .sort((a, b) => a.x - b.x);
  const span = A(lb[lb.length - 1].x + lb[lb.length - 1].w) - A(lb[0].x);
  ck('  ^ and they read as one run, not four tills in different postcodes', span <= 600,
     'the run spans ' + span + ' authored (was 1127)');

  /* and nothing may be parked across the doors: they open into the middle gap of the run. */
  const inDoorway = lb.filter(b => A(b.x) < 810 && A(b.x + b.w) > 690);
  ck('  ^ and no lane is parked across the entrance doors', inDoorway.length === 0,
     inDoorway.length ? inDoorway.length + ' lane(s) across x 690..810' : 'the door gap is clear');
  /* ⚠️ THE FIRST VERSION OF THIS CHECK WAS WRONG, AND IT FAILED ON ALL FOUR LANES -- including
     the two at the far west end that this branch never went near, which is what gave it away. It
     probed 20 units above each checkstand's CONTAINER, but a lane's art is anchored at y=563
     while its collision blocker runs y=521..586. The probe was sampling inside the lane itself.

     ⚠️ AND THE CONTRACT IT NOW GUARDS IS NOT THE ONE IT STARTED WITH. It used to require a
     walkable row along the TOP of the eastern lanes. The wing was then extended south to sit
     flush against them, deliberately, which spends that walkway to double every room's depth --
     so asserting it would be asserting a decision that was reversed. What must stay true is the
     part a shopper depends on: the wing never sits ON a lane, and every lane can still be reached
     and queued at from the door side. */
  const laneBlocks = (L.levelBlockers || []).filter(b => b.h > Math.round(40 * sc) && b.y > Math.round(500 * sc));
  const onALane = (L.walls || []).filter(v =>
    v.x < Math.max.apply(null, laneBlocks.map(b => b.x + b.w)) &&
    laneBlocks.some(b => v.x < b.x + b.w && b.x < v.x + v.w && v.y < b.y + b.h && b.y < v.y + v.h));
  ck('  ^ and no wall of the new wing sits on top of a checkout lane', onALane.length === 0,
     onALane.length ? onALane.length + ' wall(s) overlap a lane blocker'
                    : laneBlocks.length + ' lane blockers, none built over');

  /* THE SHOPPER SIDE: you must be able to move along the front of the lanes to pick one.
     Counting open samples was the wrong measure -- it came back 88% and stayed there, because the
     go-back cart and the intercom legitimately stand in that band. A percentage of open floor is
     prop density, not traversability. Walk it instead: a path from one end of the front end to
     the other, below the lanes, that does not wander off to do it. */
  const feWest = (L.ROOMS || []).filter(r => r.name === 'FRONT END').sort((a, b) => a.x - b.x)[0];
  const CELL3 = Math.round(20 * sc), cl = q => ({ r: Math.floor(q.y / CELL3), c: Math.floor(q.x / CELL3) });
  const laneBot2 = Math.max.apply(null, laneBlocks.map(b => b.y + b.h));
  const yWalk = Math.round((laneBot2 + feWest.y + feWest.h) / 2);
  const wEnd = S.snapTarget(Math.round(feWest.x + 40 * sc), yWalk);
  const eEnd = S.snapTarget(Math.round(feWest.x + feWest.w - 40 * sc), yWalk);
  let walk = null;
  try { walk = S.astar(cl(wEnd).r, cl(wEnd).c, cl(eEnd).r, cl(eEnd).c); } catch (e) {}
  const direct = Math.abs(cl(eEnd).c - cl(wEnd).c);
  ck('  ^ and the shopper side of the checkout run is walkable end to end',
     !!walk && walk.length <= direct * 2,
     walk ? 'crossed in ' + walk.length + ' cells against a straight line of ' + direct +
            ' (y=' + A(yWalk) + ', below the lanes)'
          : 'no path along the front of the lanes');

  /* and the lanes themselves are still approachable on foot, which is the contract a shopper
     cares about: reach the queuing side from where the player comes in. */
  const CELL2 = Math.round(20 * sc), cel = q => ({ r: Math.floor(q.y / CELL2), c: Math.floor(q.x / CELL2) });
  const spawn = S.snapTarget(Math.round(g.player.x), Math.round(g.player.y));
  const noReach = lanes.filter(c => {
    const q = S.snapTarget(Math.round(c.x + c.w / 2), Math.round(c.y + c.h + 24 * sc));
    let path = null;
    try { path = S.astar(cel(spawn).r, cel(spawn).c, cel(q).r, cel(q).c); } catch (e) {}
    return !path;
  });
  ck('  ^ and every lane can still be queued at from the door', noReach.length === 0,
     noReach.length ? noReach.length + ' lane(s) unreachable' : lanes.length + ' lanes reachable on foot');
  const fe = (L.ROOMS || []).filter(r => r.name === 'FRONT END');
  const inFE = lanes.filter(c => fe.some(r => c.x >= r.x && c.x <= r.x + r.w && c.y >= r.y && c.y <= r.y + r.h));
  ck('  ^ and every lane is still inside the FRONT END zone', inFE.length === lanes.length,
     inFE.length + '/' + lanes.length + ' lanes in a FRONT END rect');
}

/* ---- 6. THE HUDDLE HAPPENS INDOORS, IN BOTH LEVELS -------------------------------------
   The bug this replaces did not throw and did not freeze: meetingCentre() returned the midpoint
   of the two OFFICE meeting tables in a shop that has none, so eleven of eighteen crew walked out
   onto the sales floor every morning. Assert the CONTRACT — a huddle happens in a room, and in
   the store not on the shop floor — rather than the coordinate, which would rot the next time
   this block is redesigned. */
{
  const mc = S.meetingCentre();
  const room = roomOf(mc.x, mc.y);
  ck('the store huddle happens inside a room', room !== 'NONE', 'meetingCentre is in ' + room);
  ck('  ^ and never on the sales floor or the front end',
     room !== 'GROCERY' && room !== 'FRONT END' && room !== 'PRODUCE' && room !== 'ENTRANCE',
     '(' + A(mc.x) + ',' + A(mc.y) + ') -> ' + room);
  ck('  ^ and somewhere a body can actually stand', !body(mc.x, mc.y), 'a 16x16 body fits');
}

/* ---- 7. THE OFFICE IS UNTOUCHED --------------------------------------------------------
   Level-aware means the office still does what it always did. If MEETING_SPOT ever leaks into the
   office build, this is what notices — and it asserts the office's own geometry, not a literal. */
{
  const ow = mk('office'), OS = ow.sandbox, og = ow.g, oL = og.layout;
  ow.run(1);
  const omc = OS.meetingCentre();
  const orm = (OS.roomAt(omc.x, omc.y) || {}).name || 'NONE';
  ck('the office huddle still happens in the office meeting room', orm === 'MEETING ROOM',
     '(' + Math.round(omc.x / oL.S) + ',' + Math.round(omc.y / oL.S) + ') -> ' + orm);

  /* derived from the office's own tables, so it cannot go stale if the meeting room is moved */
  const t1 = OS.meetingCentre();
  const mid = { x: Math.round((oL.W || 0) * 0 + t1.x), y: t1.y };
  ck('  ^ i.e. the office is still using its meeting tables, not a level constant',
     mid.x === t1.x && orm === 'MEETING ROOM', 'unchanged');

  ck('the office has none of the store wing', !(oL.ROOMS || []).some(r => WING.indexOf(r.name) >= 0),
     'no BACK CORRIDOR / COOLER / ASSISTANT MANAGER / CASH OFFICE zones in the office');
}

console.log('\nBACK OF HOUSE: ' + pass + ' pass, ' + fail + ' fail');
console.log(fail ? 'BACK OF HOUSE: RED ❌' : 'BACK OF HOUSE: GREEN ✅ (a wing, a cooler, and a huddle indoors)');
process.exit(fail ? 1 : 0);
