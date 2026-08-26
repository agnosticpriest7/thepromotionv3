/* GROCERY UNSEATING — three ways to move one named person out of one chair.

   Save-Rite's rung 3 is a single occupant with no alternative seat. The redundancy comes from the
   ROADS, not from more bodies: merit routes through the department, loyalty through the Store
   Manager, sabotage through a failure that lands on them.

   ⚠️ THE INVESTMENT INVARIANT IS WHAT THIS TEST IS REALLY FOR. The branch's whole purpose is to
   remove an NPC from their job, which is the exact collision npcLeaving() exists for. The design
   answer was to hold NO pointer at all — the roads are counts, the department is player.storeDept,
   and who runs it is deptManager() asked of the world every time. So the assertions below check
   that nothing dangles rather than that a pointer was nulled.

   ⚠️ EVERY ROAD IS DRIVEN THROUGH REAL FUNCTIONS. Setting career.unseat.done directly would prove
   the removal code runs and nothing else — the uncraftable-recipes failure. Merit is driven by
   rolling real days, loyalty by crediting real favours and pressing the real verb, sabotage by
   landing real pranks through prankHit.

   ⚠️ AND THE UNEXPLORED PATHS. The picker softlock got through a green suite because every test
   picked a department the instant it was offered — a route no test ever took because tests behave
   correctly by construction. Arcs are where players misbehave, so this abandons one road for
   another, runs two at once, finishes one after the target has already gone, and saves mid-arc. */
'use strict';
const { createWorld } = require('./harness');

let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log('  ' + (c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '   ' + d : '')); c ? pass++ : fail++; };

/* the spec (§14): five departments, three roads, one resolution */
const DEPTS = ['front', 'grocery', 'produce', 'deli', 'bakery'];
const ROADS = ['merit', 'loyal', 'sabo'];

const mk = () => createWorld({ storage: { 'promo:level': 'grocery', 'promo:newgame': '0', 'promo:char': '0' } });

/* get a world to "clerk of <dept>, manager still in the chair" using only real functions */
function asClerk(dept) {
  const w = mk(), S = w.sandbox, g = w.g, P = g.player;
  w.run(9000, { ignoreGameOver: true });
  P.prog = 100; S.tryPromote();
  const menu = S.storeDeptMenu();
  menu.items[DEPTS.indexOf(dept)].act();
  try { S.closeMenu(); } catch (e) {}
  return { w, S, g, P };
}

/* ---- the three roads, driven for real ---------------------------------------------------- */
function driveLoyal(S) {
  const b = S.storeBoss();
  if (!b) return false;
  for (let i = 0; i < 12 && !S.loyalReady(); i++) S.creditFavor(b);
  return S.askBossToMove() === true;
}
function driveSabo(S, g) {
  /* real pranks, landing on the real target, through the real hit path */
  for (let i = 0; i < 8 && !S.unseatDone(); i++) {
    const t = S.unseatTarget();
    if (!t) break;
    S.prankHit(t, 'mislabel', 1);
  }
  return S.unseatDone();
}
function driveMerit(S, g) {
  /* roll real days. deptHealth has to clear the bar and the player has to have worked, which is
     exactly what the road asks for — so the day is posed, then nextDay() judges it. */
  for (let d = 0; d < 8 && !S.unseatDone(); d++) {
    S.deptStaff(g.player.storeDept).forEach(n => { n.stress = 0; n.strikes = 0; n.feudWith = null; n.gone = false; });
    g.today.tasks = 3;
    S.nextDay();
  }
  return S.unseatDone();
}
const DRIVE = { merit: driveMerit, loyal: driveLoyal, sabo: driveSabo };

/* ---- 1. EACH ROAD UNSEATS, IN EVERY DEPARTMENT ------------------------------------------- */
ROADS.forEach(road => {
  const failed = [];
  DEPTS.forEach(dept => {
    const { S, g } = asClerk(dept);
    const target = S.unseatTarget();
    if (!target) { failed.push(dept + ':no manager'); return; }
    const ok = DRIVE[road](S, g);
    if (!ok) { failed.push(dept + ':not unseated'); return; }
    if (g.career.unseat.done !== road) { failed.push(dept + ':resolved as ' + g.career.unseat.done); return; }
    if (target.alive) { failed.push(dept + ':' + target.name + ' still employed'); return; }
    if (S.deptManager(dept)) { failed.push(dept + ':chair still filled'); return; }
    /* and the rung actually opens — the point of the whole exercise */
    let gt = null; try { gt = S.gateFor(2); } catch (e) {}
    if (!gt || !gt.ok) failed.push(dept + ':rung still gated');
  });
  ck('the ' + road + ' road unseats the manager in all five departments', failed.length === 0,
     failed.length ? failed.join(', ') : 'front, grocery, produce, deli, bakery');
});

