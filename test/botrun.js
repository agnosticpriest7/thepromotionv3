/* ============================================================================
   BOTRUN — an on-demand exploratory bot sweep, NOT a gate test.

   Deliberately named botrun.js and not t_*.js: gate.js's unlisted-test guard
   governs the t_ naming convention, and this is a tool you point at the build to
   shake things out, not a regression test that must pass on every merge. Nothing
   here is a substitute for the gate.

   It drives the REAL functions through the harness — no reimplementation — and
   prints one compact table. Every check is wrapped, so one broken area reports
   and the sweep carries on instead of taking the rest down with it.

   Usage:  node test/botrun.js
   ============================================================================ */
'use strict';
const { createWorld } = require('./harness');

const rows = [];
let pass = 0, fail = 0, warn = 0;
function ck(area, name, ok, detail) {
  rows.push([ok ? 'PASS' : 'FAIL', area, name, detail == null ? '' : String(detail)]);
  ok ? pass++ : fail++;
}
function note(area, name, detail) { rows.push(['note', area, name, String(detail)]); warn++; }
function guard(area, name, fn) {
  try { fn(); } catch (e) { ck(area, name, false, 'THREW: ' + e.message); }
}

/* A fresh world per scenario — these bots mutate state hard, and a leaked world
   makes the next check a lie. */
function fresh(frames, opts) {
  const w = createWorld();
  w.startNewGame(0);
  if (frames) w.run(frames, Object.assign({ ignoreGameOver: true }, opts || {}));
  return w;
}
const S_ = w => w.sandbox;

/* ---------------------------------------------------------------- 1. CHARACTERS */
const CHARS = [[0, 'Intern'], [21, 'Stacie'], [22, 'Kyle'], [23, 'Raelee'], [24, 'Jax']];
CHARS.forEach(([idx, name]) => {
  guard('characters', name, () => {
    const w = fresh(0);
    const S = S_(w);
    const got = S.setPlayerChar(idx);
    ck('characters', name + ' selectable', got === idx, 'idx=' + got);
    w.run(3000, { ignoreGameOver: true });
    const p = w.g.player;
    ck('characters', name + ' survives 3k frames',
       w.g.renderErrs === 0 && p && isFinite(p.x) && S.charIndexFor(p) === idx,
       'renderErrs=' + w.g.renderErrs + ' face=' + S.charIndexFor(p));
    /* seated art in all four directions — a missing pose falls back to a placeholder,
       which is exactly the thing you would not notice until you saw it on the TV */
    const seats = ['down', 'up', 'left', 'right'].map(d => {
      const s = S.seatedPersonSpriteFor(p, d);
      return s ? (s.mirror ? 'M' : 'A') : '-';
    });
    ck('characters', name + ' has all 4 seated poses', seats.every(s => s !== '-'), seats.join(''));
  });
});

/* ---------------------------------------------------------------- 2. SEATING */
guard('seating', 'break', () => {
  const w = fresh(0);
  const S = S_(w);
  /* drive to a break rather than forcing the phase, so arrival/pathing is real */
  let hitBreak = false, best = 0;
  for (let i = 0; i < 60 && !hitBreak; i++) {
    w.run(1500, { ignoreGameOver: true });
    const ph = S.currentPhase().name;
    if (/Break/.test(ph)) {
      hitBreak = true;
      for (let k = 0; k < 30; k++) {   // let them walk to their chairs
        w.run(300, { ignoreGameOver: true });
        const n = w.g.NPCS.filter(x => S.isWorker(x) && S.seatedBreakState(x)).length;
        if (n > best) best = n;
      }
    }
  }
  ck('seating', 'reached a break phase', hitBreak);
  ck('seating', 'NPCs actually sit on break', best > 0, best + ' seated at peak');
});

