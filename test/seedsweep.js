/* VARYING-SEED SWEEP — the deliberate version of the accidental fuzzer.
   Not part of the gate. Run it on demand or nightly:

       node test/seedsweep.js 50            50 seeds, whole suite
       node test/seedsweep.js 20 t_meltdown.js t_hud_column.js    just those

   ⚠️ WHAT THIS IS FOR. Seeding the suite makes reds reproducible and costs coverage: every gate
   run now walks one path through the random space. This walks many, on purpose, and reports a
   PER-TEST failure rate. A test that fails at 3 seeds in 50 is not noise to be re-run away — it
   is a test whose input space contains something. t_meltdown's 6.7% was a real game bug hiding
   behind a flake for an unknown length of time, so the working assumption for anything this
   finds is DEFECT UNTIL DIAGNOSED, not flake.

   Exit code is 0 always: this is an instrument, not a gate. Read the table. */
'use strict';
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const N = parseInt(process.argv[2] || '50', 10);
const only = process.argv.slice(3);
const TESTS = only.length ? only
  : fs.readdirSync(__dirname).filter(f => /^t_.*\.js$/.test(f) || f === 'placement.js')
      .filter(f => f !== 't_seeds.js');          // pinned seeds are fixed by definition

/* SWEEP_POOL overrides. The default matches the gate's 8, but a fifty-seed pass over the whole
   suite is ~72 CPU-hours and the cap is what decides whether that is six hours or a day. The
   tests share nothing (audited in gate.js), so the only real limit is leaving the machine
   usable -- this is somebody's desktop, not a build box. */
const POOL = Math.max(2, parseInt(process.env.SWEEP_POOL, 10) || Math.min(8, os.cpus().length - 2));
const seeds = Array.from({ length: N }, (_, i) => 1000 + i * 7919);

const runOne = (test, seed) => new Promise(resolve => {
  execFile('node', [path.join(__dirname, test)],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, env: Object.assign({}, process.env, { PROMO_SEED: String(seed) }) },
    (err, stdout, stderr) => resolve({
      test, seed, ok: !err, out: stdout || '',
      /* the child's own last meaningful line, so a failure can be read without re-running it */
      why: err ? ((stdout || '').trim().split('\n').filter(l => /FAIL|RED|Error|throw/i.test(l)).slice(-1)[0]
                 || (stderr || '').trim().split('\n').slice(-1)[0] || 'exit ' + (err.code)) : '',
    }));
});

/* ⚠️ PREFLIGHT: WHICH TESTS DOES PROMO_SEED ACTUALLY REACH?
   A sweep that reports "every test passed at all 50 seeds" is worthless for a test the seed never
   touched, and 24 of the 61 pin their own seed in the createWorld() call -- they were written that
   way to be deterministic BEFORE the harness was seeded, and the pin now opts them out of fuzzing
   permanently. Reporting 0% for those is the same vacuity that let a station sit inside a desk
   through a green assertion for months: a number about a thing that was never exercised.
   Detected by BEHAVIOUR, not by scanning source for `seed:` -- run each test at two different
   seeds and see whether its output actually changes. A test that pins some worlds and not others
   still counts as varied, which is correct: part of its space is being walked. */
async function preflight(tests) {
  const varied = [], fixed = [];
  await Promise.all(Array.from({ length: POOL }, async () => {
    let i;
    while ((i = preflight._n++) < tests.length) {
      const t = tests[i];
      const [a, b] = await Promise.all([runOne(t, 111111), runOne(t, 999999)]);
      (a.out === b.out ? fixed : varied).push(t);
    }
  }));
  return { varied, fixed };
}
preflight._n = 0;

(async () => {
  const jobs = [];
  for (const t of TESTS) for (const s of seeds) jobs.push({ t, s });
  console.log('varying-seed sweep: ' + TESTS.length + ' tests x ' + N + ' seeds = ' + jobs.length +
              ' runs, pool ' + POOL);
  console.log('preflight: checking which tests PROMO_SEED actually reaches...');
  const pf = await preflight(TESTS);
  if (pf.fixed.length) {
    console.log('  ⚠️ ' + pf.fixed.length + ' of ' + TESTS.length + ' tests produce IDENTICAL output at two ' +
                'different seeds. The sweep cannot vary them; a 0% rate below says nothing about them:');
    console.log('     ' + pf.fixed.sort().join(' '));
  }
  console.log('  genuinely swept: ' + pf.varied.length + ' of ' + TESTS.length);
  const fails = new Map();       // test -> [{seed, why}]
  let next = 0, done = 0;
  await Promise.all(Array.from({ length: POOL }, async () => {
    while (next < jobs.length) {
      const j = jobs[next++];
      const r = await runOne(j.t, j.s);
      done++;
      if (!r.ok) {
        if (!fails.has(r.test)) fails.set(r.test, []);
        fails.get(r.test).push({ seed: r.seed, why: r.why });
        console.log('  FAIL ' + r.test + ' @seed ' + r.seed + '   ' + String(r.why).slice(0, 110));
      }
      if (done % 50 === 0) console.log('  ...' + done + '/' + jobs.length + '  failing tests so far: ' + fails.size);
    }
  }));

  console.log('\n================ PER-TEST FAILURE RATE ================');
  if (!fails.size) {
    console.log('  every test passed at all ' + N + ' seeds' +
      (pf.fixed.length ? ' -- but only ' + pf.varied.length + ' of ' + TESTS.length +
                         ' were actually varied by the seed (see the preflight above).' : '.'));
  } else {
    /* ordered by how likely each is to be a real defect: a HIGHER rate is easier to diagnose,
       but a LOW steady rate is the shape t_meltdown had -- so report both and sort by count. */
    [...fails.entries()].sort((a, b) => b[1].length - a[1].length).forEach(([t, list]) => {
      console.log('  ' + t.padEnd(24) + String(list.length).padStart(3) + '/' + N +
                  '  (' + (list.length / N * 100).toFixed(1) + '%)   seeds: ' +
                  list.slice(0, 6).map(f => f.seed).join(', ') + (list.length > 6 ? ' …' : ''));
      console.log('      first failure: ' + String(list[0].why).slice(0, 140));
    });
    console.log('\n  ⚠️ Treat each as a DEFECT until diagnosed. Pin any seed that turns out to');
    console.log('     have caught something into t_seeds.js.');
  }
})();
