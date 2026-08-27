/* GROCERY UPPER RUNGS — the back half of the ladder, three gates with three different shapes.

       DEPARTMENT MANAGER --(out-manage the other four)--> ASSISTANT MANAGER
                          --(settle what you owe Lorne)--> STORE MANAGER
                          --(Merv decides to sell)-------> OWNER

   Deliberately NOT "three roads" three times: rung 3 is where the knives are, rung 4 is a
   performance comparison, rung 5 is a debt, and rung 6 is a succession you can decline.

   ⚠️ THE NEGATIVE CASES ARE THE SUBJECT MATTER. This branch's whole content is gates, and a test
   that only walks through an open one cannot tell a working gate from an open door. Every gate
   below is asserted SHUT under the conditions that should shut it — below threshold, one day
   short, three departments beaten instead of four, debt unpaid — before it is asserted open.

   ⚠️ AND MERV'S OFFER IS A MODAL, so it gets the unexplored-path treatment: refused, refused
   repeatedly, saved during, and reloaded into. */
'use strict';
const { createWorld } = require('./harness');

let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log('  ' + (c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '   ' + d : '')); c ? pass++ : fail++; };

/* the spec (§14) */
const DEPTS = ['front', 'grocery', 'produce', 'deli', 'bakery'];
const RUNGS = 6;
const AM_LEAD_DAYS = 3, MERV_DAYS = 3, MERV_TARGET = 70;

const mk = () => createWorld({ storage: { 'promo:level': 'grocery', 'promo:newgame': '0', 'promo:char': '0' } });

/* ---- posing a day, and rolling it ------------------------------------------------------
   ⚠️ THE DAY IS SAMPLED, NOT SNAPSHOTTED. Health is judged on the day's AVERAGE (sampleHealth),
   because at the instant nextDay runs every member of staff has gone home and every department
   reads 0 — the bug that made the rung-3 merit road unreachable in real play. So a posed day has
   to accumulate samples the way a real one does, or it is not testing what the game does. */
function poseAndRoll(w, opts) {
  const S = w.sandbox, g = w.g, P = g.player;
  const mine = opts.mine, others = opts.othersStress === undefined ? 75 : opts.othersStress;
  const beat = opts.beat || DEPTS.filter(d => d !== mine);          // which departments we out-perform
  DEPTS.forEach(d => S.deptStaff(d).forEach(n => {
    n.gone = false; n.wentHome = false; n.feudWith = null;
    const rough = (d !== mine) && beat.indexOf(d) >= 0;
    n.stress = rough ? others : (opts.calm === false ? 40 : 0);
    n.strikes = rough ? 1 : 0;
  }));
  P.stress = opts.playerStress === undefined ? 0 : opts.playerStress;
  g.today.deptSum = {}; g.today.deptN = 0; g.today.healthSum = 0; g.today.healthN = 0;
  for (let i = 0; i < 20; i++) {
    DEPTS.forEach(d => { g.today.deptSum[d] = (g.today.deptSum[d] || 0) + S.deptHealth(d); });
    g.today.deptN++;
    g.today.healthSum += S.branchHealth(); g.today.healthN++;
  }
  g.today.tasks = opts.worked === false ? 0 : 3;
  /* ⚠️ WHAT THE DECISION SAW. nextDay resets `today`, so reading healthToday() afterwards gives
     0 no matter what the day was like — the first draft printed "health 0/70" next to a PASS,
     which is exactly the kind of evidence that makes a hollow assertion look sound. */
  w.lastSeen = { store: S.healthToday(), dept: DEPTS.map(d => S.deptHealthToday(d)) };
  /* ⚠️ AND THEN EVERYONE GOES HOME, because that is what a real evening does. Three mutants
     survived the first sweep purely because this pose left the whole crew standing on the floor at
     the moment nextDay ran — so reading health at the INSTANT gave the same answer as reading the
     day's average, and swapping one for the other changed nothing the test could see. That is the
     precise condition the day-average fix exists for, and a pose that does not reproduce it cannot
     guard it. */
  /* ⚠️ `gone`, NOT `wentHome`, because that is the flag real play actually sets at the boundary
     (measured: gone=12, wentHome=0). It matters which one: deptHealth filters BOTH, but
     branchHealth filters only `gone` — so a pose that set wentHome zeroed the department numbers
     and left the store-wide one intact, and the mutant that made Merv read the empty floor
     survived. Half a faithful pose is not a faithful pose. */
  g.NPCS.forEach(n => { n.gone = true; });
  S.nextDay();
}