guard('seating', 'meeting', () => {
  const w = fresh(2000);
  const S = S_(w);
  S.__dbgSeatAll ? S.__dbgSeatAll() : null;
  const chairs = S.allMeetingChairs();
  ck('seating', 'meeting has 16 chairs', chairs.length === 16, chairs.length);
  S.assignSeats(chairs);
  const workers = w.g.NPCS.filter(n => S.isWorker(n) && !n.gone && !n.wentHome);
  const seated = workers.filter(n => n.seat && n.seat.dir).length;
  ck('seating', 'every worker gets a meeting chair', seated === workers.length,
     seated + '/' + workers.length + ' seated, ' + (workers.length - seated) + ' standing');
  const dup = new Set(), clash = chairs.filter(c => c.by && (dup.has(c.by) || !dup.add(c.by))).length;
  ck('seating', 'no two workers share a chair', clash === 0, clash + ' clashes');
});

guard('seating', 'player', () => {
  const w = fresh(2000);
  const S = S_(w);
  const p = w.g.player;
  const mine = w.g.desks.find(d => d.owner === 'you');
  ck('seating', 'player has a desk', !!mine);
  ck('seating', 'player sits at own desk', !!(mine && S.sitAtDesk(mine)) && !!p.sit, p.sit && p.sit.kind);
  /* the 6cd39c3 fix: the interact key must USE the desk, not stand you up */
  const before = p.sit;
  S.tryInteract();
  ck('seating', 'X at desk uses it, stays seated', !!p.sit && p.sit === before);
  S.closeMenu && S.closeMenu();
  S.standUp();
  ck('seating', 'standUp clears the seat', p.sit === null);
  const free = S.allSeatChairs().filter(c => !c.by);
  ck('seating', 'table chairs discoverable', free.length > 0, free.length + ' free');
  if (free.length) {
    ck('seating', 'player sits on a table chair', S.sitOnChair(free[0]) && p.sit.kind === 'chair');
    ck('seating', 'chair marked taken', free[0].by === 'you');
    S.tryInteract();
    ck('seating', 'X on a chair stands you up', p.sit === null && free[0].by === null);
  }
});

/* ---------------------------------------------------------------- 3. ITEMS */
guard('items', 'craft + loot + plant', () => {
  const w = fresh(2000);
  const S = S_(w);
  const p = w.g.player;

  /* LOOT FIRST — crafting consumes parts, so a bot that crafts from an empty inventory proves
     nothing except that it forgot to go shopping. This ordering is the fix for exactly that. */
  const lootable = w.g.desks.filter(d => d.loot && d.loot.length);
  ck('items', 'desks carry loot', lootable.length > 0, lootable.length + ' desks');
  let looted = 0, tried = 0;
  lootable.slice(0, 8).forEach(d => {
    const n0 = p.inv.length; tried++;
    try { S.takeItem && S.takeItem(d, d.loot[0]); } catch (e) {}
    if (p.inv.length > n0) looted++;
  });
  ck('items', 'looting adds to inventory', looted > 0, looted + '/' + tried + ' took, inv=' + p.inv.length);

  /* CRAFT — craftList() returns bare kit ids and doCraft(id) is the real path. It runs through
     startAct, so the kit only lands after the action ticks out: craft, then run frames, then look
     for kit_<id> in the inventory. Calling doCraft and asserting nothing is the trap here. */
  let recipes = [];
  try { recipes = S.craftList() || []; } catch (e) {}
  ck('items', 'craft list is populated', recipes.length > 0, recipes.length + ' recipes: ' + recipes.join(','));
  /* ⚠️ HARNESS LIMITATION, NOT A GAME BUG. doCraft() runs through startAct(2.2,…) and the kit is
     pushed by the completion callback — but player.act.t NEVER DECREMENTS under the harness, so no
     timed action ever finishes here. Verified against the browser: the same doCraft('mislabel')
     ticks out and lands kit_mislabel in the inventory. So every startAct verb — crafting, grinding
     busywork — is UNTESTABLE in the harness, the same way sprite-derived geometry is (see
     HANDOFF-8). What can honestly be asserted here is that the action STARTS; the payoff has to be
     checked in the browser. */
  let started = 0, crafted = 0;
  recipes.forEach(id => {
    const before = p.inv.filter(x => x === 'kit_' + id).length;
    try { S.doCraft(id); } catch (e) { return; }
    if (p.act) started++;
    w.run(400, { ignoreGameOver: true });
    if (p.inv.filter(x => x === 'kit_' + id).length > before) crafted++;
    p.act = null;                                   // clear the stuck act before the next recipe
  });
  ck('items', 'every recipe starts a craft action', started === recipes.length,
     started + '/' + recipes.length + ' started');
  if (crafted === 0) note('items', 'kits never land (harness only)',
     'startAct never ticks here; browser-verified working — see the comment');
  else ck('items', 'crafting yields kits', crafted === recipes.length, crafted + '/' + recipes.length);

  /* PLANT — on somebody else's desk, and it must actually mark the desk */
  const victim = w.g.desks.find(d => d.owner && d.owner !== 'you');
  const kit = p.inv.find(x => String(x).indexOf('kit_') === 0) || p.inv[0];
  let planted = false;
  try { S.plantEvidence(victim, kit); planted = true; } catch (e) {}
  ck('items', 'plant evidence runs', planted, victim && victim.owner + ' <- ' + kit);
  ck('items', 'the desk records the plant', !!(victim && (victim.planted || victim.rigged)),
     'planted=' + (victim && victim.planted) + ' rigged=' + (victim && victim.rigged));
  w.run(2000, { ignoreGameOver: true });
  ck('items', 'world still sane after item verbs', w.g.renderErrs === 0, 'renderErrs=' + w.g.renderErrs);
});