/* ---- 2. UNSEATING GOES THROUGH npcLeaving() ----------------------------------------------
   Not "did the NPC disappear" — that would pass with a direct removal. npcLeaving is what clears
   everything pointing at them, so this asserts the CLEANUP happened: leverage held on them, a
   prank part-built against them, and another worker's job aimed at them all die with them. */
ROADS.forEach(road => {
  const { S, g } = asClerk('deli');
  const t = S.unseatTarget();
  g.player.leverage.push({ label: 'something on ' + t.name, target: t.name, power: 40, src: 'test' });
  t.prankBuild = { type: 'mislabel', tier: 1, stage: 1, armed: false };
  const other = g.NPCS.find(n => n.alive && n !== t && n.name !== 'Lorne Petrie');
  if (other) other.mission = { target: t.name, kind: 'test' };
  S.creditFavor(t);                                   // a favour track pointing at them

  DRIVE[road](S, g);

  const levLeft = g.player.leverage.filter(l => l.target === t.name).length;
  ck('the ' + road + ' road routes the removal through npcLeaving()',
     S.unseatDone() && !t.alive && levLeft === 0 && !t.prankBuild &&
     !(other && other.mission) && !g.career.favors[t.name],
     'leverage left ' + levLeft + ', prankBuild ' + (t.prankBuild ? 'still there' : 'cleared') +
     ", other's job " + (other && other.mission ? 'still there' : 'cleared') +
     ', favour track ' + (g.career.favors[t.name] ? 'still there' : 'cleared'));
});

/* ---- 3. TWO ROADS AT ONCE RESOLVE TO EXACTLY ONE UNSEATING ------------------------------- */
{
  const { S, g } = asClerk('bakery');
  const t = S.unseatTarget();
  /* build BOTH: favours banked with the boss, and sabotage one short of landing */
  const b = S.storeBoss();
  for (let i = 0; i < 12 && !S.loyalReady(); i++) S.creditFavor(b);
  S.prankHit(t, 'mislabel', 1);                        // 1 of 2
  const saboBefore = g.career.unseat.sabo;
  ck('both roads are genuinely in progress before the race',
     S.loyalReady() && saboBefore === 1 && !S.unseatDone(),
     'loyal ready=' + S.loyalReady() + ', sabo ' + saboBefore + '/2');

  /* now finish both, sabotage first */
  S.prankHit(t, 'mislabel', 1);                        // resolves as sabo
  const firstPath = g.career.unseat.done;
  const askedAfter = S.askBossToMove();                // the other road, pressed after the fact
  ck('two roads pursued at once resolve to exactly ONE unseating',
     firstPath === 'sabo' && askedAfter === false && g.career.unseat.done === 'sabo',
     'resolved as ' + firstPath + ', the later ask returned ' + askedAfter +
     ', final ' + g.career.unseat.done);
  ck('  ^ and the manager is removed once, not twice',
     !t.alive && g.NPCS.filter(n => n.name === t.name).length === 1,
     g.NPCS.filter(n => n.name === t.name).length + ' copies, alive=' + t.alive);
}

/* ---- 4. FINISHING A ROAD AFTER THE TARGET HAS ALREADY GONE ------------------------------- */
{
  const { S, g } = asClerk('produce');
  const t = S.unseatTarget();
  const b = S.storeBoss();
  for (let i = 0; i < 12 && !S.loyalReady(); i++) S.creditFavor(b);
  ck('the loyalty road is ready before the target leaves', S.loyalReady(), 'ready');

  /* they leave by something else entirely — the route this branch does not own */
  S.npcLeaving(t); t.alive = false;

  let threw = null, asked = null;
  try { asked = S.askBossToMove(); } catch (e) { threw = String(e).split('\n')[0]; }
  ck('asking after they have already gone is refused, not a crash',
     !threw && asked === false && !S.unseatDone(),
     threw ? threw : 'returned ' + asked + ', done=' + g.career.unseat.done);
  let gt = null; try { gt = S.gateFor(2); } catch (e) {}
  ck('  ^ and the rung opens anyway, because the chair is empty', !!gt && gt.ok === true,
     gt ? JSON.stringify(gt) : 'no gate');
  ck('  ^ and the run does not dangle: nothing still points at them',
     !g.career.favors[t.name] && g.player.leverage.filter(l => l.target === t.name).length === 0,
     'favours ' + (g.career.favors[t.name] ? 'left' : 'clear'));
}