/* get to DEPARTMENT MANAGER of a department, using only real functions */
function asDeptManager(dept) {
  const w = mk(), S = w.sandbox, g = w.g, P = g.player;
  w.run(9000, { ignoreGameOver: true });
  P.prog = 100; S.tryPromote();
  S.storeDeptMenu().items[DEPTS.indexOf(dept)].act();
  try { S.closeMenu(); } catch (e) {}
  const b = S.storeBoss();
  for (let i = 0; i < 12 && !S.loyalReady(); i++) S.creditFavor(b);
  S.askBossToMove();
  P.prog = 100; S.tryPromote();
  return { w, S, g, P };
}

/* ---- 1. THE SAMPLING FIX ITSELF ---------------------------------------------------------
   Guarded first, because every gate below depends on it and it is the bug that silently disabled
   the rung-3 merit road before this branch. */
{
  const w = mk(), S = w.sandbox, g = w.g;
  let atBoundary = null;
  const orig = S.upperRollDay;
  S.upperRollDay = function () {
    if (!atBoundary) atBoundary = { instant: DEPTS.map(d => S.deptHealth(d)), day: DEPTS.map(d => S.deptHealthToday(d)) };
    return orig();
  };
  w.run(45000, { ignoreGameOver: true });
  S.upperRollDay = orig;
  ck('a day boundary really does find every department empty', !!atBoundary && atBoundary.instant.every(h => h === 0),
     atBoundary ? 'instant: ' + atBoundary.instant.join(',') : 'no boundary reached');
  ck('  ^ but the DAY AVERAGE still has real numbers to judge on',
     !!atBoundary && atBoundary.day.filter(h => h > 40).length >= 4,
     atBoundary ? 'day average: ' + atBoundary.day.join(',') : '');
}

/* ---- 2. RUNG 4: OUT-MANAGE THE OTHER FOUR ---------------------------------------------- */
{
  const { w, S, g, P } = asDeptManager('deli');
  ck('the AM rung is SHUT on day one', S.gateFor(3).ok === false && /Beat the other four/.test(S.gateFor(3).hint),
     JSON.stringify(S.gateFor(3)));

  /* NEGATIVE: beating THREE of the four is not beating four */
  poseAndRoll(w, { mine: 'deli', beat: ['front', 'grocery', 'produce'] });   // bakery left calm
  ck('  ^ beating three departments does not count as beating four',
     g.career.upper.lead === 0 && S.gateFor(3).ok === false,
     'lead ' + g.career.upper.lead + ', the day he saw was mine ' + w.lastSeen.dept[DEPTS.indexOf('deli')] +
     ' vs best-other ' + Math.max.apply(null, w.lastSeen.dept.filter((h, i) => DEPTS[i] !== 'deli')));

  /* NEGATIVE: one day short */
  for (let d = 0; d < AM_LEAD_DAYS - 1; d++) poseAndRoll(w, { mine: 'deli' });
  ck('  ^ and ' + (AM_LEAD_DAYS - 1) + ' good days is still one short',
     g.career.upper.lead === AM_LEAD_DAYS - 1 && S.gateFor(3).ok === false,
     'lead ' + g.career.upper.lead + '/' + AM_LEAD_DAYS);

  /* NEGATIVE: a broken run resets */
  poseAndRoll(w, { mine: 'deli', beat: [] });                       // nobody out-performed
  ck('  ^ and one ordinary day breaks the run', g.career.upper.lead === 0,
     'lead ' + g.career.upper.lead);

  /* POSITIVE */
  for (let d = 0; d < AM_LEAD_DAYS; d++) poseAndRoll(w, { mine: 'deli' });
  ck('the AM rung opens after ' + AM_LEAD_DAYS + ' days ahead of every other department',
     g.career.upper.lead >= AM_LEAD_DAYS && S.gateFor(3).ok === true,
     'lead ' + g.career.upper.lead + ', gate ' + JSON.stringify(S.gateFor(3)));

  const garret = S.storeAM();
  /* ⚠️ ASSERT THE CLEANUP, NOT THE DISAPPEARANCE. "he is not alive any more" is true of a direct
     removal too, so the first version could not tell npcLeaving() from `alive=false` — and the
     mutant that dropped npcLeaving survived. Hang things off him first and require them swept. */
  g.player.leverage.push({ label: 'something on Garret', target: garret.name, power: 30, src: 'test' });
  garret.prankBuild = { type: 'mislabel', tier: 1, stage: 1, armed: false };
  S.creditFavor(garret);
  const witness = g.NPCS.find(n => n.alive && n !== garret && n.storeRole === 'staff');
  if (witness) witness.mission = { target: garret.name, kind: 'test' };

  P.prog = 100; S.tryPromote();
  ck('  ^ and taking it promotes you to ASSISTANT MANAGER', g.RANKS[P.rank] === 'ASSISTANT MANAGER',
     g.RANKS[P.rank]);
  ck('  ^ and Garret is passed over and moves on, through npcLeaving()',
     !!garret && !garret.alive && !S.storeAM() &&
     g.player.leverage.filter(l => l.target === garret.name).length === 0 &&
     !garret.prankBuild && !g.career.favors[garret.name] && !(witness && witness.mission),
     'leverage ' + g.player.leverage.filter(l => l.target === garret.name).length +
     ', prankBuild ' + (garret.prankBuild ? 'left' : 'cleared') +
     ', favours ' + (g.career.favors[garret.name] ? 'left' : 'cleared') +
     ", witness's job " + (witness && witness.mission ? 'left' : 'cleared'));
}

