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
  const badLen = [], badVia = [];
  for (let r = 0; r <= 5; r++) {
    const ov = OS.taskPoolVias(r), gv = GS.taskPoolVias(r);
    if (ov.length !== gv.length) badLen.push('rank' + r + ': ' + ov.length + ' vs ' + gv.length);
    if (JSON.stringify(ov) !== JSON.stringify(gv)) badVia.push('rank' + r);
  }
  ck('every rank offers the same NUMBER of tasks in both levels', badLen.length === 0,
     badLen.length ? badLen.join(', ') : 'ranks 0-5 match');
  ck('  ^ and the same trigger kinds, in the same order', badVia.length === 0,
     badVia.length ? 'differ at ' + badVia.join(', ') : 'via lists identical');
}
ck('the same number of tasks is rolled in both levels',
   OS.taskLabels().length === GS.taskLabels().length,
   OS.taskLabels().length + ' vs ' + GS.taskLabels().length);

/* ---- 5. the intro stays unreachable in grocery ------------------------------------------- */
ck('grocery never enters the day-1 office tour', !g.g.intro, 'intro=' + (!!g.g.intro));

console.log(`fiction: ${pass} pass, ${fail} fail`);
console.log(fail ? 'FICTION: RED ❌' : 'FICTION: GREEN ✅ (store words in the store, office untouched)');
process.exit(fail ? 1 : 0);