/* ---- 5. ABANDONING A ROAD LEAVES NO DANGLING STATE --------------------------------------- */
{
  const { S, g } = asClerk('grocery');
  const t = S.unseatTarget();
  S.prankHit(t, 'mislabel', 1);                        // start sabotage: 1/2
  ck('sabotage progress is really banked before abandoning it', g.career.unseat.sabo === 1,
     'sabo ' + g.career.unseat.sabo);

  /* the target leaves by another route — the road is abandoned mid-way, not finished */
  S.npcLeaving(t); t.alive = false;
  ck('abandoned progress is cleared rather than carried to their replacement',
     g.career.unseat.sabo === 0 && g.career.unseat.merit === 0 && !g.career.unseat.done,
     'merit ' + g.career.unseat.merit + ', sabo ' + g.career.unseat.sabo +
     ', done ' + g.career.unseat.done);

  /* and switching roads afterwards still works — abandoning one must not shut the others */
  const b = S.storeBoss();
  for (let i = 0; i < 12 && !S.loyalReady(); i++) S.creditFavor(b);
  ck('  ^ and the loyalty road correctly reports itself shut, not "soon"',
     !S.loyalReady() && /already open|shut|Settled/i.test(S.loyalStatus()),
     S.loyalStatus());
}

/* ---- 6. SAVE AND LOAD MID-ARC, ON EVERY ROAD --------------------------------------------- */
ROADS.forEach(road => {
  const { S, g, w } = asClerk('deli');
  const t = S.unseatTarget(), b = S.storeBoss();
  /* get each road genuinely part-way, never finished */
  if (road === 'sabo') S.prankHit(t, 'mislabel', 1);
  if (road === 'loyal') { S.creditFavor(b); S.creditFavor(b); }
  if (road === 'merit') {
    S.deptStaff('deli').forEach(n => { n.stress = 0; n.strikes = 0; n.feudWith = null; n.gone = false; });
    g.today.tasks = 3; S.nextDay();
  }
  const before = { merit: g.career.unseat.merit, sabo: g.career.unseat.sabo, loyal: S.loyalCount() };
  ck(road + ': the arc is genuinely part-way before saving',
     (before.merit + before.sabo + before.loyal) > 0 && !S.unseatDone(),
     JSON.stringify(before));

  const save = w.rawSave();
  save.slot = 0;
  const snap = save.buildSnapshot(false, null);
  save.Store.save(0, snap);

  /* ⚠️ INTO A FRESH WORLD. Restoring onto the same one would have the right numbers already. */
  const f = mk(), FS = f.sandbox, fg = f.g;
  let applied = null;
  try { applied = f.rawSave().applySnapshot(JSON.parse(JSON.stringify(snap))); } catch (e) { applied = 'threw ' + e; }
  const after = { merit: fg.career.unseat.merit, sabo: fg.career.unseat.sabo, loyal: FS.loyalCount() };
  ck(road + ': a mid-arc save round-trips its progress',
     applied === true && after.merit === before.merit && after.sabo === before.sabo &&
     after.loyal === before.loyal && !FS.unseatDone(),
     'applied=' + applied + ' ' + JSON.stringify(after));
  ck(road + ': and the road still finishes after the load',
     DRIVE[road](FS, fg) === true && fg.career.unseat.done === road,
     'done=' + fg.career.unseat.done);
});

/* ---- 7. A PRE-BRANCH SAVE HAS NO ARC, AND MUST NOT INHERIT THE LIVE RUN'S ---------------- */
{
  const { S, g, w } = asClerk('front');
  S.prankHit(S.unseatTarget(), 'mislabel', 1);
  const snap = w.rawSave().buildSnapshot(false, null);
  const older = JSON.parse(JSON.stringify(snap));
  delete older.career.unseat;                          // exactly what every pre-branch save looks like

  /* load it into a run that ALREADY has progress banked — career is MERGED, not replaced, so a
     missing key keeps whatever the current run had unless the load explicitly resets it. */
  const { S: S2, g: g2, w: w2 } = asClerk('front');
  S2.prankHit(S2.unseatTarget(), 'mislabel', 1);
  ck('the receiving run has progress of its own before the load', g2.career.unseat.sabo === 1,
     'sabo ' + g2.career.unseat.sabo);
  let applied = null;
  try { applied = w2.rawSave().applySnapshot(older); } catch (e) { applied = 'threw ' + e; }
  ck('a save with no arc loads as "no road started", not as the live run\'s progress',
     applied === true && g2.career.unseat.merit === 0 && g2.career.unseat.sabo === 0 &&
     !g2.career.unseat.done,
     'applied=' + applied + ' -> ' + JSON.stringify(g2.career.unseat));
}

