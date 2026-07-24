/* Rank-based soundtrack (branch: rank-music) + the "now playing" name formatter. One playlist per
   rank; all seven ranks (INTERN..CEO) now have their own music. tracksForRank falls back to the
   nearest lower populated rank (moot now, but the CLAMP for an out-of-range rank is tested), and
   syncMusicToRank swaps the set on promotion without restarting an unchanged one. Audio + the
   on-screen banner are TV reads (harness stubs Audio/DOM). */
const { createWorld } = require('./harness');
const w = createWorld(); w.startNewGame(0);
const S = w.sandbox;
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };

// every rank resolves to its own set
const REP = [
  [0, 'INTERN', 'Fluorescent_Hours'],
  [1, 'JUNIOR SALES', 'Promising_Lead'],
  [2, 'SALES', 'Terms_Accepted'],
  [3, 'SENIOR SALES', 'Top_Performer'],
  [4, 'ASSISTANT MANAGER', 'Acting_Authority'],
  [5, 'MANAGER', 'Operational_Control'],
  [6, 'CEO', 'Per_My_Last_Layoff'],
];
for (const [r, name, track] of REP) {
  const t = S.tracksForRank(r);
  ck(`rank ${r} (${name}) → its own set (incl. ${track})`, t.rank === r && t.names.length >= 1 && t.names.includes(track), t.names.join(','));
}
// an out-of-range rank clamps to the top populated rank (CEO)
ck('rank 9 (out of range) clamps to CEO (rank 6)', S.tracksForRank(9).rank === 6);

// starts on the intern set, and each promotion switches the set forward
ck('starts on the intern set', S.musicState().rank === 0);
for (let r = 1; r <= 6; r++) {
  S.syncMusicToRank(r);
  ck(`promote → rank ${r} switches its set`, S.musicState().rank === r && S.musicState().names.includes(REP[r][2]));
}
// back to INTERN switches back
S.syncMusicToRank(0);
ck('back to INTERN loads the intern set', S.musicState().rank === 0 && S.musicState().names.includes('Fluorescent_Hours'));

// the "now playing" banner formats the file base-name for display
ck('prettyTrack: underscores → spaces', S.prettyTrack('Per_My_Last_Layoff') === 'Per My Last Layoff' && S.prettyTrack('Top_Performer') === 'Top Performer');

console.log(`\nRANK MUSIC: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
