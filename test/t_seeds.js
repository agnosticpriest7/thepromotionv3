/* PINNED ADVERSARIAL SEEDS — a seed that once caught a bug is a regression test.

   ⚠️ THIS FILE EXISTS BECAUSE DETERMINISM IS NOT COVERAGE. Seeding the suite makes a red
   reproducible, and it also means every run walks exactly ONE path through the random space
   forever: a bug reachable at some other seed becomes permanently invisible. The unseeded suite
   was, accidentally, a very slow fuzzer — and it had been finding things. t_meltdown's 6.7% flake
   was a real game bug (a meltdown approach point derived inside a wall, so the victim stalled at
   the wall for twenty seconds and the printer survived) that had been advertising itself for an
   unknown length of time.

   So determinism is bought back deliberately in two ways:
     - PROMO_SEED=vary re-enables the fuzzer on demand (and nightly, via overnight.js)
     - every seed that has ever caught something is PINNED here and runs on every gate

   ⚠️ A PINNED SEED IS NOT A "DOES THE FIX STILL WORK" TEST — t_meltdown's worstPrinterTrial
   already does that, deterministically. This asserts something the fix cannot: that the WORLD
   still produces the configuration the bug needed. If the floor is redesigned such that no victim
   is ever nearest a wall-backed printer, the regression test quietly stops testing anything, and
   the assertion below is what notices. */
'use strict';
const { createWorld } = require('./harness');

let pass = 0, fail = 0;
const ck = (n, c, d) => { console.log('  ' + (c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '   ' + d : '')); c ? pass++ : fail++; };

/* Each entry records WHAT it caught and WHEN, because a bare list of numbers rots into
   superstition — nobody dares remove a seed nobody can explain. */
const PINNED = [
  {
    seed: 20260829,
    caught: 'meltdown approach point derived inside a wall (3 of 5 printers); surfaced as a 6.7% t_meltdown flake',
    fixedIn: 'meltdown-approach-point, 2026-08-29',
  },
];

for (const P of PINNED) {
  console.log('\n--- seed ' + P.seed + ' :: ' + P.caught);
  const w = createWorld({ seed: P.seed });
  w.startNewGame(0);
  const S = w.sandbox, g = w.g, sc = g.layout.S;
  let n = 0;
  while ((g.day < 2 || g.clock < 10 * 60) && n < 120000) { w.run(300); n += 300; }

  const printers = g.layout.objects.filter(o => o.type === 'printer');
  printers.forEach(p => { p.wreckStage = 0; p.jammed = false; });
  ck('the world still has printers to melt down at', printers.length > 0, printers.length + ' printer-type props');

  /* THE CONFIGURATION THE BUG NEEDED: a printer whose south face — the old hardcoded approach —
     is NOT walkable. If no printer is like that any more, this seed has stopped reproducing the
     historical hazard and somebody should say so rather than let it pass silently. */
  const hardOnes = printers.filter(pr => !S.walkableAt(pr.x + pr.w / 2, pr.y + pr.h + Math.round(14 * sc)));
  ck('  ^ and at least one whose OLD south approach is blocked — the hazard still exists here',
     hardOnes.length > 0,
     hardOnes.length + ' of ' + printers.length + ' would have stalled a victim under the old rule');

  /* every printer must now resolve to somewhere standable */
  const unreachable = printers.filter(pr => { const ap = S.printerApproach(pr); return !(ap && S.walkableAt(ap.x, ap.y)); });
  ck('  ^ and every one of them resolves to a standable approach now',
     unreachable.length === 0,
     unreachable.length ? unreachable.length + ' unreachable' : printers.length + ' printers, all reachable');

  /* and the behaviour end to end, at this seed, against the hardest printer */
  let worst = null;
  for (const pr of printers) {
    const ap = S.printerApproach(pr);
    const out = ap ? ap.out : Infinity;
    if (!worst || out > worst.out) worst = { pr, ap, out };
  }
  const cands = g.NPCS.filter(x => x.alive && x.dept !== 'hr' && !x.boss && !x.mgr && !x.receptionist && !x.gone && x.x > 0);
  const v = cands.slice().sort((a, b) =>
    Math.hypot(a.x - worst.pr.x, a.y - worst.pr.y) - Math.hypot(b.x - worst.pr.x, b.y - worst.pr.y))[0];
  v.printerMode = true; v.printerGoal = worst.pr;
  S.startMeltEvent(v, false);
  if (S.meltEvent && worst.ap) S.meltEvent.prSpot = { x: worst.ap.x, y: worst.ap.y };
  let swings = 0, prev = null, wreck = 0, frames = 0;
  for (let i = 0; i < 4000; i++) {
    w.run(1); frames++;
    if (v.batFrame === 2 && prev !== 2) swings++;
    prev = v.batFrame;
    wreck = Math.max(wreck, ...printers.map(p => p.wreckStage || 0));
    if (!v.rampage && frames > 30) break;
  }
  ck('  ^ and a victim sent at the hardest one arrives and wrecks it',
     swings >= 5 && wreck === 3,
     v.name.split(' ')[0] + ' -> ' + (worst.ap ? worst.ap.side : 'NONE') + ', swings=' + swings + ' wreck=' + wreck);
}

console.log('\npinned seeds: ' + pass + ' pass, ' + fail + ' fail  (' + PINNED.length + ' seed(s) pinned)');
console.log(fail ? 'PINNED SEEDS: RED ❌' : 'PINNED SEEDS: GREEN ✅ (every seed that ever caught a bug still runs)');
process.exit(fail ? 1 : 0);