/* ---- 8. SABOTAGE COSTS SUSPICION; THE OTHER TWO DO NOT ----------------------------------- */
{
  const rec = {};
  ROADS.forEach(road => {
    const { S, g } = asClerk('bakery');
    g.player.suspicion = 0;
    DRIVE[road](S, g);
    rec[road] = Math.round(g.player.suspicion);
  });
  ck('sabotage raises suspicion and the honest roads do not',
     rec.sabo > 0 && rec.merit === 0 && rec.loyal === 0,
     'merit ' + rec.merit + ', loyal ' + rec.loyal + ', sabo ' + rec.sabo);
}

/* ---- 9. THE STORE'S WAY UP PANEL IS THE STORE'S -----------------------------------------
   The office's ladderSteps switch keys on the rank STRING, and Save-Rite's rung 4 is also called
   ASSISTANT MANAGER — so the panel told store players to "Ask Dale if he needs anything" and
   ticked "he likes you 0/30" as DONE. Second name-matched gate, in the one panel whose job is
   telling the player what to do next. */
{
  const { S, g } = asClerk('deli');
  /* defensive on purpose: a mutant that removes the store branch can make this null, and a test
     that THROWS is worse than one that fails — it produces no FAIL line, and a mutant runner that
     scans for FAIL lines then calls the mutation SURVIVED. Fail loudly instead. */
  const L = S.ladderSteps() || { title: '(no panel)', steps: [] };
  const text = JSON.stringify(L);
  ck('the store has a WAY UP panel at all at this rung', Array.isArray(L.steps) && L.steps.length > 0,
     L.title + ' — ' + (L.steps || []).length + ' steps');
  ck('the store never mentions Dale, who does not work there', text.indexOf('Dale') < 0,
     text.indexOf('Dale') < 0 ? 'no Dale' : 'STILL MENTIONS DALE: ' + text.slice(0, 160));
  ck('  ^ and it names all three roads', /run it better/i.test(text) && /store manager/i.test(text) &&
     /fail in their name/i.test(text), L.steps.filter(x => x.head).map(x => x.head).join(' | '));
  ck('  ^ and it names the person in the chair', text.indexOf('BRUNO') >= 0,
     L.steps[0] && L.steps[0].head);
  /* the master tier really is unavailable, and the panel says so rather than leaving a trap:
     masterPlant ends in tipHR(), which needs an NPC with dept:'hr'. The store has none. */
  ck('  ^ and it warns that the master tier is shut in a store with no HR',
     S.storeMasterBlocked() === true && /MASTER/.test(text),
     'storeMasterBlocked=' + S.storeMasterBlocked());
}

