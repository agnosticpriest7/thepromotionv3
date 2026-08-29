/* GATE ROTATION — the pre-merge test suite. `node test/gate.js` runs every test as its own child
   process and reports pass/fail; a non-zero exit means do not merge.

   ⚠️ RUNS IN PARALLEL, LONGEST FIRST. The rotation was ~64 minutes sequentially, which is the
   largest single tax on this project — every branch pays it, and a gate nobody wants to sit
   through is a gate that gets skipped. That is how t_printer stayed RED for weeks.

   SAFE BECAUSE THE TESTS SHARE NOTHING, and that was AUDITED rather than assumed:
     - no test writes ANY file (no writeFileSync / mkdirSync / unlinkSync anywhere under test/)
     - no test binds a port or spawns a process (the only `exec(` in harness.js is a regex)
     - index.html is opened READ-ONLY by the five tests that read it, and by the harness
     - localStorage is a fresh in-memory Map per createWorld() call, not a shared stub
     - no fixed temp paths; every test resolves from __dirname
   A test that breaks any of those must not be added without being given a per-worker resource.

   ⚠️ SCHEDULE LONGEST FIRST OR THE POOL BUYS LITTLE. t_lights and t_rank_leaks are ~17 minutes
   between them; started last they become a tail everything else waits behind, and the run can
   finish no sooner than the longest job plus whatever is queued behind it.

   `GATE_SEQUENTIAL=1 node test/gate.js` keeps the old one-at-a-time order, permanently, so a
   suspicious result can always be re-run in the order it used to run in.
   `GATE_POOL=n` overrides the worker count.

   ⚠️ A RED HERE IS A REGRESSION. TREAT IT AS ONE. This paragraph used to say the opposite, and
   it was right at the time: 20+ tests called createWorld() with NO seed, so every run built a
   different cast and different routes, and a lone red really could be the dice. That premise died
   when the harness was seeded (test-seeding, 2026-08-29). The old text outlived it by one branch
   and is the more dangerous half of the pair -- a standing excuse to disbelieve a red is exactly
   how t_printer sat broken for weeks.

   What was measured before rewriting this:
     - two full gate runs at the same seed differed ONLY in timing and in the order tests
       completed. Every pass/fail count identical, 61/61 green, across two different pool
       interleavings.
     - the whole suite across 6 varying seeds (366 runs): zero failures.
     - t_meltdown, t_seeds and placement across 20 varying seeds (60 runs): zero failures.

   So: a red reproduces. The seed is printed once per process ([seed NNNNN]) -- re-run that test
   with PROMO_SEED set to it and you will get the same result. Do NOT re-run hoping for green.

   What is NOT proved, so that nobody reads more into the above than it earned: 20 clean
   t_meltdown runs do not by themselves establish the approach-point fix, since a 6.7% failure
   rate survives 20 trials about a quarter of the time. The deterministic proof is
   worstPrinterTrial inside t_meltdown, which sends a victim at the hardest printer on every run,
   plus the pinned seed in t_seeds. Nor has parallel-vs-sequential been compared end to end; the
   two runs above were both parallel, and GATE_SEQUENTIAL=1 remains the way to check.

   Coverage is bought back on purpose, since seeding costs it: PROMO_SEED=vary re-enables the
   fuzzing, and test/seedsweep.js walks many seeds and reports a per-test failure rate. Anything
   it finds is DEFECT UNTIL DIAGNOSED -- the last flake it would have caught was a real game bug. */
const { execFile } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

/* Deliberately not run, with a reason. Empty is the healthy state — this exists so leaving a test
   out is a decision somebody wrote down, not an oversight. */
const SKIP = {
  // 't_something.js': 'why it is not in the rotation',
};

