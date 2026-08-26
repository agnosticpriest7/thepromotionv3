/* GROCERY LADDER — Save-Rite's own six rungs, with the department branch in the middle.

   WHAT THIS GUARDS. The store used to run the office's straight seven-rung ladder with grocery
   words painted on it. Its own shape is six rungs that BRANCH at rung 1:

       BAGGER -> <DEPT> CLERK -> <DEPT> MANAGER -> ASSISTANT MANAGER -> STORE MANAGER -> OWNER

   RANKS is read as a flat global array in 41 places, so the branch is a LOOKUP, not a system:
   storeLadder(dept) returns the array and applyLadder() assigns it, reusing the seam the level
   select already used to swap ladders at boot.

   ⚠️ THE LADDER IS DRIVEN, NEVER SET. Every climb below pushes prog to 100 and calls the real
   tryPromote(), so gateFor(), the side effects and the department prompt all run. Assigning
   player.rank directly would prove the titles render and nothing else — the uncraftable-recipes
   failure. One rung is additionally driven by completing a REAL task, to prove the ordinary
   in-game path still reaches tryPromote at all. */
'use strict';
const { createWorld } = require('./harness');

let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log('  ' + (c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '   ' + d : '')); c ? pass++ : fail++; };

/* The ladder IS the spec, so it is named here (§14: game-rule constants are the exception and
   SHOULD be hard-coded — this test must fail if somebody quietly re-shapes the climb). */
const RUNGS = 6;
const DEPTS = ['front', 'grocery', 'produce', 'deli', 'bakery'];
const DEPT_NAMES = { front: 'FRONT END', grocery: 'GROCERY', produce: 'PRODUCE', deli: 'DELI', bakery: 'BAKERY' };
const OFFICE_LADDER = ['INTERN', 'JUNIOR SALES', 'SALES', 'SENIOR SALES', 'ASSISTANT MANAGER', 'MANAGER', 'CEO'];

const mk = () => createWorld({ storage: { 'promo:level': 'grocery', 'promo:newgame': '0', 'promo:char': '0' } });

/* CLEAR THE RUNG-3 GATE THE WAY A PLAYER WOULD. grocery-unseating put a real gate on the
   Department Manager rung — one named occupant, three roads to move them — so a climb that used
   to run straight up now stops there, correctly. This drives the LOYALTY road with the same two
   real functions the game uses: build the Store Manager's favour track, then press the verb.
   Nothing here sets career.unseat.done, which would be the uncraftable-recipes failure. */
function clearRung3(S, g) {
  const boss = S.storeBoss();
  if (!boss) return false;
  for (let i = 0; i < 12 && !S.loyalReady(); i++) { try { S.creditFavor(boss); } catch (e) { break; } }
  try { return S.askBossToMove() === true; } catch (e) { return false; }
}

/* pick a department through the REAL menu action, not by calling the setter */
function chooseVia(S, deptId) {
  const menu = S.storeDeptMenu();
  const idx = DEPTS.indexOf(deptId);
  if (idx < 0 || !menu.items[idx]) return false;
  menu.items[idx].act();
  /* CLOSE IT. Activating an item by hand is not the same as the player pressing A: the menu stays
     open, and an open menu holds the sim. The first draft of the day-boundary check ran 60,000
     frames and came back still on day 1 with zero throws — a frozen clock reads exactly like a
     clean soak, which is the failure mode t_grocery_soak exists to catch. */
  try { S.closeMenu(); } catch (e) {}
  return true;
}

/* ---- 1. the neutral ladder, before any choice ------------------------------------------- */
{
  const w = mk(), g = w.g;
  ck('Save-Rite boots on its own ladder, six rungs long', g.RANKS.length === RUNGS,
     g.RANKS.length + ' rungs: ' + g.RANKS.join(' > '));
  ck('a Bagger who has not chosen sees neutral titles above them',
     g.RANKS[0] === 'BAGGER' && /^DEPARTMENT /.test(g.RANKS[1]) && /^DEPARTMENT /.test(g.RANKS[2]),
     g.RANKS[1] + ' / ' + g.RANKS[2]);
  ck('the top three rungs are department-independent',
     g.RANKS[3] === 'ASSISTANT MANAGER' && g.RANKS[4] === 'STORE MANAGER' && g.RANKS[5] === 'OWNER',
     g.RANKS.slice(3).join(' > '));
  ck('nobody starts with a department', g.player.storeDept === null || g.player.storeDept === undefined,
     'storeDept=' + g.player.storeDept);
}