/* ---- 9b. SEVEN MUTANTS SURVIVED THE FIRST DRAFT OF THIS FILE ----------------------------
   Every one was a MISSING assertion rather than a weak one, and they were all the same shape as
   the picker softlock: the tests only ever walked the road correctly. They always pranked the
   right person, always worked the day, always asked after passing the threshold, always read the
   panel at a rung where the collision does not show. So the negative cases live here.

   Each block below names the mutant it exists to kill. */
{
  /* MUTANT: "the one-resolution guard is removed" survived, because after sabotage resolved the
     test only tried the LOYALTY ask — and loyalReady() has its own !unseatDone() check, so a
     redundant guard absorbed the mutation. Hit resolveUnseat directly, and drive a SECOND road to
     its natural completion after the first has already landed. */
  const { S, g } = asClerk('deli');
  const t0 = S.unseatTarget();
  driveSabo(S, g);
  ck('a second road completing after the first does NOT unseat anybody again',
     g.career.unseat.done === 'sabo' && S.resolveUnseat('merit') === false &&
     g.career.unseat.done === 'sabo',
     'done=' + g.career.unseat.done + ', a direct second resolve returned ' + S.resolveUnseat('loyal'));

  /* ⚠️ THE ABOVE IS ABSORBED BY A REDUNDANT GUARD, and the mutant proved it: resolveUnseat has
     TWO refusals — `done` is already set, and there is nobody in the chair — and after any
     unseating the second one is true anyway, so deleting the first changed nothing. To isolate
     `done` the chair has to be FULL again, which no route fills today but the next branch (a
     replacement Department Manager) will. Posed rather than played, because the state is one the
     game will reach and the guard is what will be standing there when it does. */
  {
    const stand = g.NPCS.find(n => n.alive && n.storeRole !== 'manager' && n.storeRole !== 'store');
    stand.storeDept = 'deli'; stand.storeRole = 'manager';        // somebody takes the empty chair
    ck('  ^ and with the chair REFILLED, `done` alone still refuses a second unseating',
       !!S.unseatTarget() && S.resolveUnseat('merit') === false &&
       S.resolveUnseat('loyal') === false && stand.alive,
       'chair refilled by ' + stand.name.split(' ')[0] + ', still alive=' + stand.alive +
       ', done=' + g.career.unseat.done);
    stand.storeRole = 'staff'; stand.storeDept = 'grocery';       // put the world back
  }
  /* and the merit road, rolled to completion afterwards, must not re-fire either */
  const before = g.NPCS.filter(n => !n.alive).length;
  for (let d = 0; d < 5; d++) {
    S.deptStaff('deli').forEach(n => { n.stress = 0; n.strikes = 0; n.feudWith = null; n.gone = false; });
    g.today.tasks = 3; S.nextDay();
  }
  ck('  ^ and rolling the merit road to completion afterwards removes nobody else',
     g.NPCS.filter(n => !n.alive).length === before && g.career.unseat.done === 'sabo',
     before + ' gone before, ' + g.NPCS.filter(n => !n.alive).length + ' after');
}

{
  /* MUTANT: "the promotion gate stops checking whether the chair is filled" survived, because the
     gate was only ever read AFTER the unseating, when it is open either way. Read it BEFORE. */
  const { S, g } = asClerk('bakery');
  let gt = null; try { gt = S.gateFor(2); } catch (e) {}
  ck('the Department Manager rung is CLOSED while somebody is still in the chair',
     !!gt && gt.ok === false && /Doreen/.test(gt.hint || ''),
     gt ? JSON.stringify(gt) : 'no gate');
  /* and it must not be openable by climbing at it */
  g.player.prog = 100; const r0 = g.player.rank; S.tryPromote();
  ck('  ^ and pushing at it does not promote you past them',
     g.player.rank === r0 && !!S.unseatTarget(),
     'rank ' + r0 + ' -> ' + g.player.rank + ', ' + (S.unseatTarget() || {}).name);
}

{
  /* MUTANT: "the store's WAY UP falls back to the office switch (Dale returns)" survived because
     the panel was read at the CLERK rung, where next is "<DEPT> MANAGER" — a string the office
     switch has no case for, so it falls to default and mentions nobody. The collision only shows
     at the rung where next is literally "ASSISTANT MANAGER". Read it THERE. */
  const { S, g } = asClerk('produce');
  driveLoyal(S);                                  // clear rung 3 for real
  g.player.prog = 100; S.tryPromote();            // now a PRODUCE MANAGER
  ck('the store player really is at the rung whose next is ASSISTANT MANAGER',
     g.RANKS[g.player.rank + 1] === 'ASSISTANT MANAGER',
     g.RANKS[g.player.rank] + ' -> ' + g.RANKS[g.player.rank + 1]);
  const txt = JSON.stringify(S.ladderSteps() || { steps: [{ text: 'NO PANEL' }] });
  ck('  ^ and even THERE the store never mentions Dale or his favour meter',
     txt.indexOf('Dale') < 0 && !/likes you/i.test(txt),
     txt.indexOf('Dale') >= 0 ? 'MENTIONS DALE: ' + txt.slice(0, 200) : 'no Dale, no favour meter');
}