const TESTS = [
  'placement.js',
  't_delegate.js',
  't_deleg_legibility.js', // delegation jobs name which personality they suit (tray + assign menu)
  't_dale_delegate.js',   // Dale-arc vs delegation-gate collision (documents current behaviour)
  't_loyalty_ceo.js',     // loyalty route driven end-to-end through the real arc -> CEO win lands
  't_npc_leaving.js',     // the NPC-leaves investment sweep + gate invariant
  't_asst_desk.js',
  't_intern_desk.js',     // Intern->Junior actually relocates the player out of the nook
  't_promote.js',
  't_hire.js',
  't_manager_fire.js',
  't_demote.js',          // manager Demote verb + promote-menu candidate/requirement clarity
  't_manager_seat.js',    // Manager is not counted as a senior chair (no phantom demotion / 4-3 panel)
  't_hr_freeze.js',       // Manager: no auto hire/promote/backfill — every headcount move is yours
  't_hiring_depth.js',    // candidate slate: vet/ask/vouch, feud teeth, unprofiled arrival (v3 saved state)
  't_legibility.js',
  't_health_rebalance.js', // health measures how the floor RUNS (stress/feuds/desks/mistakes); friendship is leverage
  't_merit.js',
  't_night_decay.js',     // player suspicion + stress halve at the day rollover (don't carry over in full)
  't_rumor_supply.js',
  't_ally_cover.js',      // allies announce when they look away during wrongdoing (once per person)
  't_favor_track.js',     // per-person favour track: accumulate → owe a one-time verb (alibi/dirt/machine/tipoff/clean-deleg); anti-farming; save; npcLeaving
  't_fetch_mission.js',   // coworker fetch/friendship missions deliver (live inventory re-check)
  't_music.js',
  't_test_game.js',       // dev Test Game: jumpToRank places a consistent world at any rank

  /* --- added 2026-07-28: these 11 existed but NOTHING RAN THEM -------------------------------
     t_printer sat RED for weeks and nobody noticed, because it was not in this list. It was not
     even a real failure — it hardcoded a printer position that had moved three times. A test no
     rotation runs is not a safety net, it is a file. Everything under test/ now runs here. */
  't_windows.js',         // every window pane is set into a perimeter wall (catches double-scaling)
  't_printer.js',         // nearestPrinter really returns the nearest, checked by brute force
  't_meltdown.js',        // victim reaches the printer and swings deliberately  (slow, ~280s)
  't_ceo.js',             // Sterling lives in his office, laps once, comes home
  't_meeting.js',         // meeting attendance penalty
  't_grace.js',           // meeting grace period
  't_arrivals.js',        // workers trickle in over the morning, all present by 8:25
  't_paths.js',           // paths panel
  't_leverage.js',        // leverage legibility
  't_rumor_carrier.js',   // rumour carrier + gossip menu
  't_intro_face.js',      // player always faces the way it walks

  't_menu_load.js',
  't_intro_axis.js',      // intro walk is cardinal-only — no diagonal art exists
  't_hud_column.js',      // right-hand HUD column: one owner, nothing overlaps, in every phase
  't_fiction.js',         // level vocabulary: store words in the store, office byte-identical
  't_grocery_tasks.js',   // a bagger's day completes through the REAL interaction menu
  't_grocery.js',
  't_grocery_soak.js',    // 5 in-game days in a NON-office world; asserts the cycle ran, not just that it survived
  't_grocery_crew.js',    // Save-Rite's six staff: a station is a desk that isn't drawn
  't_grocery_ladder.js',  // Save-Rite's own six rungs + the irreversible department branch
  't_grocery_unseat.js',  // three roads to one Department Manager's chair, one resolution
  't_grocery_flavour.js', // per-department task words + what the crew say; words only, no mechanics
  't_grocery_upper.js',   // rungs 4-6: out-manage, settle the debt, Merv sells
  't_grocery_endgame.js', // the sign reads MERV'S until it reads yours
  't_grocery_customers.js',// ambient shoppers: churn, and they are nobody
  't_grocery_deleg.js',   // the store's own delegation: who, and in what words
  't_sightlines.js',      // PROTOTYPE: being seen costs more; off by default
  't_rank_leaks.js',      // office content gated on a rank NUMBER, in a store that renames it
  't_shelf_art.js',       // the grocery aisle runs: six runs, five faces, aisles still walk
  't_lights.js',          // the store comes up at 8:15; the flick order is derived, not listed
  't_props.js',           // the store's own fixtures, and the re-laid north-south checkouts
  't_seeds.js',           // seeds that once caught a bug -- a regression test each         // the loadLevel seam, proved with one empty room; office default unchanged
  't_countersign.js',     // Senior Sales countersign: rank gate, tier-derived pool, the 2x2, no suspicion
  't_moonwalk.js',        // nobody travels backwards; seatless meeting attendees get their own spot
  't_errandspace.js',     // errand/desk-visit dispatch never sends two people to one square
  't_regress.js',         // slow soak — last
];

