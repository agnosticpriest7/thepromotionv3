/* ============================================================================
   PATHS PANEL — legibility check (HANDOFF-3 Part C(b)).
   Drives renderPaths() across game states and asserts the panel reads straight
   from the real gates: locks match catfishAvailable()/rank, CEO-open matches
   career.meritReady||vpFavor>=1, and progress counts match the state.
   It is read-only display — this just proves it can't disagree with the gates.

   Usage:  node test/t_paths.js
   ============================================================================ */
'use strict';
const { createWorld } = require('./harness');

function main() {
  const w = createWorld(); w.startNewGame(0); w.run(1000, { ignoreGameOver: true });
  const S = w.sandbox, g = w.g, doc = S.document;
  let pass = 0, fail = 0;
  const ck = (n, c) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}`); c ? pass++ : fail++; };
  const html = () => { S.renderPaths(); return doc.getElementById('pathsBody').innerHTML; };

  // Case A: fresh INTERN
  g.player.rank = 0; g.career.meritReady = false; g.career.vpFavor = 0;
  let h = html();
  ck('renders all three paths + header', /MERIT/.test(h) && /LOYALTY/.test(h) && /LEVERAGE/.test(h) && /THE WAY UP/.test(h));
  ck('merit locked when not manager', /Locked until MANAGER/.test(h));
  ck('catfish MANAGER-GATED shown', /MANAGER-GATED/.test(h));
  ck('loyalty beat 0/16', /0\/16/.test(h));
  ck('CEO gate closed matches state', /None finished yet/.test(h) === !(g.career.meritReady || g.career.vpFavor >= 1));

  // Case B: MANAGER, mid-progress
  g.player.rank = 5; g.catfish.emailsSent = 2; g.catfish.needed = 3; g.dale.step = 13; g.dale.titled = true; g.dale.favor = 80;
  h = html();
  ck('lock matches catfishAvailable()', (!/MANAGER-GATED/.test(h)) === S.catfishAvailable());
  ck('catfish shows 2/3 machines', /2\/3/.test(h));
  ck('merit unlocked as manager', !/Locked until MANAGER/.test(h));
  ck('loyalty beat 13/16 + fake title', /13\/16/.test(h) && /fake title granted/.test(h));

  // Case C: a path becomes ready
  g.career.meritReady = true;
  h = html();
  ck('CEO gate OPEN matches meritReady', /A path is OPEN/.test(h) === (g.career.meritReady || g.career.vpFavor >= 1));
  ck('merit shows READY', /READY/.test(h));

  // Case D: catfish leaked
  g.career.meritReady = false; g.catfish.leaked = true;
  h = html();
  ck('catfish leaked -> confront prompt', /Confront Sterling/.test(h));

  console.log(`\nPATHS PANEL: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
  process.exit(fail === 0 ? 0 : 1);
}
main();