/* ---- 2. ALL SIX RUNGS, climbed for real, for EVERY department --------------------------- */
DEPTS.forEach(dept => {
  const w = mk(), S = w.sandbox, g = w.g, P = g.player;
  w.run(9000, { ignoreGameOver: true });

  /* count the department prompt: it must open EXACTLY ONCE, and only at the Bagger rung */
  let prompts = 0, promptAtRank = [];
  const rm = S.renderMenu;
  S.renderMenu = function (o) {
    if (o && /DEPARTMENT/.test(String(o.title))) { prompts++; promptAtRank.push(P.rank); }
    try { return rm.apply(null, arguments); } catch (e) { return null; }
  };

  const climb = [];
  let held = 0, unseated = 0;
  for (let step = 0; step < 40; step++) {
    const before = P.rank;
    P.prog = 100;
    S.tryPromote();
    if (P.rank === before) {
      held++;
      /* Blocked. The only legitimate block in this level is "pick a department first" — and
         choosing calls tryPromote itself, so the Bagger->Clerk rung lands INSIDE this branch.
         The first draft did not record it and reported a five-rung climb to OWNER as a failure. */
      if (!P.storeDept) {
        chooseVia(S, dept);
        if (P.rank !== before) climb.push(P.rank + ':' + g.RANKS[P.rank]);
        continue;
      }
      /* the other legitimate block: somebody still runs the department you picked */
      if (S.unseatTarget() && clearRung3(S, g)) { unseated++; continue; }
      break;
    }
    climb.push(P.rank + ':' + g.RANKS[P.rank]);
    if (P.rank >= RUNGS - 1) break;
  }
  S.renderMenu = rm;

  const want = ['BAGGER', DEPT_NAMES[dept] + ' CLERK', DEPT_NAMES[dept] + ' MANAGER',
                'ASSISTANT MANAGER', 'STORE MANAGER', 'OWNER'];
  ck(dept + ': all six rungs are reachable by real promotion, in order',
     P.rank === RUNGS - 1 && climb.length === RUNGS - 1 &&
     climb.every((c, i) => c === (i + 1) + ':' + want[i + 1]),
     'reached ' + g.RANKS[P.rank] + ' via ' + climb.join(' -> '));
  /* THE DESK SURVIVES THE CLIMB. tryPromote's room-moving side effects are office furniture:
     claimManagerOffice writes MGR_DESK, an office const that loadLevel('grocery') cleared out of
     `desks`, and it BLANKS the desk you were on to do it. Left ungated, reaching OWNER handed the
     player a desk that is not in the world and took away the station they actually stand at. */
  {
    const mine = g.desks.filter(d => d.owner === 'you');
    ck(dept + ': the player still owns exactly one real desk at the top of the ladder',
       mine.length === 1 && g.desks.indexOf(mine[0]) >= 0,
       mine.length + ' desk(s) owned, ' + g.desks.length + ' in the world');
  }
  ck(dept + ': rungs 2 and 3 wear the chosen department',
     g.RANKS[1] === want[1] && g.RANKS[2] === want[2],
     g.RANKS[1] + ' / ' + g.RANKS[2]);
  ck(dept + ': the department prompt opened exactly once, at the Bagger rung',
     prompts === 1 && promptAtRank.length === 1 && promptAtRank[0] === 0,
     prompts + ' prompt(s) at rank(s) [' + promptAtRank.join(',') + '], ' + held + ' held step(s)');
  ck(dept + ': the Department Manager rung really was gated on their chair',
     unseated === 1, unseated + ' unseating(s) needed to finish the climb');
});