/* ---- ROOT CAUSE GUARD ----------------------------------------------------------------------
   t_printer went stale and stayed RED because it was simply absent from TESTS, and nothing ever
   said so. Adding a test file was enough to create a test; nothing made it RUN. So: every
   t_*.js / placement.js on disk must be listed here or SKIPped with a reason. Fails loudly. */
const onDisk = fs.readdirSync(__dirname).filter(f => /^t_.*\.js$/.test(f) || f === 'placement.js');
const unlisted = onDisk.filter(f => !TESTS.includes(f) && !(f in SKIP));
const ghosts   = TESTS.filter(f => !onDisk.includes(f));
if (unlisted.length || ghosts.length) {
  if (unlisted.length) {
    console.log('GATE: RED ❌ — test files on disk that no rotation runs:');
    unlisted.forEach(f => console.log(`   - ${f}   (add it to TESTS, or to SKIP with a reason)`));
  }
  if (ghosts.length) {
    console.log('GATE: RED ❌ — TESTS names a file that does not exist:');
    ghosts.forEach(f => console.log(`   - ${f}`));
  }
  process.exit(1);
}
Object.entries(SKIP).forEach(([f, why]) => console.log(`-- ${f.padEnd(22)} SKIPPED — ${why}`));

/* Measured wall times, used ONLY to decide what starts first. A test missing from here is not an
   error — it gets a middling estimate and is scheduled among the mid-length jobs. Being wrong here
   costs a little scheduling efficiency and nothing else, which is why it is not asserted anywhere. */
const KNOWN_SECS = {
  't_lights.js': 521, 't_rank_leaks.js': 509, 't_meltdown.js': 310, 't_hud_column.js': 273,
  't_delegate.js': 230, 't_grocery_unseat.js': 190, 't_hire.js': 187, 't_grocery_customers.js': 178,
  't_regress.js': 160, 't_menu_load.js': 97, 't_grocery_upper.js': 92, 't_grocery_ladder.js': 90,
  't_grocery_flavour.js': 89, 't_grocery_soak.js': 85, 't_ceo.js': 79, 't_sightlines.js': 67,
  't_grocery_crew.js': 48, 't_grocery_endgame.js': 46, 't_arrivals.js': 45, 't_grocery_deleg.js': 37,
  't_test_game.js': 28, 't_grocery.js': 23, 't_grocery_tasks.js': 20, 't_fiction.js': 16,
  't_grace.js': 14, 't_fetch_mission.js': 11, 'placement.js': 8,
};
const DEFAULT_SECS = 30;
const estOf = t => (t in KNOWN_SECS ? KNOWN_SECS[t] : DEFAULT_SECS);

const SEQUENTIAL = !!process.env.GATE_SEQUENTIAL;
const CORES = os.cpus().length;
/* ⚠️ 8, NOT cores-2, AND THE REASON IS MEASURED. Wall time here is bounded by the LONGEST TEST,
   not by packing: past ~8 workers there is no packing left to win (64 min of test time over 8 is
   8.1 min, already under t_lights' 8.7), so every extra worker only makes t_lights slower by
   contending with it. Measured on 16 cores, 60 tests:
       pool 14 -> 13.0 min wall, 116.1 min of test time, t_lights 780s
       pool  8 -> 12.6 min wall,  86.5 min of test time, t_lights 675s
   Same wall time, a quarter less machine load, and the box stays usable while it runs. */
