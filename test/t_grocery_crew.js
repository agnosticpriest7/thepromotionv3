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
              'Gita Mahal', 'Bruno Sarr', 'Doreen Stapp', 'Lorne Petrie'];
/* every department the ladder offers must have somebody running it, or that route through the
   game has no rung 3. This is the spec, so it is named (§14). */
const DEPTS = ['front', 'grocery', 'produce', 'deli', 'bakery'];

const mk = () => createWorld({ storage: { 'promo:level': 'grocery', 'promo:newgame': '0', 'promo:char': '0' } });

/* ---- 1. the crew exists, and each of them owns a station -------------------------------- */
const w = mk();
const S = w.sandbox, g = w.g;

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
  const bad = g.desks.filter(d => d.station).filter(d => {
    try { return S.solid({ x: d.x, y: d.y, w: d.w, h: d.h }); } catch (e) { return true; }
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
  const before = rg.NPCS.map(n => n.name).sort().join('|');
  const moods = {}; rg.NPCS.forEach(n => { moods[n.name] = Math.round(n.mood); });
  save.slot = 0; save.Store.save(0, save.buildSnapshot(false, null));
  const applied = save.applySnapshot(save.Store.load(0));
  ck('a grocery save round-trips the whole crew', applied === true &&
     rg.NPCS.map(n => n.name).sort().join('|') === before,
     'applied=' + applied + ' -> ' + rg.NPCS.length + ' NPCs');
  ck('and they still own their stations after a load',
     CREW.every(nm => rg.desks.some(d => d.owner === nm && d.station)),
     rg.desks.filter(d => d.station).length + ' stations after load');
  ck('and their state came back with them, not defaults',
     rg.NPCS.every(n => Math.round(n.mood) === moods[n.name]),
     rg.NPCS.filter(n => Math.round(n.mood) === moods[n.name]).length + '/' + rg.NPCS.length + ' moods preserved');
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

console.log('crew: ' + pass + ' pass, ' + fail + ' fail');
console.log(fail ? 'GROCERY CREW: RED ❌' : 'GROCERY CREW: GREEN ✅ (ten on the floor, nobody in a shelf)');
process.exit(fail ? 1 : 0);