/* ---- 2b. BACKING OUT OF THE CHOICE CANNOT END THE RUN -----------------------------------
   ⚠️ THIS WHOLE SUITE WAS GREEN THROUGH A SOFTLOCK. The picker was opened behind the same
   career.gateShown latch every other gate uses, so a player who pressed B — or tapped the ✕ that
   renderMenu appends to every menu — never saw it again: prog pinned at 100, tryPromote returning
   early forever, a Bagger for the rest of the run. Nothing here caught it, because every test
   chose a department the moment it was offered. It was found by looking at the screen.

   So: dismiss it the way a player would, then prove the run is still alive. */
{
  const w = mk(), S = w.sandbox, g = w.g, P = g.player;
  w.run(9000, { ignoreGameOver: true });

  P.prog = 100; S.tryPromote();
  ck('the picker is up at the Bagger rung', g.menuOpen === true, 'menuOpen=' + g.menuOpen);
  ck('  ^ and it offers no way out, because the ladder cannot continue without an answer',
     (S.storeDeptMenu().noClose === true), 'noClose=' + S.storeDeptMenu().noClose);

  /* dismiss it anyway — B and Esc both reach closeMenu(), and so does the tappable X */
  S.closeMenu();
  ck('  ^ dismissing it really does close it', g.menuOpen === false, 'menuOpen=' + g.menuOpen);

  /* the game keeps calling tryPromote every frame via updateRank; it must come back */
  let back = false;
  for (let i = 0; i < 5 && !back; i++) { P.prog = 100; S.tryPromote(); back = (g.menuOpen === true); }
  ck('the picker comes back after being dismissed — no dead end', back,
     back ? 'reopened' : 'gone for good: rank ' + P.rank + ', prog ' + Math.round(P.prog) + ', dept ' + P.storeDept);

  /* and the run is still climbable afterwards, which is the thing that actually matters */
  chooseVia(S, 'deli');
  for (let i = 0; i < 12 && P.rank < RUNGS - 1; i++) {
    P.prog = 100; S.tryPromote();
    if (S.unseatTarget() && P.rank === 1) clearRung3(S, g);
  }
  ck('  ^ and the ladder still goes all the way up afterwards', P.rank === RUNGS - 1,
     'reached ' + g.RANKS[P.rank] + ' (rank ' + P.rank + ')');
}

/* ---- 3. IRREVERSIBILITY, structurally --------------------------------------------------- */
{
  const w = mk(), S = w.sandbox, g = w.g;
  w.run(9000, { ignoreGameOver: true });
  chooseVia(S, 'bakery');
  ck('the department is set by the choice', g.player.storeDept === 'bakery', 'storeDept=' + g.player.storeDept);

  let second = null, third = null, junk = null;
  try { second = S.setStoreDept('deli'); } catch (e) { second = 'threw ' + e; }
  try { third = S.setStoreDept('bakery'); } catch (e) { third = 'threw ' + e; }
  try { junk = S.setStoreDept('accounts payable'); } catch (e) { junk = 'threw ' + e; }
  ck('the setter refuses every later write, including the same value',
     second === false && third === false && g.player.storeDept === 'bakery',
     'second=' + second + ' third=' + third + ' -> ' + g.player.storeDept);
  ck('and it refuses a department that does not exist', junk === false,
     'junk=' + junk);

  /* going through the MENU again must also fail — the menu is not a second write path */
  chooseVia(S, 'produce');
  ck('re-running the picker cannot change it', g.player.storeDept === 'bakery',
     'storeDept=' + g.player.storeDept);

  /* the titles did not move either — a stale RANKS would be the same bug wearing a hat */
  ck('the ladder still reads BAKERY after all of that',
     g.RANKS[1] === 'BAKERY CLERK' && g.RANKS[2] === 'BAKERY MANAGER',
     g.RANKS[1] + ' / ' + g.RANKS[2]);
}