const POOL = SEQUENTIAL ? 1
  : Math.max(1, Math.min(parseInt(process.env.GATE_POOL, 10) || Math.max(2, Math.min(8, CORES - 2)), TESTS.length));

/* the ONE line each test contributes, picked exactly as the sequential runner picked it */
const summarise = out =>
  (out.trim().split('\n').filter(l => /GREEN|RESULT:|PLACEMENT:|pass,|documented/.test(l)).pop() || 'ok').trim();

const runOne = (t) => new Promise(resolve => {
  const started = Date.now();
  execFile('node', [path.join(__dirname, t)], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    (err, stdout, stderr) => {
      resolve({
        t, secs: (Date.now() - started) / 1000, ok: !err,
        line: err ? 'FAILED ❌' : summarise(stdout || ''),
        /* ⚠️ A POOL THAT LOSES A FAILURE IS WORSE THAN NO POOL — keep the child's own output so a
           red test reports the same tail it reported when it ran alone. */
        tail: err ? ((stdout || '') + (stderr || '')).trim().split('\n').slice(-8) : null,
      });
    });
});

async function main() {
  const failed = [];
  const times = [];
  const t0 = Date.now();
  console.log(SEQUENTIAL
    ? '-- running SEQUENTIALLY (GATE_SEQUENTIAL=1)'
    : `-- ${TESTS.length} tests, pool of ${POOL} on ${CORES} cores, longest first`);

  /* longest first; ties keep the canonical order so the schedule is deterministic */
  const queue = SEQUENTIAL ? TESTS.slice()
    : TESTS.slice().sort((a, b) => estOf(b) - estOf(a) || TESTS.indexOf(a) - TESTS.indexOf(b));

  const results = new Map();
  let next = 0, done = 0;
  await Promise.all(Array.from({ length: POOL }, async () => {
    while (next < queue.length) {
      const t = queue[next++];
      const r = await runOne(t);
      results.set(t, r);
      done++;
      process.stdout.write(`   [${String(done).padStart(2)}/${queue.length}] ${r.ok ? 'ok  ' : 'FAIL'} ${t}\n`);
    }
  }));

  /* ⚠️ REPORT IN THE CANONICAL ORDER, NOT COMPLETION ORDER, so a parallel run's output can be
     diffed test-for-test against a sequential one. */
  console.log('');
  for (const t of TESTS) {
    const r = results.get(t);
    times.push([t, r.secs]);
    if (!r.ok) failed.push(t);
    console.log(`-- ${t.padEnd(22)} ${String(r.secs.toFixed(0)).padStart(4)}s  ${r.line}`);
    if (r.tail) console.log(r.tail.map(l => '   ' + l).join('\n'));
  }
  report(times, failed, t0);
}
/* Report the slowest few. A gate nobody wants to sit through is a gate that gets skipped, and a
   skipped gate is how t_printer stayed RED — so keep the cost visible rather than letting it drift. */
function report(times, failed, t0) {
  const slow = times.slice().sort((a, b) => b[1] - a[1]).slice(0, 5);
  const wall = (Date.now() - t0) / 1000 / 60;
  const cpu = times.reduce((acc, [, v]) => acc + v, 0) / 60;
  console.log(`\ntotal ${wall.toFixed(1)} min wall over ${TESTS.length} tests`
            + (SEQUENTIAL ? '' : `  (${cpu.toFixed(1)} min of test time across ${POOL} workers)`)
            + `  |  slowest: ${slow.map(([n, sec]) => `${n.replace(/\.js$/, '')} ${sec.toFixed(0)}s`).join(', ')}`);
  console.log(failed.length ? `\nGATE: RED ❌ — ${failed.join(', ')}` : `\nGATE: GREEN ✅ (all ${TESTS.length} passed)`);
  process.exit(failed.length ? 1 : 0);
}
main();