{
  /* MUTANT: "sabotage credits a prank on anyone, not just your manager" survived because the
     tests only ever pranked the manager. Prank somebody else. */
  const { S, g } = asClerk('grocery');
  const other = g.NPCS.find(n => n.alive && n.storeRole !== 'manager' && n.storeRole !== 'store');
  const mgrOther = g.NPCS.find(n => n.alive && n.storeRole === 'manager' && n.storeDept !== 'grocery');
  S.prankHit(other, 'mislabel', 1);
  S.prankHit(mgrOther, 'mislabel', 1);            // a manager, but of a department that is not yours
  ck('a prank on anyone but YOUR manager credits nothing toward the chair',
     g.career.unseat.sabo === 0 && !S.unseatDone(),
     'pranked ' + other.name.split(' ')[0] + ' and ' + mgrOther.name.split(' ')[0] +
     ' -> sabo ' + g.career.unseat.sabo);
  S.prankHit(S.unseatTarget(), 'mislabel', 1);
  ck('  ^ and one on the right person still does', g.career.unseat.sabo === 1,
     'sabo ' + g.career.unseat.sabo);
}

{
  /* MUTANT: "deptHealth measures the whole store instead of one department" survived because only
     one department was ever posed. Pose TWO, opposite ways, and require them to disagree. */
  const w2 = mk(), S2 = w2.sandbox;
  S2.deptStaff('deli').forEach(n => { n.gone = false; n.wentHome = false; n.stress = 0; n.strikes = 0; n.feudWith = null; });
  S2.deptStaff('bakery').forEach(n => { n.gone = false; n.wentHome = false; n.stress = 100; n.strikes = 3; n.feudWith = null; });
  const hd = S2.deptHealth('deli'), hb = S2.deptHealth('bakery');
  ck('a calm department and a wrecked one do not report the same health',
     hd > hb + 20, 'deli ' + hd + ' vs bakery ' + hb);
  ck('  ^ and wrecking one department does not drag the other down',
     hd >= 70, 'deli still ' + hd + ' with bakery at ' + hb);
}

{
  /* MUTANT: "the merit road no longer requires the player to have worked" survived because every
     merit drive set today.tasks. Roll a day where the department is spotless and the player did
     NOTHING, and require the road not to move. */
  const { S, g } = asClerk('front');
  for (let d = 0; d < 4; d++) {
    S.deptStaff('front').forEach(n => { n.stress = 0; n.strikes = 0; n.feudWith = null; n.gone = false; });
    g.today.tasks = 0;                            // a day spent doing nothing at all
    S.nextDay();
  }
  ck('a good day you had no hand in does not count toward the merit road',
     g.career.unseat.merit === 0 && !S.unseatDone(),
     'merit ' + g.career.unseat.merit + '/' + 3 + ' after 4 idle days, dept health ' +
     S.deptHealth('front'));
  /* and one you DID work does */
  S.deptStaff('front').forEach(n => { n.stress = 0; n.strikes = 0; n.feudWith = null; n.gone = false; });
  g.today.tasks = 3; S.nextDay();
  ck('  ^ and a good day you worked does', g.career.unseat.merit === 1,
     'merit ' + g.career.unseat.merit);
}

{
  /* MUTANT: "the loyalty ask stops checking the favour threshold" survived because the ask was
     only ever pressed after passing it. Press it early. */
  const { S, g } = asClerk('bakery');
  const b = S.storeBoss();
  ck('the loyalty ask is refused with no favours banked at all',
     S.loyalReady() === false && S.askBossToMove() === false && !S.unseatDone(),
     'loyalCount ' + S.loyalCount() + ', done ' + g.career.unseat.done);
  S.creditFavor(b); S.creditFavor(b);             // some, but not enough
  ck('  ^ and still refused one short of the threshold',
     S.loyalCount() > 0 && S.loyalCount() < 4 && S.loyalReady() === false &&
     S.askBossToMove() === false && !S.unseatDone(),
     'loyalCount ' + S.loyalCount() + '/4, done ' + g.career.unseat.done);
  while (!S.loyalReady()) S.creditFavor(b);
  ck('  ^ and accepted at it', S.askBossToMove() === true && g.career.unseat.done === 'loyal',
     'loyalCount ' + S.loyalCount() + ', done ' + g.career.unseat.done);
}

