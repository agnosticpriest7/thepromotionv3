/* GROCERY CREW — Save-Rite's first six members of staff.

   THE FINDING THIS TEST GUARDS. A STATION IS A DESK THAT ISN'T DRAWN. npcTarget() resolves a work
   phase with exactly `if(n.homeDesk) return deskSeat(n.homeDesk)`, so "go and work your station"
   was already implemented — as a desk — and so were ownership, spawning, pathing, the seat
   double-booking fixes and save/load. A station is therefore a desk record carrying `station:true`,
   which suppresses five things and nothing else: the furniture (drawDesks), the nameplate
   (drawDeskPlates), the chair (drawDeskChairs), the sitting pose (seatedDeskState — store staff
   STAND) and the collision box (solid + buildGrid). No parallel station system exists, and this
   test is what stops one growing by accident.

   §14 THROUGHOUT: nothing here knows a coordinate. Stations are found by asking the world who owns
   a desk; reachability is the game's own A* over the game's own nav grid; "inside a fixture" is the
   game's own walkableAt(). Kyle can redraw the whole floor and this test moves with it. */
'use strict';
const { createWorld } = require('./harness');

let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log('  ' + (c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '   ' + d : '')); c ? pass++ : fail++; };

/* The crew list is a SPEC, so it is named here deliberately (§14: game-rule constants are the
   exception and should be hard-coded — a test SHOULD fail when the cast changes). */
const CREW = ['Priya Raval', 'Marguerite Dubois', 'Danika Osei', 'Curtis Lam', 'Bekah Thorne', 'Russ Pelletier',
              /* the three departments that had no manager, plus the store's own — added because the
                 ladder offers five departments and three of them dead-ended at rung 3 with nobody
                 to succeed. */
              'Gita Mahal', 'Bruno Sarr', 'Doreen Stapp', 'Lorne Petrie',
              /* the two rungs above the departments that had nobody in them either */
              'Garret Voss', 'Merv Kastelic'];
/* every department the ladder offers must have somebody running it, or that route through the
   game has no rung 3. This is the spec, so it is named (§14). */
const DEPTS = ['front', 'grocery', 'produce', 'deli', 'bakery'];

const mk = () => createWorld({ storage: { 'promo:level': 'grocery', 'promo:newgame': '0', 'promo:char': '0' } });

/* ---- 1. the crew exists, and each of them owns a station -------------------------------- */
const w = mk();
const S = w.sandbox, g = w.g;
/* ⚠️ TICK BEFORE MEASURING. This file asserted "no station is inside a solid box" for its whole
   life and never once could have failed: `blockers` is empty until the first update (index.html
   has `let blockers=[]` at module scope, filled from CONTAINERS in the first buildGrid), so at
   tick 0 solid() cannot return true for ANY container. Standing directly on the owner's desk read
   as open floor. Three stations were sitting inside containers the entire time and this was green
   through all of it. The assertion was not weak -- it was measuring a world that did not exist. */
w.run(1);

ck('all six crew are on the floor', CREW.every(nm => g.NPCS.some(n => n.name === nm)) && g.NPCS.length === CREW.length,
   g.NPCS.length + ' NPCs: ' + g.NPCS.map(n => n.name).join(', '));

{
  const owned = CREW.filter(nm => g.desks.some(d => d.owner === nm && d.station));
  ck('every crew member owns a station of their own', owned.length === CREW.length,
     owned.length + '/' + CREW.length + ' with a station desk');
  const spots = g.desks.filter(d => d.station).map(d => d.x + ',' + d.y);
  ck('no two crew share a station', new Set(spots).size === spots.length,
     spots.length + ' stations, ' + new Set(spots).size + ' distinct');
}

/* ---- 2. every crew member is BOUND to their own station --------------------------------
   §15 TRAP, walked straight into on the first draft: this measured the distance from each NPC to
   their station AT BOOT and reported Marguerite 3006px away. She was not lost — she was `gone`,
   parked off-map with everyone else who has not clocked in yet, and the number was fiction. So
   assert the CONTRACT instead (§14): homeDesk is the identical object to the station they own,
   which is what npcTarget() dereferences to route them. Where they actually stand once they are
   on the floor is section 6's job, and it filters `gone` before it measures anything. */
{
  const wrong = g.NPCS.filter(n => {
    const d = g.desks.find(x => x.owner === n.name);
    return !d || n.homeDesk !== d;
  });
  ck('every crew member is bound to their own station', wrong.length === 0,
     wrong.length ? wrong.map(n => n.name).join(', ') + ' not bound'
                  : g.NPCS.length + ' bound to the station they own');
}