/* ---- 3. RUNG 5: WHAT YOU OWE LORNE ------------------------------------------------------ */
{
  const { w, S, g, P } = asDeptManager('bakery');
  for (let d = 0; d < AM_LEAD_DAYS; d++) poseAndRoll(w, { mine: 'bakery' });
  P.prog = 100; S.tryPromote();                                    // -> ASSISTANT MANAGER

  ck('the Store Manager rung is SHUT while the debt stands',
     S.gateFor(4).ok === false && /owe/i.test(S.gateFor(4).hint), JSON.stringify(S.gateFor(4)));

  /* the loyalty road was used to reach rung 3 here, so the debt is bigger */
  ck('  ^ and taking his help at rung 3 made the debt larger',
     S.lorneDebt() > 3 && g.career.unseat.done === 'loyal',
     'debt ' + S.lorneDebt() + ' (paid ' + S.loyalCount() + '), rung 3 via ' + g.career.unseat.done);

  /* NEGATIVE: asking early is refused, and one short is still short */
  ck('  ^ asking before the debt is paid is refused',
     S.settleWithLorne('repaid') === false && !S.lorneSettled(), 'settled=' + g.career.upper.settled);
  /* BOUNDED. An unbounded while() here let a mutant that changed lorneDebt() spin the test
     past the runner's timeout, which killed the five mutants queued behind it. A test that
     can hang cannot be mutated reliably. */
  for (let i = 0; i < 40 && S.loyalCount() < S.lorneDebt() - 1; i++) S.creditFavor(S.storeBoss());
  ck('  ^ and one favour short is still short',
     S.lorneRepaid() === false && S.settleWithLorne('repaid') === false,
     S.loyalCount() + '/' + S.lorneDebt());

  /* NEGATIVE: betraying him without anything on him is refused too */
  ck('  ^ and you cannot move on him with nothing on him',
     S.lorneLeverage() === false && S.settleWithLorne('betrayed') === false, 'no leverage');

  /* POSITIVE */
  const lorne = S.storeBoss();
  S.creditFavor(lorne);
  /* read the count BEFORE settling: settleWithLorne routes him through npcLeaving, which sweeps
     career.favors[his name] — so afterwards it is 0 and the message would read "0/7" beside a
     PASS. */
  const paidAtAsk = S.loyalCount(), debtAtAsk = S.lorneDebt(), repaidAtAsk = S.lorneRepaid();
  ck('paying the debt in full lets you ask',
     repaidAtAsk === true && paidAtAsk >= debtAtAsk && S.settleWithLorne('repaid') === true,
     paidAtAsk + '/' + debtAtAsk + ' owed, settled=' + g.career.upper.settled);
  ck('  ^ and Lorne leaves through npcLeaving()', !lorne.alive && !S.storeBoss(),
     lorne.name + ' alive=' + lorne.alive);
  P.prog = 100; S.tryPromote();
  ck('  ^ and the rung opens', g.RANKS[P.rank] === 'STORE MANAGER', g.RANKS[P.rank]);
}

