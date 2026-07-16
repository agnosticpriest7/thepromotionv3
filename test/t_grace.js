/* ============================================================================
   POST-MEETING/BREAK GRACE — regression guard.
   Bug: when the Meeting (or a break) ended, Dale wrote people up for being
   "away from their desk" while they were still walking back. Fix: set the same
   grace window used after a fire drill on the gather->work transition, and reset
   everyone's seenT. This confirms no "away from desk" warning fires during the
   walk-back window after the meeting.

   Usage:  node test/t_grace.js
   ============================================================================ */
'use strict';
const { createWorld } = require('./harness');

function main() {
  const w = createWorld(); w.startNewGame(0);
  const S = w.sandbox, g = w.g;
  const warns = [];
  const orig = S.logLine;
  S.logLine = function (msg) { if (typeof msg === 'string' && /away from their desk/.test(msg)) warns.push({ frame: w.frame }); return orig.apply(this, arguments); };

  let prev = null, transitionFrame = null, seenTatTransition = [];
  for (let i = 0; i < 20000 && transitionFrame === null; i += 20) {
    w.run(20, { ignoreGameOver: true });
    const ph = S.currentPhase().name;
    if (prev === 'Meeting' && ph !== 'Meeting') {
      transitionFrame = w.frame;
      seenTatTransition = (g.NPCS || []).filter(n => n.alive).map(n => n.seenT || 0);
    }
    prev = ph;
  }

  let pass = 0, fail = 0;
  const ck = (n, c) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}`); c ? pass++ : fail++; };
  ck('reached the Meeting -> Work transition', transitionFrame !== null);
  if (transitionFrame) {
    ck('all NPC seenT reset at transition (<=0)', Math.max(0, ...seenTatTransition) <= 0);
    w.run(1000, { ignoreGameOver: true });   // ~16s of walk-back
    const inWindow = warns.filter(x => x.frame >= transitionFrame && x.frame <= transitionFrame + 960);
    ck('NO "away from desk" warnings during walk-back grace', inWindow.length === 0);
  }
  console.log(`\nMEETING GRACE: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
  process.exit(fail === 0 ? 0 : 1);
}
main();
