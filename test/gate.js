/* GATE ROTATION — the pre-merge test suite. `node test/gate.js` runs each test as a child process
   and reports pass/fail; a non-zero exit means do not merge. t_regress (the 150k soak) runs last. */
const { execSync } = require('child_process');
const path = require('path');

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
  't_legibility.js',
  't_health_rebalance.js', // health measures how the floor RUNS (stress/feuds/desks/mistakes); friendship is leverage
  't_merit.js',
  't_night_decay.js',     // player suspicion + stress halve at the day rollover (don't carry over in full)
  't_rumor_supply.js',
  't_fetch_mission.js',   // coworker fetch/friendship missions deliver (live inventory re-check)
  't_music.js',
  't_menu_load.js',
  't_regress.js',         // slow soak — last
];

const failed = [];
for (const t of TESTS) {
  process.stdout.write(`-- ${t.padEnd(20)} `);
  try {
    const out = execSync(`node "${path.join(__dirname, t)}"`, { encoding: 'utf8' });
    const line = out.trim().split('\n').filter(l => /GREEN|RESULT:|PLACEMENT:|pass,|documented/.test(l)).pop() || 'ok';
    console.log(line.trim());
  } catch (e) {
    failed.push(t);
    console.log('FAILED ❌');
    console.log(((e.stdout || '') + (e.stderr || '')).trim().split('\n').slice(-8).map(l => '   ' + l).join('\n'));
  }
}
console.log(failed.length ? `\nGATE: RED ❌ — ${failed.join(', ')}` : `\nGATE: GREEN ✅ (all ${TESTS.length} passed)`);
process.exit(failed.length ? 1 : 0);