/* ---- 3b. THE OTHER WAY OUT OF THE SAME DEBT --------------------------------------------- */
{
  const { w, S, g, P } = asDeptManager('produce');
  for (let d = 0; d < AM_LEAD_DAYS; d++) poseAndRoll(w, { mine: 'produce' });
  P.prog = 100; S.tryPromote();
  const lorne = S.storeBoss();
  g.player.leverage.push({ label: 'what Lorne signed off on', target: lorne.name, power: 50, src: 'test' });
  const susBefore = Math.round(g.player.suspicion);
  ck('with something on him, the other road opens', S.lorneLeverage() === true, 'leverage held');
  ck('  ^ and using it settles the debt the hard way',
     S.settleWithLorne('betrayed') === true && g.career.upper.settled === 'betrayed' && !lorne.alive,
     'settled=' + g.career.upper.settled);
  ck('  ^ and it costs suspicion, unlike repaying him',
     Math.round(g.player.suspicion) > susBefore,
     susBefore + ' -> ' + Math.round(g.player.suspicion));
  ck('  ^ and it can only happen once', S.settleWithLorne('repaid') === false, 'second settle refused');
}

/* ---- 4. RUNG 6: MERV SELLS -------------------------------------------------------------- */
function toStoreManager(dept) {
  const ctx = asDeptManager(dept);
  for (let d = 0; d < AM_LEAD_DAYS; d++) poseAndRoll(ctx.w, { mine: dept });
  ctx.P.prog = 100; ctx.S.tryPromote();
  for (let i = 0; i < 40 && !ctx.S.lorneRepaid(); i++) ctx.S.creditFavor(ctx.S.storeBoss());
  ctx.S.settleWithLorne('repaid');
  ctx.P.prog = 100; ctx.S.tryPromote();
  return ctx;
}
{
  const { w, S, g, P } = toStoreManager('front');
  ck('the Owner rung is SHUT before Merv has seen anything',
     S.gateFor(5).ok === false && /sell/i.test(S.gateFor(5).hint), JSON.stringify(S.gateFor(5)));

  /* NEGATIVE: a store below threshold never moves him */
  for (let d = 0; d < 4; d++) poseAndRoll(w, { mine: 'front', calm: false, playerStress: 90, othersStress: 90, beat: DEPTS });
  ck('  ^ and a store running badly never moves him at all',
     g.career.upper.mervDays === 0 && !S.mervReady() && S.gateFor(5).ok === false &&
     w.lastSeen.store < MERV_TARGET,
     'mervDays ' + g.career.upper.mervDays + ', the day he saw was ' + w.lastSeen.store + '/' + MERV_TARGET);

  /* NEGATIVE: a store that is merely OK. Above half the bar and under it — the case that tells a
     real threshold from one that has been quietly halved. */
  /* everyone middling and nobody carrying strikes: beat:[] means no department is posed as
     "rough", so this is stress alone rather than stress plus a pile of strikes (which took
     the first attempt down to 30, under half the bar and so proving nothing). */
  for (let d = 0; d < MERV_DAYS + 1; d++) poseAndRoll(w, { mine: 'front', calm: false, playerStress: 40, beat: [] });
  ck('  ^ and a merely OK store does not move him either',
     g.career.upper.mervDays === 0 && !S.mervReady() &&
     w.lastSeen.store > MERV_TARGET / 2 && w.lastSeen.store < MERV_TARGET,
     'the day he saw was ' + w.lastSeen.store + ' — over half of ' + MERV_TARGET + ', under ' + MERV_TARGET);

  /* NEGATIVE: one day short of the streak */
  for (let d = 0; d < MERV_DAYS - 1; d++) poseAndRoll(w, { mine: 'front', beat: [] });
  ck('  ^ and ' + (MERV_DAYS - 1) + ' good days is one short of him offering',
     g.career.upper.mervDays === MERV_DAYS - 1 && S.mervReady() === false,
     'mervDays ' + g.career.upper.mervDays + '/' + MERV_DAYS);

  /* POSITIVE: he offers */
  poseAndRoll(w, { mine: 'front', beat: [] });
  ck('after ' + MERV_DAYS + ' good days Merv is ready to talk about selling',
     S.mervReady() === true && g.career.upper.mervDays >= MERV_DAYS &&
     w.lastSeen.store >= MERV_TARGET,
     'mervDays ' + g.career.upper.mervDays + ', the day he saw was ' + w.lastSeen.store + '/' + MERV_TARGET);

  /* ⚠️ THE MODAL. Refuse it, refuse it again, and confirm the run is not stranded. */
  P.prog = 100; S.tryPromote();
  ck('  ^ and he comes to you rather than you pushing at a gate', g.menuOpen === true,
     'menuOpen=' + g.menuOpen);
  const offer = S.mervOfferMenu();
  ck('  ^ and the offer can be declined, because a succession is not a promotion',
     offer.items.length === 2 && /not yet/i.test(offer.items[1].label), offer.items.map(i => i.label).join(' / '));

  offer.items[1].act(); try { S.closeMenu(); } catch (e) {}
  ck('declining leaves the run coherent — still Store Manager, Merv still there',
     g.RANKS[P.rank] === 'STORE MANAGER' && !!S.storeOwner() && !g.career.upper.accepted,
     'rank ' + g.RANKS[P.rank] + ', refused ' + g.career.upper.refused);

  /* and he asks again — the offer must not be a one-shot the player can lose */
  P.prog = 100; S.tryPromote();
  ck('  ^ and he asks again afterwards', g.menuOpen === true && S.mervReady() === true,
     'menuOpen=' + g.menuOpen + ', refused ' + g.career.upper.refused);
  S.mervOfferMenu().items[1].act(); try { S.closeMenu(); } catch (e) {}
  P.prog = 100; S.tryPromote();
  ck('  ^ twice declined and still offerable', S.mervReady() === true && g.career.upper.refused >= 2,
     'refused ' + g.career.upper.refused);

  /* POSITIVE: accept */
  const merv = S.storeOwner();
  try { S.closeMenu(); } catch (e) {}
  S.mervOfferMenu().items[0].act();
  ck('accepting takes the store', g.career.upper.accepted === true && !merv.alive && !S.storeOwner(),
     merv.name + ' alive=' + merv.alive);
  P.prog = 100; S.tryPromote();
  ck('  ^ and the last rung opens', g.RANKS[P.rank] === 'OWNER', g.RANKS[P.rank]);
  ck('  ^ and accepting twice does nothing', S.acceptMerv() === false, 'second accept refused');
}