/* ---- 3. a station is a SPOT, not furniture --------------------------------------------- */
{
  /* The five suppressions, asserted through behaviour rather than by reading flags: a station must
     be standable. If it collided (drawDesks/solid/buildGrid all had to be taught this separately —
     the nav grid tests `desks` DIRECTLY and never went through solid(), which cost three blocked
     aisles) then the person standing on it would be inside a blocker. */
  /* solid(), not walkableAt(). The nav grid inflates every cell by 2px a side and rounds to 36px,
     so a grid cell can read "blocked" while nothing is actually in the way — the coffee machine's
     blocker bleeds into the neighbouring cell in the break room. solid() is the contract the game
     itself enforces in moveEntity, so it is the one that decides whether a spot is standable. */
  /* ⚠️ AND PROVE THE PREDICATE IS ALIVE BEFORE TRUSTING THE PASS. A green from a dead solid()
     is worse than no check at all, and that is exactly what this file shipped. Anchor on the half
     that actually drops out: containers. A wall-based anchor is not enough -- walls and blockers
     are filled from different places, so a wall check passes in a world where the furniture is
     missing from collision entirely. */
  const cons = g.layout.containers || [];
  const deadCons = cons.filter(c => !S.solid({ x: c.x + c.w / 2 - 2, y: c.y + c.h / 2 - 2, w: 4, h: 4 }));
  ck('solid() actually sees the furniture, so the next check can fail', deadCons.length === 0,
     deadCons.length ? deadCons.length + ' of ' + cons.length + ' containers are not solid at their own centre'
                     : cons.length + ' containers, every one solid at its centre');

  /* the contract is that a PERSON can stand there, so measure a person: the player's box, taken
     from the live world. The station's own 24x24 footprint is bigger than a 16x16 body, so testing
     the footprint over-reports -- two stations clip furniture that a body still fits beside. */
  const P = g.player;
  const bad = g.desks.filter(d => d.station).filter(d => {
    try { return S.solid({ x: d.x + d.w / 2 - P.w / 2, y: d.y + d.h / 2 - P.h / 2, w: P.w, h: P.h }); }
    catch (e) { return true; }
  });
  ck('every station is open floor, not a solid box', bad.length === 0,
     bad.length ? bad.map(d => d.owner).join(', ') + ' stand inside a blocker'
                : 'all ' + g.desks.filter(d => d.station).length + ' stations standable');

  const mine = g.desks.filter(d => d.owner === 'you');
  ck('the player still has a real desk, not a station', mine.length === 1 && !mine[0].station,
     mine.length + ' player desk(s), station=' + (mine[0] && mine[0].station));
}

/* ---- 4. the stations are mutually reachable, using the game's own A* -------------------- */
{
  const CELL = Math.round(20 * 1.8);
  const cell = p => ({ r: Math.floor(p.y / CELL), c: Math.floor(p.x / CELL) });
  /* snapTarget first. The player's desk is REAL furniture, so its centre cell is legitimately
     blocked and A* out of it fails — which says nothing about reachability. The game never paths
     from inside a desk either; it snaps to the nearest standable cell first. */
  const st = g.desks.filter(d => d.station || d.owner === 'you').map(d => {
    let q = { x: d.x + d.w / 2, y: d.y + d.h / 2 };
    try { q = S.snapTarget(Math.round(q.x), Math.round(q.y)); } catch (e) {}
    return { owner: d.owner, x: q.x, y: q.y };
  });
  let tried = 0; const blocked = [];
  for (let i = 0; i < st.length; i++) for (let j = 0; j < st.length; j++) {
    if (i === j) continue;
    const a = cell(st[i]), b = cell(st[j]);
    tried++;
    let path = null;
    try { path = S.astar(a.r, a.c, b.r, b.c); } catch (e) {}
    if (!path) blocked.push(st[i].owner + '->' + st[j].owner);
  }
  ck('every station can be walked to from every other station', blocked.length === 0,
     tried + ' pairs' + (blocked.length ? ' — BLOCKED: ' + blocked.slice(0, 4).join(', ') : ''));
}

/* ---- 5. HR is DORMANT, not merely unused ----------------------------------------------- */
{
  ck('nobody in Save-Rite is HR', g.NPCS.every(n => n.dept !== 'hr'),
     g.NPCS.filter(n => n.dept === 'hr').length + ' hr staff');
  let threw = null, hrCount = -1;
  try { hrCount = S.hrs().length; } catch (e) { threw = String(e); }
  ck('hrs() comes back empty, so triggerAudit returns at its second line', hrCount === 0 && !threw,
     threw ? threw : hrCount + ' hr');
  /* Call it for real: it must be a no-op, not a crash. This is the guard that stops the whole audit
     apparatus half-firing in a level with no HR office to run it from. */
  let auditThrew = null;
  const before = g.NPCS.map(n => n.x + ',' + n.y).join('|');
  try { for (let i = 0; i < 25; i++) S.triggerAudit(); } catch (e) { auditThrew = String(e); }
  ck('triggerAudit is a safe no-op in the store', !auditThrew &&
     g.NPCS.map(n => n.x + ',' + n.y).join('|') === before,
     auditThrew ? auditThrew : '25 calls, nobody moved');
}