/* ---- 3b. structural, at the SOURCE ------------------------------------------------------
   "Irreversible" is only structural if there is exactly ONE place that can write the field
   during play. A guard in a setter is worth nothing if a second assignment lives elsewhere, so
   this counts assignment sites in the shipped file rather than trusting the guard. */
{
  const fs = require('fs'), path = require('path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const writes = src.match(/player\.storeDept\s*=/g) || [];
  ck('exactly one line in the whole build assigns player.storeDept', writes.length === 1,
     writes.length + ' assignment site(s)');
  const inSetter = /function setStoreDept\(id\)\{[\s\S]{0,400}?player\.storeDept=id;/.test(src);
  ck('  ^ and it is inside setStoreDept, behind the guard', inSetter,
     inSetter ? 'guarded' : 'the assignment is not in setStoreDept');
}

/* ---- 4. THE SAVE: additive, and a missing field means "not chosen yet" ------------------- */
{
  const w = mk(), S = w.sandbox, g = w.g, save = w.rawSave();
  w.run(9000, { ignoreGameOver: true });
  chooseVia(S, 'produce');
  g.player.prog = 100; S.tryPromote();
  const rankBefore = g.player.rank, titleBefore = g.RANKS[1];

  save.slot = 0;
  const snap = save.buildSnapshot(false, null);
  ck('the snapshot carries the department', snap.player.storeDept === 'produce',
     'snapshot storeDept=' + snap.player.storeDept);
  save.Store.save(0, snap);

  /* ⚠️ RESTORE INTO A FRESH WORLD, NOT THIS ONE. The first draft applied the snapshot back onto
     the same world that had just chosen PRODUCE, so RANKS already said PRODUCE CLERK before the
     load and would have said it afterwards no matter what the restore did — a mutant that deleted
     applyLadder() from the load path SURVIVED. The test had redefined the world to include the
     mutation, exactly like the aisle midpoints. A fresh world is sitting on the NEUTRAL ladder,
     so the titles can only be right if the restore actually re-derived them. */
  const fw = mk(), fg = fw.g, fsave = fw.rawSave();
  ck('the world being loaded into starts on the neutral ladder',
     fg.RANKS[1] === 'DEPARTMENT CLERK' && !fg.player.storeDept,
     'rung 2 = ' + fg.RANKS[1] + ', storeDept=' + fg.player.storeDept);
  let applied = null;
  try { applied = fsave.applySnapshot(JSON.parse(JSON.stringify(snap))); } catch (e) { applied = 'threw ' + e; }
  ck('a run with a department round-trips it',
     applied === true && fg.player.storeDept === 'produce' && fg.player.rank === rankBefore,
     'applied=' + applied + ' dept=' + fg.player.storeDept + ' rank=' + fg.player.rank);
  ck('  ^ and the loaded run shows ITS department on the ladder, not the neutral one',
     fg.RANKS[1] === titleBefore && fg.RANKS[1] === 'PRODUCE CLERK',
     fg.RANKS[1] + ' / ' + fg.RANKS[2]);

  /* THE PRE-BRANCH SAVE. Every save written before this branch has no storeDept, because the
     choice did not exist. That is not corrupt data — it is a run that has not chosen yet, which
     is exactly what the field means. This is the case for NOT bumping SAVE_VERSION, asserted
     rather than argued: strip the field and the run must be a Bagger who is still being asked. */
  const older = JSON.parse(JSON.stringify(snap));
  delete older.player.storeDept;
  older.player.rank = 0; older.player.prog = 0;
  const w2 = mk(), S2 = w2.sandbox, g2 = w2.g, save2 = w2.rawSave();
  let applied2 = null;
  try { applied2 = save2.applySnapshot(older); } catch (e) { applied2 = 'threw ' + e; }
  ck('a save with NO department field still loads', applied2 === true, 'applied=' + applied2);
  ck('  ^ and behaves as not-yet-chosen', !g2.player.storeDept && /^DEPARTMENT /.test(g2.RANKS[1]),
     'storeDept=' + g2.player.storeDept + ', rung 2 = ' + g2.RANKS[1]);
  /* and it can still choose — a defaulted field must be a live choice, not a dead one */
  g2.player.prog = 100; S2.tryPromote();
  chooseVia(S2, 'deli');
  ck('  ^ and can still make the choice afterwards',
     g2.player.storeDept === 'deli' && g2.RANKS[1] === 'DELI CLERK',
     'storeDept=' + g2.player.storeDept + ', rung 2 = ' + g2.RANKS[1]);
}

/* ---- 5. missMeeting NEVER FIRES IN THE STORE, AT ANY RANK -------------------------------
   It was dormant BY RANK (it returns early below rank 2), and this branch is precisely what
   takes a grocery player past rank 2 — so it would have armed itself as a side effect of
   shipping a ladder. The player is DRIVEN to the top rung first, then every rung is checked. */
{
  const w = mk(), S = w.sandbox, g = w.g, P = g.player;
  w.run(9000, { ignoreGameOver: true });
  P.prog = 100; S.tryPromote(); chooseVia(S, 'front');
  for (let i = 0; i < 12 && P.rank < RUNGS - 1; i++) {
    P.prog = 100; S.tryPromote();
    if (S.unseatTarget() && P.rank === 1) clearRung3(S, g);
  }
  ck('the store player really is at the top rung before this is tested', P.rank === RUNGS - 1,
     'rank ' + P.rank + ' = ' + g.RANKS[P.rank]);

  let disciplined = 0, toasts = 0;
  const td = S.triggerDiscipline, tt = S.toast;
  S.triggerDiscipline = function () { disciplined++; };
  S.toast = function (m) { if (/meeting|written up/i.test(String(m))) toasts++; try { return tt.apply(null, arguments); } catch (e) {} };
  for (let r = 0; r < RUNGS; r++) {
    P.rank = r;                                   // a probe, not a climb: every rung is checked
    g.career.meetingMisses = 0;
    for (let k = 0; k < 8; k++) S.missMeeting();
  }
  S.triggerDiscipline = td; S.toast = tt;
  ck('missMeeting never disciplines in the store, at any rank',
     disciplined === 0 && toasts === 0,
     disciplined + ' disciplines, ' + toasts + ' write-up toasts over ' + RUNGS + ' rungs x8 misses');
  ck('  ^ and it does not even bank a strike', !(g.career.meetingMisses > 0),
     'meetingMisses=' + g.career.meetingMisses);
}

/* ---- 6. triggerAudit is NOT armed by departments existing -------------------------------
   Departments are a new namespace and the worry is a real one: hrs() reads `n.dept`, so a value
   like 'deli' living in the same field could make a clerk satisfy an HR check. The field is
   called storeDept for exactly that reason. Asserted, not assumed. */
{
  const w = mk(), S = w.sandbox, g = w.g;
  w.run(9000, { ignoreGameOver: true });
  chooseVia(S, 'deli');
  ck('the player carries no NPC-style dept field at all',
     g.player.dept === undefined && g.player.storeDept === 'deli',
     'player.dept=' + g.player.dept + ', player.storeDept=' + g.player.storeDept);
  ck('no crew member acquired a department either', g.NPCS.every(n => n.dept !== 'deli'),
     g.NPCS.map(n => n.dept).filter((v, i, a) => a.indexOf(v) === i).join(', ') + ' on the floor');
  let hrCount = -1; try { hrCount = S.hrs().length; } catch (e) {}
  ck('hrs() is still empty with a department chosen', hrCount === 0, hrCount + ' hr');
  let threw = null;
  const before = g.NPCS.map(n => n.x + ',' + n.y).join('|');
  try { for (let i = 0; i < 25; i++) S.triggerAudit(); } catch (e) { threw = String(e); }
  ck('triggerAudit is still a no-op in the store', !threw && g.NPCS.map(n => n.x + ',' + n.y).join('|') === before,
     threw ? threw : '25 calls, nobody moved');
}

/* ---- 7. A DAY BOUNDARY, with a promoted player ------------------------------------------
   Promotion is day-boundary work (nextDay rolls prog, decay, autosave) and tickLights once threw
   from 08:15 behind a 3,000-frame window. Climb first, THEN roll days. */
{
  const w = mk(), S = w.sandbox, g = w.g, P = g.player;
  w.run(9000, { ignoreGameOver: true });
  P.prog = 100; S.tryPromote(); chooseVia(S, 'grocery');
  for (let i = 0; i < 12 && P.rank < RUNGS - 2; i++) {
    P.prog = 100; S.tryPromote();
    if (S.unseatTarget() && P.rank === 1) clearRung3(S, g);
  }
  const rankAt = P.rank, ladderAt = g.RANKS.join('|');
  let throws = 0, firstThrow = null;
  for (let f = 0; f < 60000; f += 500) {
    const r = w.run(500, { ignoreGameOver: true });
    throws += r.throws; if (!firstThrow) firstThrow = r.firstThrow;
  }
  ck('a promoted store player survives a day boundary',
     throws === 0 && g.renderErrs === 0 && g.day >= 2,
     'day ' + g.day + ', throws ' + throws + ', renderErrs ' + g.renderErrs +
     (firstThrow ? '\n     ' + String(firstThrow).split('\n').slice(0, 2).join(' | ') : ''));
  ck('  ^ and the ladder is still the store ladder afterwards',
     g.RANKS.join('|') === ladderAt && g.RANKS.length === RUNGS &&
     g.RANKS.indexOf('ASSISTANT TO THE MANAGER') < 0,
     g.RANKS.join(' > '));
  ck('  ^ and the department did not drift', g.player.storeDept === 'grocery' && P.rank >= rankAt,
     'storeDept=' + g.player.storeDept + ', rank ' + P.rank);
}

/* ---- 8. the ORDINARY in-game path still promotes ----------------------------------------
   Everything above pushes prog to 100 by hand. That proves gateFor and tryPromote, but not that
   anything in the game still REACHES tryPromote. completeTask() is the ordinary route. */
{
  const w = mk(), S = w.sandbox, g = w.g, P = g.player;
  w.run(9000, { ignoreGameOver: true });
  P.prog = 100; S.tryPromote(); chooseVia(S, 'front');
  clearRung3(S, g);                      // the next rung is gated on the manager's chair
  const rank0 = P.rank;
  P.prog = 96;                                   // one task's worth short of the next rung
  let done = false;
  try { S.addTask({ via: 'printer', label: 'Face the endcap' }); } catch (e) {}
  try {
    const t = S.openTask('printer');
    if (t) { S.completeTask(t); done = true; }
  } catch (e) {}
  ck('completing a real task still drives a promotion', done && P.rank === rank0 + 1,
     done ? ('rank ' + rank0 + ' -> ' + P.rank + ' (' + g.RANKS[P.rank] + ')') : 'no task to complete');
}

/* ---- 9. THE OFFICE IS COMPLETELY UNCHANGED ---------------------------------------------- */
{
  const o = createWorld(), OS = o.sandbox, og = o.g;
  ck('the office ladder is untouched, rung for rung',
     og.RANKS.length === OFFICE_LADDER.length && og.RANKS.every((r, i) => r === OFFICE_LADDER[i]),
     og.RANKS.join(' > '));
  o.run(9000, { ignoreGameOver: true });

  /* the office GATES are the thresholds — same answers, same hints */
  const gates = [];
  for (let i = 1; i < og.RANKS.length; i++) {
    let gt = null; try { gt = OS.gateFor(i); } catch (e) { gt = { ok: 'threw' }; }
    gates.push(og.RANKS[i] + '=' + (gt && gt.ok));
  }
  ck('the office still gates SALES, ASSISTANT MANAGER, MANAGER and CEO',
     gates.join(',').indexOf('ASSISTANT MANAGER=false') >= 0 &&
     gates.join(',').indexOf('MANAGER=false') >= 0 &&
     gates.join(',').indexOf('CEO=false') >= 0,
     gates.join('  '));

  /* and missMeeting still bites there */
  let odisc = 0;
  const otd = OS.triggerDiscipline; OS.triggerDiscipline = function () { odisc++; };
  og.player.rank = 3; og.career.meetingMisses = 0;
  for (let k = 0; k < 4; k++) OS.missMeeting();
  OS.triggerDiscipline = otd;
  ck('missMeeting still disciplines in the office', odisc >= 1,
     odisc + ' disciplines at SENIOR SALES over 4 misses');

  const st = o.run(20000, { ignoreGameOver: true });
  ck('the office still soaks clean with the ladder changes in',
     st.throws === 0 && og.renderErrs === 0,
     'throws ' + st.throws + ', renderErrs ' + og.renderErrs +
     (st.firstThrow ? '\n     ' + String(st.firstThrow).split('\n').slice(0, 2).join(' | ') : ''));
  ck('  ^ and no office player ever grows a storeDept', !og.player.storeDept,
     'storeDept=' + og.player.storeDept);
}

console.log('ladder: ' + pass + ' pass, ' + fail + ' fail');
console.log(fail ? 'GROCERY LADDER: RED ❌' : 'GROCERY LADDER: GREEN ✅ (six rungs, one branch, chosen once)');
process.exit(fail ? 1 : 0);