/* ---- 5. ALL SIX RUNGS, EVERY DEPARTMENT, DRIVEN END TO END ------------------------------ */
{
  const failed = [];
  DEPTS.forEach(dept => {
    const ctx = toStoreManager(dept);
    for (let d = 0; d < 8 && !ctx.S.mervReady(); d++) poseAndRoll(ctx.w, { mine: dept, beat: [] });
    ctx.P.prog = 100; ctx.S.tryPromote();
    try { ctx.S.closeMenu(); } catch (e) {}
    ctx.S.mervOfferMenu().items[0].act();
    ctx.P.prog = 100; ctx.S.tryPromote();
    if (ctx.g.RANKS[ctx.P.rank] !== 'OWNER') failed.push(dept + ':' + ctx.g.RANKS[ctx.P.rank]);
  });
  ck('all six rungs are reachable by real promotion, in every department', failed.length === 0,
     failed.length ? failed.join(', ') : 'front, grocery, produce, deli, bakery all reach OWNER');
}

/* ---- 6. THE INVARIANT: the run survives its targets leaving by other means -------------- */
{
  const { w, S, g, P } = asDeptManager('grocery');
  for (let d = 0; d < AM_LEAD_DAYS; d++) poseAndRoll(w, { mine: 'grocery' });
  P.prog = 100; S.tryPromote();                                     // AM

  /* Lorne leaves by something else entirely, mid-debt */
  const lorne = S.storeBoss();
  S.creditFavor(lorne);
  S.npcLeaving(lorne); lorne.alive = false;
  let threw = null, settled = null;
  try { settled = S.settleWithLorne('repaid'); } catch (e) { threw = String(e).split('\n')[0]; }
  ck('settling with a Store Manager who has already gone is refused, not a crash',
     !threw && settled === false, threw || 'returned ' + settled);
  ck('  ^ and the rung opens anyway, because the chair is empty',
     S.gateFor(4).ok === true, JSON.stringify(S.gateFor(4)));
  ck('  ^ and nothing still points at him',
     !g.career.favors[lorne.name] && g.player.leverage.filter(l => l.target === lorne.name).length === 0,
     'favours ' + (g.career.favors[lorne.name] ? 'left' : 'clear'));

  P.prog = 100; S.tryPromote();
  /* and Merv likewise */
  const merv = S.storeOwner();
  S.npcLeaving(merv); merv.alive = false;
  let acc = null;
  try { acc = S.acceptMerv(); } catch (e) { acc = 'threw ' + e; }
  ck('accepting from an owner who has gone is refused, not a crash', acc === false, 'returned ' + acc);
  ck('  ^ and the last rung opens anyway', S.gateFor(5).ok === true, JSON.stringify(S.gateFor(5)));
  P.prog = 100; S.tryPromote();
  ck('  ^ and the run still finishes', g.RANKS[P.rank] === 'OWNER', g.RANKS[P.rank]);
}