/* ---- 6. THE SOAK: nobody ends up inside a fixture, and nobody wedges -------------------- */
{
  const sw = mk(), SS = sw.sandbox, sg = sw.g;
  const CHUNK = 500, FRAMES = 60000;         // ~2 in-game days: arrivals, breaks and a day roll
  const stuckIn = {}, insideAt = [], satDown = {};
  let breakTicks = 0, brokeInRoom = 0, breakTargets = 0, brokeExact = 0, seatlessTried = 0, seatlessOK = 0;
  /* BACK OF HOUSE, derived from the live world: the bounding box of the staff-only zones. The
     standing fallback rings the break table and that ring reaches past the room's own walls into
     the unzoned corridor beside it, which is fine — a member of staff loitering outside the break
     room door is still on their break. What must never happen is a break destination out on the
     SALES floor, which is what the office coordinate produced. */
  const BOH = (function () {
    const staff = (sg.layout.ROOMS || []).filter(r => /RECEIVING|BREAK ROOM|STORE MANAGER|OWNER|STAFF WC/.test(r.name));
    const x0 = Math.min.apply(null, staff.map(r => r.x)), y0 = Math.min.apply(null, staff.map(r => r.y));
    const x1 = Math.max.apply(null, staff.map(r => r.x + r.w)), y1 = Math.max.apply(null, staff.map(r => r.y + r.h));
    const pad = Math.round(30 * 1.8);
    return { x: x0 - pad, y: y0 - pad, w: (x1 - x0) + pad * 2, h: (y1 - y0) + pad * 2 };
  })();
  let ticks = 0, throws = 0, firstThrow = null;
  const moved = {}, last = {};
  sg.NPCS.forEach(n => { moved[n.name] = 0; last[n.name] = [n.x, n.y]; });
  for (let f = 0; f < FRAMES; f += CHUNK) {
    const r = sw.run(CHUNK, { ignoreGameOver: true });
    throws += r.throws; if (!firstThrow) firstThrow = r.firstThrow;
    ticks++;
    let onBreak = false;
    try { const ph = SS.currentPhase().name; onBreak = /Break/.test(ph); if (onBreak) breakTicks++; } catch (e) {}
    /* THE SEATLESS FALLBACK, posed. npcTarget's break branch reads `n.seat ? seat : BREAK_SPOT`,
       and assignBreakSeats always hands out a seat — the standing overflow is still a seat — so
       BREAK_SPOT is never reached in an ordinary run and a mutant that reverts it to the office
       coordinate SURVIVES the soak. It is one line away from mattering (anyone who misses the
       assignment, any level that skips it), so pose the condition: take somebody's seat away and
       ask where the game sends them. */
    if (onBreak && sg.NPCS.length) {
      const n0 = sg.NPCS[0], keep = n0.seat;
      n0.seat = null;
      try {
        const tgt = SS.npcTarget(n0);
        seatlessTried++;
        if (tgt && tgt.x >= BOH.x && tgt.x <= BOH.x + BOH.w && tgt.y >= BOH.y && tgt.y <= BOH.y + BOH.h) seatlessOK++;
      } catch (e) {}
      n0.seat = keep;
    }
    for (const n of sg.NPCS) {
      if (n.gone || n.wentHome || !n.alive) continue;      // §15: parked staff are not on the floor
      let ok = true;
      try { ok = !SS.solid({ x: n.x, y: n.y, w: n.w, h: n.h }); } catch (e) { ok = false; }
      if (!ok) {
        stuckIn[n.name] = (stuckIn[n.name] || 0) + 1;
        if (insideAt.length < 4) insideAt.push(n.name + '@' + Math.round(n.x) + ',' + Math.round(n.y));
      }
      /* store staff STAND. This is the seatedDeskState suppression, checked over the whole soak
         rather than at one frame: a cashier who reads as SEATED would be drawn in a desk chair
         behind a checkstand. */
      try { if (SS.seatedDeskState(n)) satDown[n.name] = (satDown[n.name] || 0) + 1; } catch (e) {}
      if (onBreak) {
        /* npcTarget(), not n.x/n.y. The first version of this checked where staff were STANDING
           during a break and passed with BREAK_SPOT reverted to its office coordinate, because an
           errand point in the break room put somebody in the room for unrelated reasons. Where the
           game SENDS them on a break is the actual contract. */
        try {
          const tgt = SS.npcTarget(n);
          if (tgt && isFinite(tgt.x)) {
            breakTargets++;
            if (tgt.x >= BOH.x && tgt.x <= BOH.x + BOH.w && tgt.y >= BOH.y && tgt.y <= BOH.y + BOH.h) brokeInRoom++;
            const rm = SS.roomAt(tgt.x, tgt.y);
            if (rm && rm.name === 'BREAK ROOM') brokeExact++;
          }
        } catch (e) {}
      }
      const q = last[n.name] || [n.x, n.y];
      if (Math.hypot(n.x - q[0], n.y - q[1]) > 4) moved[n.name]++;
      last[n.name] = [n.x, n.y];
    }
  }
  ck('the crew soak ran clean', throws === 0 && sg.renderErrs === 0 && sg.day >= 2,
     'day ' + sg.day + ', throws ' + throws + ', renderErrs ' + sg.renderErrs +
     (firstThrow ? '\n     ' + String(firstThrow).split('\n').slice(0, 2).join(' | ') : ''));

  /* THE ASSERTION THE MUTANT TARGETS. Put a station inside a shelf run and this must go RED. */
  const inside = Object.keys(stuckIn);
  ck('no crew member is ever standing inside a fixture', inside.length === 0,
     inside.length ? inside.map(k => k + ' x' + stuckIn[k]).join(', ') + ' [' + insideAt.join(' ') + ']'
                   : ticks + ' samples x ' + sg.NPCS.length + ' staff, all on open floor');

  /* Nobody wedged: everyone crossed the shop under their own steam at some point. */
  const idle = Object.keys(moved).filter(k => moved[k] < 3);
  ck('every crew member actually walks the store', idle.length === 0,
     idle.length ? 'never moved: ' + idle.join(', ')
                 : 'min ' + Math.min.apply(null, Object.keys(moved).map(k => moved[k])) +
                   ' moves, max ' + Math.max.apply(null, Object.keys(moved).map(k => moved[k])) +
                   ' over ' + ticks + ' samples');

  /* BREAK_SPOT used to be an office coordinate hard-coded inside npcTarget, and the level comment
     claimed it was safe because grocery had no NPCs. This is the assertion that stops that being
     true again: on a break, the crew must be in the room the store calls a break room. */
  ck('the crew takes its breaks in the back of house, never on the sales floor',
     breakTicks > 0 && breakTargets > 0 && brokeInRoom === breakTargets,
     breakTicks + ' break samples, ' + brokeInRoom + '/' + breakTargets +
     ' break destinations behind the swing doors (' + brokeExact + ' in the break room itself)');

  ck('a crew member with no break seat is still sent to the back of house',
     seatlessTried > 0 && seatlessOK === seatlessTried,
     seatlessOK + '/' + seatlessTried + ' seatless break destinations behind the swing doors');

  const sat = Object.keys(satDown);
  ck('nobody in the store ever sits down at their station', sat.length === 0,
     sat.length ? sat.map(k => k + ' x' + satDown[k]).join(', ') + ' read as seated'
                : 'all ' + sg.NPCS.length + ' stayed on their feet');

  /* The two stockers share the GROCERY aisles — a deadlock would show as zero moves above. This is
     the direct check that they are never standing on top of each other. */
  const A = sg.NPCS.find(n => n.name === 'Curtis Lam'), B = sg.NPCS.find(n => n.name === 'Bekah Thorne');
  ck('the two stockers are not occupying the same spot', !!A && !!B && Math.hypot(A.x - B.x, A.y - B.y) > 8,
     A && B ? Math.round(Math.hypot(A.x - B.x, A.y - B.y)) + 'px apart' : 'missing stocker');
}