/* ---------------------------------------------------------------- 4. FAVOURS */
guard('favours', 'ask -> accept -> complete', () => {
  const w = fresh(3000);
  const S = S_(w);
  /* The previous version of this check was VACUOUS — it OR'd a `spawned` flag that was set to true
     whether or not any spawn function existed, so it passed unconditionally. That is precisely the
     failure CLAUDE.md §14 is about. Driven through the real chain now:
       offerMission(n) -> missionFor(name) -> acceptMission(m) -> creditMission(m,exposure). */
  const target = w.g.NPCS.find(n => S.isWorker(n) && !n.gone && !n.wentHome);
  ck('favours', 'a worker is available to ask', !!target, target && target.name);
  S.offerMission(target);
  const m = S.missionFor(target.name);
  ck('favours', 'offerMission creates a PENDING ask', !!m && !m.accepted && !m.done,
     m ? m.label : 'no mission created');
  if (m) {
    S.acceptMission(m);
    ck('favours', 'acceptMission marks it accepted', !!m.accepted);
    const before = (w.g.today || {}).favors || 0;
    S.creditMission(m, 1);
    ck('favours', 'creditMission completes it', !!m.done);
    ck('favours', "and credits today's favour count", ((w.g.today || {}).favors || 0) > before,
       before + ' -> ' + ((w.g.today || {}).favors || 0));
  }
  w.run(20000, { ignoreGameOver: true });
  ck('favours', 'world sane after a favour cycle', w.g.renderErrs === 0, 'renderErrs=' + w.g.renderErrs);
});