/* ---- 7. SAVE AND LOAD MID-CLIMB --------------------------------------------------------- */
{
  const { w, S, g, P } = asDeptManager('deli');
  poseAndRoll(w, { mine: 'deli' });
  poseAndRoll(w, { mine: 'deli' });
  const before = { lead: g.career.upper.lead, settled: g.career.upper.settled, merv: g.career.upper.mervDays };
  ck('the upper climb is genuinely part-way before saving', before.lead === 2, JSON.stringify(before));

  const save = w.rawSave(); save.slot = 0;
  const snap = save.buildSnapshot(false, null);
  const f = mk(), FS = f.sandbox, fg = f.g;
  ck('  ^ and the world being loaded into has none of it', (fg.career.upper || {}).lead === 0,
     JSON.stringify(fg.career.upper));
  let applied = null;
  try { applied = f.rawSave().applySnapshot(JSON.parse(JSON.stringify(snap))); } catch (e) { applied = 'threw ' + e; }
  ck('a mid-climb save round-trips the upper progress',
     applied === true && fg.career.upper.lead === before.lead && fg.career.upper.settled === before.settled,
     'applied=' + applied + ' -> ' + JSON.stringify(fg.career.upper));

  /* A PRE-BRANCH SAVE HAS NO UPPER BLOCK AT ALL — and it must be loaded into a run that ALREADY
     HAS PROGRESS, or the assertion proves nothing. career is MERGED, not replaced, so a missing
     key silently keeps the live run's value; loading into a fresh world would look correct however
     broken the restore was. That omission is exactly what let a mutant through. */
  const older = JSON.parse(JSON.stringify(snap));
  delete older.career.upper;
  const ctx2 = asDeptManager('deli');
  poseAndRoll(ctx2.w, { mine: 'deli' });
  poseAndRoll(ctx2.w, { mine: 'deli' });
  ck('the receiving run has an upper climb of its own before the load',
     ctx2.g.career.upper.lead === 2, JSON.stringify(ctx2.g.career.upper));
  let a2 = null;
  try { a2 = ctx2.w.rawSave().applySnapshot(older); } catch (e) { a2 = 'threw ' + e; }
  ck('a save with no upper block loads as "nobody has climbed this far", not as the live run',
     a2 === true && ctx2.g.career.upper.lead === 0 && !ctx2.g.career.upper.accepted &&
     ctx2.g.career.upper.settled === null,
     'applied=' + a2 + ' -> ' + JSON.stringify(ctx2.g.career.upper));
}

