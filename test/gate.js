/* GATE ROTATION — the pre-merge test suite. `node test/gate.js` runs each test as a child process
   and reports pass/fail; a non-zero exit means do not merge. t_regress (the 150k soak) runs last. */
const { execSync } = require('child_process');
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
  't_grocery_upper.js',   // rungs 4-6: out-manage, settle the debt, Merv sells         // the loadLevel seam, proved with one empty room; office default unchanged
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

const failed = [];
const times = [];
const t0 = Date.now();
for (const t of TESTS) {
  process.stdout.write(`-- ${t.padEnd(22)} `);
  const started = Date.now();
  try {
    const out = execSync(`node "${path.join(__dirname, t)}"`, { encoding: 'utf8' });
    const secs = (Date.now() - started) / 1000;
    times.push([t, secs]);
    const line = out.trim().split('\n').filter(l => /GREEN|RESULT:|PLACEMENT:|pass,|documented/.test(l)).pop() || 'ok';
    console.log(`${String(secs.toFixed(0)).padStart(4)}s  ${line.trim()}`);
  } catch (e) {
    const secs = (Date.now() - started) / 1000;
    times.push([t, secs]);
    failed.push(t);
    console.log(`${String(secs.toFixed(0)).padStart(4)}s  FAILED ❌`);
    console.log(((e.stdout || '') + (e.stderr || '')).trim().split('\n').slice(-8).map(l => '   ' + l).join('\n'));
  }
}
/* Report the slowest few. A gate nobody wants to sit through is a gate that gets skipped, and a
   skipped gate is how t_printer stayed RED — so keep the cost visible rather than letting it drift. */
const slow = times.slice().sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log(`\ntotal ${((Date.now() - t0) / 1000 / 60).toFixed(1)} min over ${TESTS.length} tests`
          + `  |  slowest: ${slow.map(([n, s]) => `${n.replace(/\.js$/, '')} ${s.toFixed(0)}s`).join(', ')}`);
console.log(failed.length ? `\nGATE: RED ❌ — ${failed.join(', ')}` : `\nGATE: GREEN ✅ (all ${TESTS.length} passed)`);
process.exit(failed.length ? 1 : 0);
