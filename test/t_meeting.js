/* ============================================================================
   MEETING-MISS PENALTY — currency change (HANDOFF-3 Part C(a)).
   Missing the 10:00 meeting is slacking (the boss's domain), not wrongdoing
   (HR's). Verifies the penalty: never touches suspicion, docks promotion
   progress scaled by rank (invisible for an intern, conspicuous at AM+), and
   escalates — first miss noted, second in a run triggers the write-up.

   Usage:  node test/t_meeting.js
   ============================================================================ */
'use strict';
const { createWorld } = require('./harness');

function main() {
  const w = createWorld(); w.startNewGame(0); w.run(500, { ignoreGameOver: true });
  const S = w.sandbox, g = w.g, doc = S.document;
  let pass = 0, fail = 0;
  const ck = (n, c) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}`); c ? pass++ : fail++; };
  const punishShown = () => doc.getElementById('punish').style.display === 'flex';

  // INTERN — absence is invisible
  g.player.rank = 0; g.player.prog = 50; g.player.suspicion = 20; g.career.meetingMisses = 0;
  let s0 = g.player.suspicion, p0 = g.player.prog;
  S.missMeeting();
  ck('INTERN: suspicion unchanged', g.player.suspicion === s0);
  ck('INTERN: progress unchanged (invisible)', g.player.prog === p0);
  ck('INTERN: no write-up', !punishShown());
  ck('INTERN: no miss counted', (g.career.meetingMisses || 0) === 0);

  // SALES — first miss: progress docked, no suspicion
  g.player.rank = 2; g.player.prog = 50; g.player.suspicion = 20; g.career.meetingMisses = 0;
  s0 = g.player.suspicion;
  S.missMeeting();
  ck('SALES: suspicion unchanged (off HR channel)', g.player.suspicion === s0);
  ck('SALES: progress docked -3', g.player.prog === 47);
  ck('SALES: miss counted (1)', g.career.meetingMisses === 1);
  ck('SALES: first miss = no write-up', !punishShown());

  // ASSISTANT MANAGER — bigger dock, then escalate on the second miss
  g.player.rank = 4; g.player.prog = 60; g.player.suspicion = 15; g.career.meetingMisses = 0;
  s0 = g.player.suspicion;
  S.missMeeting();
  ck('AM: progress docked -9 (rank-scaled)', g.player.prog === 51);
  ck('AM: suspicion still unchanged', g.player.suspicion === s0);
  ck('AM: first miss = no write-up yet', !punishShown());
  ck('AM: miss counted (1)', g.career.meetingMisses === 1);
  S.missMeeting();
  ck('AM: second miss triggers write-up (discipline)', punishShown());
  ck('AM: second miss did NOT add suspicion', g.player.suspicion === s0);
  ck('AM: two-strike clock reset after write-up', g.career.meetingMisses === 0);

  console.log(`\nMEETING PENALTY: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
  process.exit(fail === 0 ? 0 : 1);
}
main();