/* ---- 7b. BOTH EXPLANATION PANELS KNOW ABOUT THESE GATES --------------------------------
   ⚠️ FOUND BY OPENING THEM IN A BROWSER, NOT BY A TEST. When the upper gates were added, neither
   of the store's two panels learned about them: the PATHS tab still said "the rungs above this
   one are not gated yet" at every rung from the third up — true when it was written, false one
   branch later — and THE WAY UP fell through to a one-line hint. The panel whose entire job is
   telling the player what to do next was describing half the ladder as a formality.

   A stale panel is invisible to every other kind of check: nothing throws, nothing overlaps, no
   string collides. So this asserts that each upper rung's panels actually name that rung's gate. */
{
  const { S, g } = asDeptManager('deli');
  const body = S.document.getElementById('pathsBody');
  /* what each rung's panels must be talking about */
  const WANT = {
    2: /out-manage|ahead of|other four/i,      // -> ASSISTANT MANAGER
    3: /owe|debt|favours/i,                    // -> STORE MANAGER
    4: /sell|not fought|whole store/i,         // -> OWNER
  };
  const stalePaths = [], staleSteps = [], leaked = [];
  Object.keys(WANT).forEach(r => {
    g.player.rank = +r;
    try { S.renderPaths(); } catch (e) {}
    const html = body ? String(body.innerHTML) : '';
    if (!WANT[r].test(html)) stalePaths.push(g.RANKS[+r] + '->' + g.RANKS[+r + 1]);
    if (/not gated yet/i.test(html)) stalePaths.push(g.RANKS[+r] + ':still says "not gated yet"');
    if (/Dale|Sterling|catfish|to CEO/i.test(html)) leaked.push(g.RANKS[+r] + ':office content');
    let L = null; try { L = S.ladderSteps(); } catch (e) {}
    const steps = JSON.stringify(L || {});
    if (!WANT[r].test(steps)) staleSteps.push(g.RANKS[+r] + '->' + g.RANKS[+r + 1]);
  });
  g.player.rank = 2;
  ck('the PATHS panel names the gate for every upper rung', stalePaths.length === 0,
     stalePaths.length ? stalePaths.join(', ') : 'AM, Store Manager and Owner each described');
  ck('  ^ and THE WAY UP checklist does too', staleSteps.length === 0,
     staleSteps.length ? staleSteps.join(', ') : 'three rungs, three checklists');
  ck('  ^ and neither of them mentions the office', leaked.length === 0,
     leaked.length ? leaked.join(', ') : 'no Dale, no Sterling, no catfish, no CEO');

  /* and at the very top it says so, rather than describing a rung that does not exist */
  g.player.rank = RUNGS - 1;
  try { S.renderPaths(); } catch (e) {}
  const top = body ? String(body.innerHTML) : '';
  ck('  ^ and the top of the ladder says it is the top', /top of the ladder|nothing above/i.test(top),
     top.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 90));
  g.player.rank = 2;
}

/* ---- 8. THE OFFICE IS UNTOUCHED --------------------------------------------------------- */
{
  const o = createWorld(), OS = o.sandbox, og = o.g;
  o.run(9000, { ignoreGameOver: true });
  ck('the office has no store hierarchy at all',
     OS.storeAM() === null && OS.storeOwner() === null && OS.storeBoss() === null,
     'am=' + OS.storeAM() + ' owner=' + OS.storeOwner());
  const gates = [];
  for (let i = 1; i < og.RANKS.length; i++) { let gt = null; try { gt = OS.gateFor(i); } catch (e) { gt = { ok: 'threw' }; } gates.push(og.RANKS[i] + '=' + gt.ok); }
  ck('the office ladder still gates exactly where it did',
     gates.join(',').indexOf('ASSISTANT MANAGER=false') >= 0 && gates.join(',').indexOf('CEO=false') >= 0,
     gates.join('  '));
  const st = o.run(20000, { ignoreGameOver: true });
  ck('the office still soaks clean', st.throws === 0 && og.renderErrs === 0,
     'throws ' + st.throws + ', renderErrs ' + og.renderErrs +
     (st.firstThrow ? '\n     ' + String(st.firstThrow).split('\n').slice(0, 2).join(' | ') : ''));
}

console.log('upper: ' + pass + ' pass, ' + fail + ' fail');
console.log(fail ? 'GROCERY UPPER RUNGS: RED ❌' : 'GROCERY UPPER RUNGS: GREEN ✅ (out-manage, settle, succeed)');
process.exit(fail ? 1 : 0);
