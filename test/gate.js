/* GATE ROTATION — the pre-merge test suite. `node test/gate.js` runs each test as a child process
   and reports pass/fail; a non-zero exit means do not merge. t_regress (the 150k soak) runs last. */
const { execSync } = require('child_process');
const path = require('path');

const TESTS = [
  'placement.js',
  't_delegate.js',
  't_dale_delegate.js',   // Dale-arc vs delegation-gate collision (documents current behaviour)
  't_loyalty_ceo.js',     // loyalty route driven end-to-end through the real arc -> CEO win lands
  't_npc_leaving.js',     // the NPC-leaves investment sweep + gate invariant
  't_asst_desk.js',
  't_promote.js',
  't_hire.js',
  't_manager_fire.js',
  't_legibility.js',
  't_merit.js',
  't_rumor_supply.js',
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