/* ---- 6b. a task can no longer be addressed to somebody who does not exist ----------------
   addTask() used to fall back to the literal 'Marcus' when nobody was available to receive a
   {name} task. Marcus is an office worker; in Save-Rite he does not exist, so the player got a
   task naming a stranger that could never be completed and looked exactly like a real one. There
   is no correct name to guess, so the task is dropped and logged instead.

   Proved by posing the condition rather than waiting for it: clear the floor, then ask for a task
   that needs a person. renderTasks() is the tell -- it is called once per task that is actually
   added, so if the guard works it is never reached. */
{
  const tw = mk(), TS = tw.sandbox, tg = tw.g;
  tw.run(9000, { ignoreGameOver: true });
  tg.NPCS.forEach(n => { n.gone = true; n.wentHome = true; });
  let added = 0, logged = 0, threw = null;
  const rt = TS.renderTasks, ll = TS.logLine;
  TS.renderTasks = function () { added++; try { return rt.apply(null, arguments); } catch (e) { return null; } };
  TS.logLine = function (m) { if (String(m).indexOf('dropped') >= 0) logged++; try { return ll.apply(null, arguments); } catch (e) { return null; } };
  try { TS.addTask({ via: 'chat', label: 'Fetch a coffee for {name}' }); } catch (e) { threw = String(e); }
  TS.renderTasks = rt; TS.logLine = ll;
  ck('a {name} task with nobody to receive it is dropped, not misaddressed',
     !threw && added === 0 && logged === 1,
     threw ? threw : added + ' tasks added, ' + logged + ' drop logged');
}

/* ---- 6c. a level with NO errand points does not crash ------------------------------------
   startErrand() called pick(errandPoints) unconditionally. loadLevel('grocery') clears that array,
   so before this branch the very first errand any grocery worker started threw -- a hundred times
   a day once there was a crew to start them. The empty room could not expose it because an empty
   room has nobody to send on an errand.

   Save-Rite authors its own errand points now, so the guard is belt-and-braces from this level's
   point of view and a mutant that removes it SURVIVES the soak. That is not a reason to leave it
   unproven: the next level to be added starts with a cleared array, exactly as this one did. So
   the condition is POSED -- empty the array and send everyone on an errand. */
{
  const ew = mk(), ES = ew.sandbox, eg = ew.g;
  ew.run(9000, { ignoreGameOver: true });
  let cleared = false;
  try { const ep = eg.layout.errandPoints; ep.length = 0; cleared = ep.length === 0; } catch (e) {}
  let threw = null;
  try {
    for (const n of eg.NPCS) { n.gone = false; n.wentHome = false; n.errand = null; for (let i = 0; i < 40; i++) ES.startErrand(n); }
  } catch (e) { threw = String(e).split('\n')[0]; }
  ck('a level with no errand points can still start an errand', cleared && !threw,
     cleared ? (threw || eg.NPCS.length * 40 + ' errand starts, no throw') : 'could not clear errandPoints');
}

