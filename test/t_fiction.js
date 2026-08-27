/* LEVEL VOCABULARY — the words change per level, the mechanics never do.

   Save-Rite told the player to collate binders, make copies at the printer and finish the TPS
   cover sheets at their desk, and the HUD read INTERN / next: JUNIOR SALES. This guards the fix
   in both directions: grocery reads as a shop, and THE OFFICE IS UNTOUCHED — this is the branch
   most likely to break the office by accident, because it edits shared code paths the office uses
   in production and grocery barely uses at all.

   The office strings are hard-coded here as an ORACLE (§14: game-rule constants belong in the
   test — a test SHOULD fail when they change). Grocery is asserted by ABSENCE of office nouns
   rather than by exact text, so rewording a task does not mean rewriting the test. */
'use strict';
const { createWorld } = require('./harness');
let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${d ? '   ' + d : ''}`); c ? pass++ : fail++; };

const mk = lv => createWorld({ storage: Object.assign({ 'promo:newgame': '0', 'promo:char': '0' },
                                                      lv ? { 'promo:level': lv } : {}) });
const o = mk(null), g = mk('grocery');
o.run(9000, { ignoreGameOver: true });
g.run(9000, { ignoreGameOver: true });
const OS = o.sandbox, GS = g.sandbox;

/* ---- 1. the ladder ---------------------------------------------------------------------- */
const OFFICE_RANKS = ['INTERN','JUNIOR SALES','SALES','SENIOR SALES','ASSISTANT MANAGER','MANAGER','CEO'];
ck('the office ladder is untouched', JSON.stringify(OS.rankNames()) === JSON.stringify(OFFICE_RANKS),
   OS.rankNames().join(' / '));
const gr = GS.rankNames();
ck('grocery has its own ladder labels', gr[0] !== 'INTERN' && /BAGGER/i.test(gr[0]), gr.join(' / '));
/* THIS USED TO ASSERT "the SAME NUMBER OF RUNGS (labels only, no ladder change)" and it was the
   right invariant for the fiction pass: that branch relabelled the office ladder and a changed
   rung count would have meant it had quietly done more than relabel. grocery-ladder is the branch
   where changing the shape IS the change — six rungs with a department branch in the middle — so
   the old assertion went correctly RED and is replaced rather than deleted.

   What still matters here is the same thing it always was: THE TWO LADDERS ARE INDEPENDENT. The
   store's is its own length and shares no rung with the office except the two generic management
   titles a real shop would also use. The climb itself is t_grocery_ladder's business. */
ck("  ^ and it is its OWN ladder, not the office's with new words on it",
   gr.length !== OFFICE_RANKS.length && gr[gr.length - 1] !== 'CEO',
   gr.length + " rungs vs the office's " + OFFICE_RANKS.length + ", top rung " + gr[gr.length - 1]);
ck('  ^ and it borrows no office job title beyond the generic management ones',
   gr.filter(r => OFFICE_RANKS.indexOf(r) >= 0)
     .every(r => r === 'ASSISTANT MANAGER'),
   'shared with the office: ' + (gr.filter(r => OFFICE_RANKS.indexOf(r) >= 0).join(', ') || 'nothing'));

/* ---- 1b. a HELD promotion reads as a refusal in the office and a QUESTION in the store ----
   The HUD decorates a held promotion with a lead-in shared by both levels. The office's gates
   really are refusals — a chair is taken, Dale does not rate you — so BLOCKED is honest there.
   Save-Rite's only held promotion is the department choice, where the player has not failed
   anything: they are being asked something the ladder cannot continue without. */
{
  const note = W => { try { W.sandbox.updateHUD(); } catch (e) {} 
    return W.sandbox.document.getElementById('rankNote').textContent; };

  /* office: drive it to a rung that really is gated, and read the live HUD */
  o.g.player.rank = 3; o.g.player.prog = 100;
  try { OS.tryPromote(); } catch (e) {}
  const on = note(o);
  ck('the office still says BLOCKED on a gate that really is a refusal',
     on.indexOf('BLOCKED: ') >= 0, on);

  /* grocery: the department choice is the only held promotion in the store */
  g.g.player.prog = 100;
  try { GS.tryPromote(); } catch (e) {}
  const gn = note(g);
  ck('the store does not tell the player they are BLOCKED', gn.indexOf('BLOCKED') < 0, gn);
  ck('  ^ it invites them to pick a department instead', /pick a department/i.test(gn), gn);
}

/* ---- 2. the office task pool is byte-identical ------------------------------------------- */
const OFFICE_R0 = [
  'Finish the TPS cover sheets at your desk',
  'Collate the binders at your desk',
  'Make copies at the printer',
  'Shred the old contracts at the printer',
  'Restock the supply station',
  'Refill the water cooler',
  'Bring coffee to {name}',
];
ck('the office rank-0 task pool is byte-identical',
   JSON.stringify(OS.taskPoolLabels(0)) === JSON.stringify(OFFICE_R0),
   OS.taskPoolLabels(0).length + ' entries');

/* ---- 3. grocery carries NO office vocabulary --------------------------------------------- */
const OFFICE_NOUNS = /\b(TPS|binder|binders|printer|photocop|cubicle|CRM|cold-call|call sheet|price sheet|proposal|expense report|contract|pipeline|timesheet|board deck|sales board|memo|spreadsheet|filing|stapler|elevator)\b/i;
{
  const bad = [];
  for (let r = 0; r <= 5; r++)
    GS.taskPoolLabels(r).forEach(l => { if (OFFICE_NOUNS.test(l)) bad.push('rank' + r + ': ' + l); });
  ck('no office noun survives in any grocery task', bad.length === 0,
     bad.length ? bad.join(' | ') : 'ranks 0-5 clean');
}
{
  const v = GS.vocab();
  const strs = [v.clockIn, v.clockOut, v.clockedIn, v.standup].concat(v.detentions || []);
  const bad = strs.filter(x => OFFICE_NOUNS.test(x));
  ck('  ^ nor in the clock-in / clock-out / discipline text', bad.length === 0,
     bad.length ? bad.join(' | ') : strs.length + ' strings clean');
}

/* ---- 4. MECHANICS UNCHANGED. This is the assertion that catches a vocabulary change that
     quietly became a mechanics change: same number of tasks per rank, and the same `via` kinds
     in the same order, so every task still fires at the same trigger. ----------------------- */
{
  /* THIS USED TO ASSERT THAT BOTH LEVELS HAD THE SAME POOL SIZE AND THE SAME VIA LIST, RANK FOR
     RANK, and it was the right invariant for the fiction pass: that branch was a pure RELABEL, so
     a changed count or a changed trigger would have meant it had quietly done more than rename
     things. grocery-flavour is the branch where the store's pool legitimately stops matching the
     office's: each department brings four jobs of its own, and the aisle work moved out of the
     shared list into GROCERY's. So the old assertion went correctly RED and is replaced.

     What still matters is the claim underneath it — THE STORE INVENTED NO NEW MACHINERY. Its
     triggers must all be triggers the office already had, and a shift must still roll the same
     number of tasks. Those hold; pool size no longer does, on purpose. */
  const KINDS = {};
  for (let r = 0; r <= 6; r++) (OS.taskPoolVias(r) || []).forEach(v => { KINDS[v] = 1; });
  const invented = [];
  for (let r = 0; r <= 5; r++) (GS.taskPoolVias(r) || []).forEach(v => { if (!KINDS[v]) invented.push('rank' + r + ':' + v); });
  ck('the store uses only trigger kinds the office already had', invented.length === 0,
     invented.length ? invented.join(', ') : 'kinds in play: ' + Object.keys(KINDS).join(', '));

  /* and the store's pool is genuinely its own now, which is the thing that replaced the old
     equality — asserted so this cannot silently collapse back to a relabel */
  const differs = [];
  for (let r = 0; r <= 2; r++) {
    if ((OS.taskPoolVias(r) || []).length === (GS.taskPoolVias(r) || []).length) continue;
    differs.push('rank' + r);
  }
  ck('  ^ but the floor rungs carry their own department work, not the office shape',
     differs.length >= 2, differs.length + ' of the three floor rungs differ in size from the office');
}
ck('the same number of tasks is rolled in both levels',
   OS.taskLabels().length === GS.taskLabels().length,
   OS.taskLabels().length + ' vs ' + GS.taskLabels().length);

/* ---- 4b. NO OFFICE SYSTEM SWITCHES ITSELF ON AT A STORE RANK --------------------------
   ⚠️ A CLASS OF BUG WITH NO STRING TO GREP FOR. Office content gated on `player.rank >= N`, where
   N names a different job in each level: rank 5 is MANAGER in the office and OWNER in Save-Rite,
   rank 3 is SENIOR SALES there and ASSISTANT MANAGER here. renderPaths and "Land a client" were
   found by opening panels; the Dale arc was found by enumerating every comparison. It had been
   ANNOUNCING itself in the store — a log line and a toast at Department Manager telling the
   player a second path was open, in a building with no Dale.

   This walks every rung of BOTH ladders and asks each office system whether it thinks it is on.
   The store's answer must be no, at every rung, for all of them — except delegation, which is
   deliberately still office-shaped and is its own branch's question. */
{
  const SYSTEMS = ['dalePathAvailable', 'cosignActive', 'catfishAvailable', 'hrFrozen'];
  const leaked = [];
  for (let r = 0; r < GS.rankNames().length; r++) {
    g.g.player.rank = r;
    SYSTEMS.forEach(fn => {
      let on = false;
      try { on = !!GS[fn](); } catch (e) { on = 'threw'; }
      if (on) leaked.push(GS.rankNames()[r] + ':' + fn);
    });
  }
  g.g.player.rank = 0;
  ck('no office system turns itself on at any rung of the store ladder', leaked.length === 0,
     leaked.length ? leaked.join(', ') : SYSTEMS.length + ' systems x ' + GS.rankNames().length + ' rungs, all off');

  /* and the same systems must still be ON where the office expects them, or the guard is a delete */
  const missing = [];
  o.g.player.rank = 5;                                     // office MANAGER
  ['dalePathAvailable', 'catfishAvailable', 'hrFrozen'].forEach(fn => {
    let on = false; try { on = !!OS[fn](); } catch (e) {}
    if (!on) missing.push('MANAGER:' + fn);
  });
  o.g.player.rank = 3;                                     // office SENIOR SALES
  { let on = false; try { on = !!OS.cosignActive(); } catch (e) {} if (!on) missing.push('SENIOR SALES:cosignActive'); }
  o.g.player.rank = 0;
  ck('  ^ and every one of them is still on where the OFFICE expects it', missing.length === 0,
     missing.length ? 'switched off in the office too: ' + missing.join(', ') : 'Dale, catfish, HR freeze at MANAGER; countersign at SENIOR SALES');

  /* the Dale announcement specifically: it reaches the player through the log, so drive it */
  {
    const seen = [];
    const ll = GS.logLine;
    GS.logLine = function (m) { if (/Dale/i.test(String(m))) seen.push(String(m)); return ll.apply(null, arguments); };
    g.g.player.rank = 2;
    for (let i = 0; i < 400; i++) { try { GS.tickDale(0.05); } catch (e) { break; } }
    GS.logLine = ll; g.g.player.rank = 0;
    ck('  ^ and the store is never told that Dale has noticed them', seen.length === 0,
       seen.length ? seen[0].slice(0, 80) : '400 ticks at Department Manager, not a word');
  }
}

/* ---- 5. the intro stays unreachable in grocery ------------------------------------------- */
ck('grocery never enters the day-1 office tour', !g.g.intro, 'intro=' + (!!g.g.intro));

console.log(`fiction: ${pass} pass, ${fail} fail`);
console.log(fail ? 'FICTION: RED ❌' : 'FICTION: GREEN ✅ (store words in the store, office untouched)');
process.exit(fail ? 1 : 0);