/* ---- 9c. THE PATHS PANEL IS THE STORE'S TOO ---------------------------------------------
   A THIRD office-shaped panel, found by opening it in a browser rather than by any grep. gateFor
   and ladderSteps both collided on a rank NAME; renderPaths never matches a string at all — it is
   hardcoded office content behind player.rank>=5 — so the display-string grep could not find it.
   A DELI CLERK opening PATHS was reading about Dale's 16-beat errand arc, the catfish, Sterling
   and "three roads to CEO", a job this level does not contain. */
{
  const { S, g } = asClerk('deli');
  const body = S.document.getElementById('pathsBody');
  ck('the store has a PATHS panel to render into', !!body, body ? 'found' : 'no #pathsBody');
  S.renderPaths();
  const html = body ? body.innerHTML : '';
  ck('the store PATHS panel names none of the office routes',
     html.indexOf('Dale') < 0 && html.indexOf('Sterling') < 0 && !/catfish/i.test(html) &&
     !/to CEO/i.test(html),
     html.indexOf('Dale') >= 0 ? 'MENTIONS DALE' : (/to CEO/i.test(html) ? 'MENTIONS CEO' : 'clean'));
  ck('  ^ and names all three store roads with the person in the chair',
     /MERIT/.test(html) && /LOYALTY/.test(html) && /SABOTAGE/.test(html) && html.indexOf('Bruno') >= 0,
     html.length + ' chars');
  /* before a department is chosen it must say so rather than describing a road to nowhere */
  const w3 = mk(), S3 = w3.sandbox;
  S3.renderPaths();
  const h3 = S3.document.getElementById('pathsBody').innerHTML;
  ck('  ^ and before a department is picked it says to pick one', /pick a department/i.test(h3),
     h3.slice(0, 90));

  /* the office panel is untouched and still names its own routes */
  const o2 = createWorld(), OS2 = o2.sandbox;
  o2.run(9000, { ignoreGameOver: true });
  OS2.renderPaths();
  const oh = OS2.document.getElementById('pathsBody').innerHTML;
  ck('the office PATHS panel still describes the office routes',
     oh.indexOf('Dale') >= 0 && /CEO/.test(oh) && !/date code|shrink|rota/i.test(oh),
     oh.length + ' chars, Dale ' + (oh.indexOf('Dale') >= 0 ? 'named' : 'MISSING'));
}

/* ---- 9d. THE HUD GATE HINT FITS ITS SLOT -------------------------------------------------
   The first version read "Bruno still runs DELI — see THE WAY UP for the three roads to that
   chair": 101 characters, which wrapped to three lines in the HUD's narrow rank-note slot, ran
   off the top-left and clipped behind the rank title. Fine in a test, unreadable on a TV. Length
   is the property that broke, so length is what this asserts. */
{
  const { S, g } = asClerk('bakery');
  const hint = (S.gateFor(2) || {}).hint || '';
  /* ⚠️ prog MUST be at 100 or the note does not carry the hint at all — the first version of this
     measured "Day 1 — next: BAKERY MANAGER", 28 characters with no hint in it, and passed while
     measuring nothing. The hint only appears on a HELD promotion. */
  g.player.prog = 100;
  S.updateHUD();
  const note = S.document.getElementById('rankNote').textContent;
  ck('the held-promotion hint really is in the note before its length is judged',
     note.indexOf(hint) >= 0 && hint.length > 0, 'hint "' + hint + '" in note: ' + (note.indexOf(hint) >= 0));
  /* THE BAR IS ANCHORED ON THE OFFICE, not invented. Measured there, a held promotion's note runs
     106 characters at ASSISTANT MANAGER, 212 at MANAGER and 273 at CEO — so the overflow is a
     long-standing HUD problem this branch did not cause and is far worse in the office. What this
     asserts is that the STORE does not add to it: its note stays inside two lines, which is what
     the slot actually shows before it clips behind the rank title. The office's own overflow is
     recorded in TESTME rather than fixed here — it is a HUD change, not a ladder one. */
  ck('the held-promotion hint fits the HUD slot the office overflows', note.length <= 70,
     note.length + ' chars (office: 106/212/273): ' + note);
  ck('  ^ and still points at where the roads are explained', /THE WAY UP/.test(hint),
     hint);
}