/* ---- 6d. EVERY DEPARTMENT HAS SOMEBODY RUNNING IT ---------------------------------------
   The ladder lets the player put in for any of five departments and rung 3 is that department's
   manager. Before this, only Front End and Grocery had one — and even those two were "managers"
   in the commit message and nowhere else: no crew member carried a department at all, so the game
   could not answer "who runs Produce?" for any of the five. */
{
  const dw = mk(), DS = dw.sandbox, dg = dw.g;
  const missing = DEPTS.filter(d => !DS.deptManager(d));
  ck('every department the ladder offers has a manager', missing.length === 0,
     missing.length ? 'no manager for: ' + missing.join(', ')
                    : DEPTS.map(d => d + '=' + DS.deptManager(d).name.split(' ')[0]).join(', '));
  ck('no two departments share a manager',
     new Set(DEPTS.map(d => DS.deptManager(d) && DS.deptManager(d).name)).size === DEPTS.length,
     DEPTS.map(d => DS.deptManager(d).name).join(' / '));
  ck('every rung of the ladder above the departments has an occupant',
     !!DS.storeBoss() && !!DS.storeAM() && !!DS.storeOwner(),
     'AM=' + (DS.storeAM() || {}).name + ', Store=' + (DS.storeBoss() || {}).name +
     ', Owner=' + (DS.storeOwner() || {}).name);
  ck('  ^ and each of them is one person, not several',
     dg.NPCS.filter(n => n.storeRole === 'am').length === 1 &&
     dg.NPCS.filter(n => n.storeRole === 'store').length === 1 &&
     dg.NPCS.filter(n => n.storeRole === 'owner').length === 1,
     'am/store/owner counts: ' + ['am','store','owner'].map(r => dg.NPCS.filter(n => n.storeRole === r).length).join('/'));
  ck('the store has a Store Manager for the loyalty path to route through',
     !!DS.storeBoss() && DS.storeBoss().storeDept == null,
     DS.storeBoss() ? DS.storeBoss().name + ' (storeDept=' + DS.storeBoss().storeDept + ')' : 'nobody');

  /* each manager's STATION is in their own department's zone — not where they happen to be
     standing, which is wherever an errand took them */
  const wrongZone = [];
  DEPTS.forEach(d => {
    const m = DS.deptManager(d);
    const desk = dg.desks.find(x => x.owner === (m && m.name));
    if (!desk) { wrongZone.push(d + ':no station'); return; }
    let rm = null; try { rm = DS.roomAt(desk.x + desk.w / 2, desk.y + desk.h / 2); } catch (e) {}
    const want = { front: 'FRONT END', grocery: 'GROCERY', produce: 'PRODUCE', deli: 'DELI', bakery: 'BAKERY' }[d];
    if (!rm || rm.name !== want) wrongZone.push(d + ':' + (rm ? rm.name : 'none'));
  });
  ck('every manager stands in the department they run', wrongZone.length === 0,
     wrongZone.length ? wrongZone.join(', ') : 'all five in their own zone');

  /* ⚠️ EMPLOYMENT, NOT ATTENDANCE. §15 parks the whole cast off-map until they clock in, so an
     accessor that filtered `gone` answered "nobody runs Produce" every morning before 8am. */
  ck('the manager of a department is still its manager before the shift starts',
     dg.NPCS.filter(n => n.gone).length > 0 && DEPTS.every(d => !!DS.deptManager(d)),
     dg.NPCS.filter(n => n.gone).length + ' parked off-map, all five departments still staffed');

  /* and the whole point of Part B: the audit apparatus must stay asleep */
  ck('none of the four new arrivals is HR', dg.NPCS.every(n => n.dept !== 'hr'),
     'depts on the floor: ' + dg.NPCS.map(n => n.dept).filter((v, i, a) => a.indexOf(v) === i).join(', '));
  let hrN = -1; try { hrN = DS.hrs().length; } catch (e) {}
  ck('  ^ so hrs() is still empty and triggerAudit still returns at its second line', hrN === 0,
     hrN + ' hr');
}

/* ---- 7. the crew round-trips through a save --------------------------------------------- */
{
  const rw = mk(), rg = rw.g, save = rw.rawSave();
  rw.run(9000, { ignoreGameOver: true });
  /* STAFF ONLY. Ambient shoppers are in NPCS too now, and they are deliberately NOT saved — so a
     roster comparison that counted them would report a clean round-trip as broken. This assertion
     is about the CREW; who was browsing the aisles at the moment of the save is nobody's business. */
  const before = rg.NPCS.filter(n => !n.customer).map(n => n.name).sort().join('|');
  const moods = {}; rg.NPCS.filter(n => !n.customer).forEach(n => { moods[n.name] = Math.round(n.mood); });
  save.slot = 0; save.Store.save(0, save.buildSnapshot(false, null));
  const applied = save.applySnapshot(save.Store.load(0));
  ck('a grocery save round-trips the whole crew', applied === true &&
     rg.NPCS.filter(n => !n.customer).map(n => n.name).sort().join('|') === before,
     'applied=' + applied + ' -> ' + rg.NPCS.filter(n => !n.customer).length + ' staff (' +
     rg.NPCS.filter(n => n.customer).length + ' shoppers ignored)');
  ck('and they still own their stations after a load',
     CREW.every(nm => rg.desks.some(d => d.owner === nm && d.station)),
     rg.desks.filter(d => d.station).length + ' stations after load');
  ck('and their state came back with them, not defaults',
     rg.NPCS.filter(n => !n.customer).every(n => Math.round(n.mood) === moods[n.name]),
     rg.NPCS.filter(n => !n.customer && Math.round(n.mood) === moods[n.name]).length + '/' +
     rg.NPCS.filter(n => !n.customer).length + ' staff moods preserved');
}

