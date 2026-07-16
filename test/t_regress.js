/* ============================================================================
   BASELINE SOAK — 150k frames (~5 in-game days).
   Pass criteria (HANDOFF-2/4): 0 throws, 0 non-finite, 0 renderErrs,
   0 stuck NPCs, and ranks/seats/desks in agreement (0 seat violations).

   Usage:  node test/t_regress.js [frames]
   ============================================================================ */
'use strict';
const { createWorld } = require('./harness');

const FRAMES = parseInt(process.argv[2], 10) || 150000;

function main() {
  const t0 = Date.now();
  const w = createWorld();
  w.startNewGame(0);

  const s = w.run(FRAMES, {
    onDay: (day) => { process.stdout.write(`  … day ${day} reached (frame ${w.frame})\n`); },
  });

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const clean =
    s.throws === 0 && s.nonFinite === 0 && s.nonFiniteEntities === 0 &&
    s.stuckNPCs === 0 && s.seatViolations === 0 && !s.endedEarly;

  console.log('\n================ BASELINE SOAK RESULT ================');
  console.log(`frames driven      : ${s.frames} (${secs}s)`);
  console.log(`in-game days        : ${s.daysElapsed}`);
  console.log(`throws              : ${s.throws}${s.firstThrow ? '\n   first: ' + oneLine(s.firstThrow) : ''}`);
  console.log(`non-finite (canvas) : ${s.nonFinite}${s.firstNonFinite ? '\n   first: ' + s.firstNonFinite : ''}`);
  console.log(`non-finite (entity) : ${s.nonFiniteEntities}${s.firstNonFiniteEntity ? '\n   first: ' + s.firstNonFiniteEntity : ''}`);
  console.log(`stuck NPCs          : ${s.stuckNPCs}${s.stuckNames ? '\n   ' + s.stuckNames.join(', ') : ''}`);
  console.log(`seat/desk/rank viol : ${s.seatViolations}${s.firstSeatViolation ? '\n   first: ' + s.firstSeatViolation : ''}`);
  console.log(`ended early         : ${s.endedEarly ? 'YES — ' + s.endReason : 'no'}`);
  console.log('------------------------------------------------------');
  console.log(clean ? 'RESULT: GREEN ✅  (baseline is clean)' : 'RESULT: RED ❌  (see above)');
  console.log('======================================================');

  process.exit(clean ? 0 : 1);
}

function oneLine(s) { return String(s).split('\n').slice(0, 3).join(' | '); }

main();