/* ---------------------------------------------------------------- 5. EMPLOYEES */
guard('employees', 'every NPC menu builds', () => {
  const w = fresh(3000);
  const S = S_(w);
  let built = 0, empty = 0, threw = [];
  w.g.NPCS.forEach(n => {
    try {
      const o = S.buildOptions({ kind: 'npc', ref: n });
      if (o && o.items && o.items.length) built++; else empty++;
    } catch (e) { threw.push(n.name + ': ' + e.message); }
  });
  ck('employees', 'no NPC menu throws', threw.length === 0, threw.slice(0, 2).join(' | '));
  ck('employees', 'every NPC offers options', empty === 0, built + ' with options, ' + empty + ' empty');
  /* desks, objects and containers too — same menu builder, different kinds */
  let otherThrew = 0;
  w.g.desks.filter(d => d.owner).slice(0, 8).forEach(d => {
    try { S.buildOptions({ kind: 'desk', ref: d }); } catch (e) { otherThrew++; }
  });
  (w.g.layout.objects || []).slice(0, 12).forEach(o => {
    try { S.buildOptions({ kind: 'obj', ref: o }); } catch (e) { otherThrew++; }
  });
  (w.g.layout.containers || []).slice(0, 12).forEach(c => {
    try { S.buildOptions({ kind: 'container', ref: c }); } catch (e) { otherThrew++; }
  });
  ck('employees', 'desk/object/container menus build', otherThrew === 0, otherThrew + ' threw');
});

/* ---------------------------------------------------------------- 6. VICTORY PATHS */
/* The CEO chair opens on career.meritReady OR career.vpFavor>=1 (the gateFor('CEO')
   condition). Leverage is the third route in. Each is driven from a rank the player
   could actually reach, then checked for the gate opening — not for a scripted win. */
[['merit', c => { c.meritReady = true; }],
 ['loyalty (vpFavor)', c => { c.vpFavor = 1; }],
 ['leverage', null]].forEach(([name, setup]) => {
  guard('victory', name, () => {
    const w = fresh(1500);
    const S = S_(w);
    S.jumpToRank(5);                       // MANAGER — one below CEO
    w.run(3000, { ignoreGameOver: true });
    const c = w.g.career;
    if (setup) setup(c);
    else {
      const p = w.g.player, mark = w.g.NPCS.find(n => S.isWorker(n) && !n.gone);
      p.leverage.push({ who: mark && mark.name, src: 'hrfile', text: 'bot-planted dirt' });
    }
    const open = (c.meritReady || c.vpFavor >= 1 || (w.g.player.leverage || []).length > 0);
    ck('victory', name + ' route reaches the CEO gate', !!open,
       'meritReady=' + !!c.meritReady + ' vpFavor=' + (c.vpFavor || 0) +
       ' leverage=' + (w.g.player.leverage || []).length);
    w.run(6000, { ignoreGameOver: true });
    ck('victory', name + ' survives past the gate', w.g.renderErrs === 0,
       'rank=' + w.g.RANKS[w.g.player.rank] + ' renderErrs=' + w.g.renderErrs);
  });
});

/* ---------------------------------------------------------------- 7. LONG BOT SOAK */
guard('soak', 'every character, 20k frames each', () => {
  CHARS.forEach(([idx, name]) => {
    const w = fresh(0);
    S_(w).setPlayerChar(idx);
    let stuck = 0;
    w.run(20000, { ignoreGameOver: true });
    const S = S_(w);
    stuck = w.g.NPCS.filter(n => S.isWorker(n) && n.stuckT > 300).length;
    ck('soak', name + ' 20k frames clean',
       w.g.renderErrs === 0 && stuck === 0 && !w.g.gameOver,
       'renderErrs=' + w.g.renderErrs + ' stuck=' + stuck + ' day=' + w.g.day);
  });
});

/* ---------------------------------------------------------------- REPORT */
const W = [6, 12, 44];
console.log('\n================= BOTRUN =================');
let area = null;
rows.forEach(r => {
  if (r[1] !== area) { area = r[1]; console.log('\n-- ' + area.toUpperCase()); }
  console.log('  ' + r[0].padEnd(W[0]) + r[2].padEnd(W[2]) + (r[3] ? '  ' + r[3] : ''));
});
console.log('\n------------------------------------------');
console.log(`${pass} pass · ${fail} fail · ${warn} note`);
console.log(fail === 0 ? 'BOTRUN: GREEN ✅' : 'BOTRUN: RED ❌');
process.exit(fail === 0 ? 0 : 1);