/* ---- 8. THE OFFICE IS UNTOUCHED -------------------------------------------------------- */
{
  const ow = createWorld();
  const og = ow.g;
  ck('the office still builds its own full cast', og.NPCS.length > 15 && og.desks.length > 15,
     og.NPCS.length + ' NPCs, ' + og.desks.length + ' desks');
  ck('the office has no stations — every desk is real furniture', og.desks.every(d => !d.station),
     og.desks.filter(d => d.station).length + ' stations in the office');
  let othrows = 0, ofirst = null, deskPhase = null;
  for (let f = 0; f < 40000; f += 500) {
    const r = ow.run(500, { ignoreGameOver: true });
    othrows += r.throws; if (!ofirst) ofirst = r.firstThrow;
    if (!deskPhase) { try { const ph = ow.sandbox.currentPhase().name; if (ow.sandbox.isDeskPhase(ph)) deskPhase = ph; } catch (e) {} }
  }
  ck('the office still soaks clean with the station changes in', othrows === 0 && og.renderErrs === 0,
     'throws ' + othrows + ', renderErrs ' + og.renderErrs +
     (ofirst ? '\n     ' + String(ofirst).split('\n').slice(0, 2).join(' | ') : ''));

  /* seatedDeskState gained a station guard, so office workers must still be able to sit. This is
     POSED, not sampled (§15). Counting who happens to be seated during a harness run returns ZERO
     on a PRISTINE tree as well as this one — the harness stubs Image at 64x64, desk boxes are
     fitted to sprite dimensions, and nobody ever parks inside the 24-unit seat tolerance. A count
     that reads 0 either way proves nothing about the change. So put a worker exactly on their own
     seat and ask the function directly: the ONLY thing that may make it return null here is the
     new station guard, and office desks are not stations. */
  {
    let posed = 0, tried = 0;
    for (const n of og.NPCS) {
      /* isWorker only: seatedDeskState deliberately refuses the manager, the boss, the
         receptionist and HR (they have their own poses), so counting them here reported 14/15
         and blamed the station guard for a rule that predates it. */
      let worker = false; try { worker = ow.sandbox.isWorker(n); } catch (e) {}
      if (!worker) continue;
      const d = og.desks.find(x => x.owner === n.name);
      if (!d) continue;
      let seat = null;
      try { seat = ow.sandbox.deskSeat(d); } catch (e) { continue; }
      if (!seat) continue;
      tried++;
      n.gone = false; n.wentHome = false; n.moving = false;
      n.x = seat.x; n.y = seat.y;
      try { if (ow.sandbox.seatedDeskState(n)) posed++; } catch (e) {}
    }
    ck('an office worker posed on their own seat still reads as SEATED',
       tried > 0 && posed === tried,
       posed + '/' + tried + ' posed workers seated' + (deskPhase ? ' (phase "' + deskPhase + '")' : ''));
  }
}