/* ---- 10. THE OFFICE IS UNTOUCHED --------------------------------------------------------- */
{
  const o = createWorld(), OS = o.sandbox, og = o.g;
  o.run(9000, { ignoreGameOver: true });
  ck('the office has no unseating target and no store roads',
     OS.unseatTarget() === null && OS.storeBoss() === null && !og.player.storeDept,
     'target=' + OS.unseatTarget() + ', boss=' + OS.storeBoss());
  /* ⚠️ BOTH OF THESE WERE HOLLOW ON THE FIRST DRAFT and said so in their own output.
     "still names Dale" compared JSON.stringify(x||{}).length > 0, which is true of "{}" — it
     passed at a rank with no steps at all. And the health comparison read "branchHealth 0 vs
     healthBreakdown 0": at boot the office cast is parked off-map, healthCore returns null and
     both sides are 0, so it compared nothing to nothing. Drive to a state where each has a real
     value first. */
  og.player.rank = 3;                                   // the rung whose steps are Dale's
  const L = OS.ladderSteps();
  const lt = JSON.stringify(L || {});
  ck("the office's own WAY UP still names Dale where it should",
     !!L && Array.isArray(L.steps) && L.steps.length > 0 && lt.indexOf('Dale') >= 0,
     L ? (L.title + ' — ' + L.steps.length + ' steps, Dale ' + (lt.indexOf('Dale') >= 0 ? 'named' : 'MISSING')) : 'no panel');

  /* branchHealth was refactored to share its per-person core with deptHealth. Same number —
     asserted on a floor with people actually on it, and on a NON-zero value. */
  /* ⚠️ POSED, NOT PLAYED (§15). Two earlier drafts of this were hollow. Reading it at one frame
     gave "branchHealth 0 vs healthBreakdown 0"; sampling 80 frames across a run gave peak 0 —
     and a PRISTINE tree does the same, because a harness office run ends with one worker not
     gone and healthCore returns null for an empty floor. Zero equals zero proves nothing.

     So deal a real floor and sweep it through states that produce DIFFERENT numbers. If the
     refactor had changed the arithmetic, some stress level would disagree. */
  let mismatch = 0, values = [];
  [0, 20, 45, 70, 95].forEach(stress => {
    og.NPCS.forEach(n => { if (OS.isWorker(n)) { n.gone = false; n.wentHome = false; n.stress = stress; n.strikes = 0; n.feudWith = null; } });
    let a = null, b2 = null;
    try { a = OS.branchHealth(); b2 = OS.healthBreakdown().health; } catch (e) { return; }
    values.push(a);
    if (a !== b2) mismatch++;
  });
  const distinct = new Set(values).size;
  ck('branch health is unchanged by the refactor that made deptHealth possible',
     values.length === 5 && mismatch === 0 && distinct >= 3 && Math.max.apply(null, values) > 0,
     values.length + ' posed states -> ' + values.join('/') + ', ' + mismatch + ' mismatches');

  /* and the department formula is the SAME four terms: a store department under identical stress
     must move the same way. This is what "a department is a branch" means in practice. */
  {
    const gw = mk(), GS2 = gw.sandbox, gg = gw.g;
    const hs = [0, 45, 95].map(stress => {
      GS2.deptStaff('deli').forEach(n => { n.gone = false; n.wentHome = false; n.stress = stress; n.strikes = 0; n.feudWith = null; });
      return GS2.deptHealth('deli');
    });
    ck('  ^ and deptHealth moves with stress the same way branch health does',
       hs[0] > hs[1] && hs[1] > hs[2] && hs[0] > 0,
       'deli health at stress 0/45/95 = ' + hs.join('/'));
  }

  /* the prank menu's label line is SHARED, and now runs every entry through prankLabel(). The
     office relabels nothing (prankLabels:null), so its wording must be byte-identical. */
  {
    const own = og.NPCS.find(n => OS.isWorker(n));
    own.profiled = true;
    const seen = [];
    const rm = OS.renderMenu;
    OS.renderMenu = function (o2) { o2.items.forEach(i => seen.push(i.label)); };
    try { OS.planPrank(own); } catch (e) {}
    OS.renderMenu = rm;
    const joined = seen.join(' | ');
    ck('the office prank list still uses the office words',
       /Mislabel their colour-coded files/.test(joined) &&
       /Forge a disloyal reply-all to Dale/.test(joined) &&
       !/date code|rota|temperature log/i.test(joined),
       seen.filter(l => !/^—|Cancel/.test(l)).slice(0, 2).join(' | ') || '(no items)');
  }

  const st = o.run(20000, { ignoreGameOver: true });
  ck('the office still soaks clean', st.throws === 0 && og.renderErrs === 0,
     'throws ' + st.throws + ', renderErrs ' + og.renderErrs +
     (st.firstThrow ? '\n     ' + String(st.firstThrow).split('\n').slice(0, 2).join(' | ') : ''));
}

console.log('unseat: ' + pass + ' pass, ' + fail + ' fail');
console.log(fail ? 'GROCERY UNSEATING: RED ❌' : 'GROCERY UNSEATING: GREEN ✅ (three roads, one chair, one resolution)');
process.exit(fail ? 1 : 0);