/* ---- 6. does the floor LOOK worked? --------------------------------------------------------
   ⚠️ EVERY ASSERTION ABOVE PASSED WHILE THE STORE LOOKED EMPTY. They prove a station exists, is
   owned, is reachable and is not inside a shelf -- all true of a shop whose staff spend the day in
   the back corridor, which is what was actually happening: five of the nine errand pins were behind
   the swing doors, so the sales floor drained on a rota. The bakery manager was on the CUSTOMER
   side of her own counter 75% of the time and every test here was green.

   So this section samples a working day and asserts the things a player sees. Thresholds sit well
   under what was measured (89% / 96% / 69% / 79%) -- they are there to catch a collapse, not to
   pin a number that drifts with the seed. */
{
  const fw = mk(); const fg = fw.g, fsb = fw.sandbox;
  const SC = fg.layout.S;      // the world scale. `S` in this file is the SANDBOX, not the scale.
  fw.run(400);
  const zone = nm => fg.layout.ROOMS.filter(r => r.name === nm);
  /* the counter is found the way the GAME finds it -- a wide, shallow blocker inside the zone --
     so this cannot disagree with buildBeat about which side is the staff side (§14). */
  const counterOf = nm => {
    for (const z of zone(nm)) {
      const c = fg.layout.levelBlockers.filter(b => b.x >= z.x - 8 && b.x + b.w <= z.x + z.w + 8 &&
        b.y > z.y && b.y + b.h < z.y + z.h && b.w > 100 * SC && b.h < 70 * SC).sort((a, b) => a.y - b.y)[0];
      if (c) return c;
    }
    return null;
  };
  const deliCtr = counterOf('DELI'), bakeCtr = counterOf('BAKERY');
  ck('the deli and the bakery each have a counter to stand behind', !!deliCtr && !!bakeCtr,
     (deliCtr ? 'deli yes' : 'deli MISSING') + ', ' + (bakeCtr ? 'bakery yes' : 'bakery MISSING'));

  const tills = fg.layout.levelBlockers.filter(b => b.h > 40 * SC && b.w < 60 * SC && b.y > 700 * SC);
  const runs = fg.layout.levelBlockers.filter(b => b.h > 150 * SC && b.w < 80 * SC && b.y > 380 * SC && b.y < 720 * SC);

  /* ONE pass, not two. The first draft sampled the posts in one loop and the room tallies in a
     second, and the second ran off the end of the working day -- 108 samples, four clerks still on
     the floor, and two thresholds that failed on noise rather than on anything real. Collect
     everything from the same frames. */
  const DEPT_ZONE = { grocery:'GROCERY', produce:'PRODUCE', deli:'DELI', bakery:'BAKERY', front:'FRONT END' };
  /* ---- CONTRACTS FIRST. ⚠️ THE PERCENTAGES BELOW ARE NOT ENOUGH ON THEIR OWN. A mutation that
     deleted every stock errand point on the sales floor SURVIVED the sampled-day assertions --
     the store degrades gracefully, so the numbers sagged without crossing a threshold. A threshold
     on a statistic can only catch a collapse; it cannot catch an erosion. These three assertions
     are deterministic, derive from the live world, and each kills a mutant the sampling missed. */
  {
    /* (a) NO BEAT POST IS EVER IN FRONT OF A COUNTER. This is the actual contract behind the
       "serves from behind the counter" percentage, and unlike the percentage it does not move
       with the seed. */
    let checked = 0, infront = 0;
    for (const n of fg.NPCS) {
      const ctr = n.storeDept === 'deli' ? deliCtr : n.storeDept === 'bakery' ? bakeCtr : null;
      if (!ctr) continue;
      let beat = null; try { beat = fsb.buildBeat(n); } catch (e) {}
      if (!beat || !beat.length) continue;
      checked += beat.length;
      infront += beat.filter(b => b.y >= ctr.y).length;
    }
    ck('no post on a counter department beat is on the CUSTOMER side of the counter',
       checked > 0 && infront === 0,
       checked + ' posts checked, ' + infront + ' in front of the case');
  }
  {
    /* (b) THE SALES FLOOR HAS WORK ON IT. Every department a clerk can belong to must own at
       least one errand point, and that point must be inside the department. Without this, an
       errand is only ever a trip to the back and the shop floor drains on a rota -- which is
       what was happening, and what no percentage here noticed. */
    const DEPTS_WITH_WORK = ['grocery', 'produce', 'deli', 'bakery', 'front'];
    const ZONE = { grocery:'GROCERY', produce:'PRODUCE', deli:'DELI', bakery:'BAKERY', front:'FRONT END' };
    const missing = DEPTS_WITH_WORK.filter(d => {
      const pts = fg.layout.errandPoints.filter(e => e.dept === d);
      if (!pts.length) return true;
      return !pts.some(e => { const r = fsb.roomAt(e.x, e.y); return r && r.name === ZONE[d]; });
    });
    ck('every department has work to do inside its own four walls', missing.length === 0,
       (DEPTS_WITH_WORK.length - missing.length) + '/' + DEPTS_WITH_WORK.length +
       ' departments' + (missing.length ? ' — nothing to do in: ' + missing.join(', ') : ''));

    /* (c) AND NO ERRAND PIN SNAPS OUT OF ITS OWN ROOM. Two did: the produce jobs sat on the
       zone's south edge and errandSpot carried them 40 units into the customer WASHROOM -- a
       walkable point, a legal point, and completely the wrong place to be seen working. */
    const probe = fg.NPCS[0];
    const strays = fg.layout.errandPoints.filter(e => {
      const sp = fsb.errandSpot(probe, e);
      const a = fsb.roomAt(e.x, e.y), b = fsb.roomAt(sp.x, sp.y);
      return ((a && a.name) || 'NONE') !== ((b && b.name) || 'NONE');
    });
    ck('  ^ and no errand pin snaps into a different room than it was authored in',
       strays.length === 0,
       strays.length + ' of ' + fg.layout.errandPoints.length + ' pins stray' +
       (strays.length ? ': ' + strays.map(e => e.type).join(', ') : ''));
  }
  {
    /* (d) A CLERK'S ERRANDS ARE MOSTLY THEIR OWN DEPARTMENT'S. Statistical, but the margin is a
       chasm rather than a threshold: produce owns 4 of the ~26 pins, so an unbiased pick lands
       there about 15% of the time and a biased one about three quarters. Anything in between
       means the bias is broken, and no seed wobble spans that gap. */
    const n = fg.NPCS.find(x => x.storeDept === 'produce');
    let own = 0, got = 0;
    if (n) for (let i = 0; i < 400; i++) {
      n.errand = null;
      try { fsb.startErrand(n); } catch (e) { break; }
      if (!n.errand) continue;                    // startErrand also visits desks
      got++;
      const r = fsb.roomAt(n.errand.x, n.errand.y);
      if (r && r.name === 'PRODUCE') own++;
    }
    n && (n.errand = null);
    /* 0.32, not 0.45: the measured value is 47%, not the 74% the 0.7 bias implies, because
       errandSpot spreads arrivals around a ring and some land just outside the zone. Sit the bar
       halfway between measured and unbiased -- it still cannot be reached with the bias off. */
    ck('a clerk takes most errands in their own department', got > 100 && own / got >= 0.32,
       got ? Math.round(100 * own / got) + '% of ' + got + ' errands were in PRODUCE (unbiased is ~15%)'
           : 'no errands drawn');
  }

  {
    /* (e) THE BEAT AVOIDS THE POST SOMEBODY IS ALREADY ON. ⚠️ Making the choice random again
       SURVIVED every assertion here on the first pass -- it only nudges the overlap percentage,
       which sits at 3% against a 12% bar. So ask the selector directly: park one person on a post
       and see whether the manager still walks onto them.

       Two traps avoided. The selector skips `k === n.beatIdx`, so seeding beatIdx with the very
       post under test would make this vacuous -- it is seeded with a DIFFERENT one, leaving the
       crowded post a legal candidate. And a single sweep proves little: with ~14 posts a random
       pick lands on the crowded one about once, so a run of zero hits happens by chance a third
       of the time. Sweeping repeatedly makes the random case certain to be caught. */
    const bw = mk(); const bg = bw.g, bsb = bw.sandbox;
    bw.run(400);
    for (let guard = 0; guard < 400 && bsb.currentPhase().name !== 'Regular Work'; guard++) bw.run(40);
    let m = null, beat = null;
    for (const n of bg.NPCS) {
      if (!n.storeRole || n.storeRole === 'staff') continue;
      let b = null; try { b = bsb.buildBeat(n); } catch (e) {}
      if (b && (!beat || b.length > beat.length)) { m = n; beat = b; }
    }
    let trials = 0, walkedOn = 0;
    if (m && beat && beat.length >= 4) {
      m.beat = beat;
      const crowder = bg.NPCS.find(n => n !== m);
      /* everybody else is marked gone, which is the same filter the selector itself uses --
         so the only person it can see is the one deliberately standing in the way */
      bg.NPCS.forEach(n => { if (n !== m && n !== crowder) n.gone = true; });
      crowder.gone = false; crowder.wentHome = false;
      for (let pass = 0; pass < 20; pass++) {
        for (let k = 0; k < beat.length; k++) {
          crowder.x = beat[k].x; crowder.y = beat[k].y;
          m.beatIdx = (k + 1) % beat.length;    // NOT k — k must stay a legal candidate
          m.beatUntil = -1;                     // expired, so the next call re-picks
          try { bsb.npcTarget(m); } catch (e) { continue; }
          trials++;
          if (m.beatIdx === k) walkedOn++;
        }
      }
    }
    ck('the beat never sends a manager to the post somebody is already standing on',
       trials > 100 && walkedOn === 0,
       walkedOn + ' of ' + trials + ' picks landed on the occupied post' +
       (beat ? ' (' + beat.length + '-post beat)' : ' — NO BEAT BUILT'));
  }

  const tally = {}, where = {};
  const bump = (k, hit) => { tally[k] = tally[k] || [0, 0]; tally[k][1]++; if (hit) tally[k][0]++; };
  let samples = 0, overlap = 0;
  for (let i = 0; i < 700; i++) {
    fw.run(40);
    if (fsb.currentPhase().name !== 'Regular Work') continue;
    const crew = fg.NPCS.filter(n => !n.customer && n.alive && !n.gone && !n.wentHome);
    if (crew.length < 8) continue;              // §15: never measure a floor that is not populated
    samples++;
    let pair = false;
    for (let a = 0; a < crew.length; a++) {
      const n = crew[a];
      for (let b = a + 1; b < crew.length; b++)
        if (Math.hypot(n.x - crew[b].x, n.y - crew[b].y) < 8 * SC) pair = true;
      if (n.storeDept === 'deli' && deliCtr) bump('deli', n.y < deliCtr.y);
      if (n.storeDept === 'bakery' && bakeCtr) bump('bakery', n.y < bakeCtr.y);
      if (n.storeDept === 'front' && n.storeRole === 'staff')
        bump('till', tills.some(t => Math.hypot(n.x - (t.x + t.w / 2), n.y - (t.y + t.h / 2)) < 46 * SC));
      if (n.storeDept === 'grocery' && n.storeRole === 'staff')
        bump('aisle', runs.some(t => Math.abs(n.x - (t.x + t.w / 2)) < 70 * SC &&
          n.y > t.y - 20 * SC && n.y < t.y + t.h + 20 * SC));
      /* ANYONE WITH A DEPARTMENT, not just role 'staff'. Nine of the twelve belong to a zone --
         four clerks and five department managers -- and the first draft filtered to 'staff', which
         is four people. The three who legitimately have no home zone (store manager, AM, owner)
         beat the WHOLE floor by design and are excluded by having no storeDept at all. */
      if (DEPT_ZONE[n.storeDept]) {
        const r = fsb.roomAt(n.x, n.y); const rn = (r && r.name) || 'NONE';
        where[n.name] = where[n.name] || { dept: DEPT_ZONE[n.storeDept], seen: {} };
        where[n.name].seen[rn] = (where[n.name].seen[rn] || 0) + 1;
      }
    }
    if (pair) overlap++;
  }
  const pct = k => tally[k] ? Math.round(100 * tally[k][0] / tally[k][1]) : -1;
  ck('  ^ the day was actually sampled', samples > 300, samples + ' samples in Regular Work');
  ck('counter staff serve from BEHIND their counter, not in front of it',
     pct('deli') >= 65 && pct('bakery') >= 65,
     'deli ' + pct('deli') + '%, bakery ' + pct('bakery') + '% on the staff side');
  ck('cashiers are at a till', pct('till') >= 45, pct('till') + '% of the working day');
  ck('grocery clerks are at a shelf run', pct('aisle') >= 55, pct('aisle') + '% of the working day');
  ck('crew are not standing inside each other', 100 * overlap / samples <= 12,
     Math.round(100 * overlap / samples) + '% of samples had a pair closer than 8 authored');

  /* the department each person spends the most time in must be their OWN. This is the assertion
     that would have caught the drained floor: before the errand pins were re-cut, four of the
     twelve had BOH CORRIDOR in their top three and the store manager had it FIRST. */
  const names = Object.keys(where);
  const home = names.filter(nm => {
    const e = where[nm];
    const top = Object.entries(e.seen).sort((a, b) => b[1] - a[1])[0];
    return top && top[0] === e.dept;
  });
  ck('every clerk spends more of the day in their own department than anywhere else',
     names.length >= 8 && home.length === names.length,
     home.length + '/' + names.length + ' at home' +
     (home.length === names.length ? '' : ' — adrift: ' +
       names.filter(n => home.indexOf(n) < 0).map(n =>
         n + ' in ' + Object.entries(where[n].seen).sort((a, b) => b[1] - a[1])[0][0]).join(', ')));
}

console.log('crew: ' + pass + ' pass, ' + fail + ' fail');
console.log(fail ? 'GROCERY CREW: RED ❌' : 'GROCERY CREW: GREEN ✅ (twelve on the floor, nobody in a shelf)');
process.exit(fail ? 1 : 0);
