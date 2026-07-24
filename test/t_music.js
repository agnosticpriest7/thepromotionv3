/* Rank-based soundtrack (branch: rank-music). One playlist per rank; a rank with no music yet
   falls back to the nearest lower rank that has some, so a promotion never goes silent and never
   restarts the same set. INTERN (0), JUNIOR SALES (1) and SALES (2) have music; ranks 3..6 are
   empty for now and chain up to SALES. Audio itself is a TV read (the harness stubs Audio). */
const { createWorld } = require('./harness');
const w = createWorld(); w.startNewGame(0);
const S = w.sandbox;
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };

// each of the first three ranks has its own playlist
const r0 = S.tracksForRank(0), r1 = S.tracksForRank(1), r2 = S.tracksForRank(2);
ck('rank 0 (INTERN) → its own set', r0.rank === 0 && r0.names.includes('Fluorescent_Hours'));
ck('rank 1 (JUNIOR SALES) → its own set (incl. Promising_Lead)', r1.rank === 1 && r1.names.includes('Promising_Lead'));
ck('rank 2 (SALES) → its own 4-track set (incl. Terms_Accepted)', r2.rank === 2 && r2.names.length === 4 && r2.names.includes('Terms_Accepted'));
// higher ranks with no music yet fall back to the nearest lower rank that has some (SALES now)
ck('rank 3 (SENIOR SALES, empty) falls back to SALES (rank 2)', S.tracksForRank(3).rank === 2);
ck('rank 6 (CEO, empty) falls back to SALES (rank 2)', S.tracksForRank(6).rank === 2);

// starts on the intern set
ck('starts on the intern set', S.musicState().rank === 0);
// promotions walk the sets forward
S.syncMusicToRank(1);
ck('promote INTERN → JUNIOR switches to the junior set', S.musicState().rank === 1 && S.musicState().names.includes('Promising_Lead'));
S.syncMusicToRank(2);
ck('promote JUNIOR → SALES switches to the sales set', S.musicState().rank === 2 && S.musicState().names.includes('Terms_Accepted'));
// a rank that falls back to the same set does NOT restart it
S.syncMusicToRank(3);
ck('rank 3 (fallback → SALES) stays on the sales set (no restart)', S.musicState().rank === 2);
// back down to INTERN switches back
S.syncMusicToRank(0);
ck('back to INTERN loads the intern set', S.musicState().rank === 0 && S.musicState().names.includes('Fluorescent_Hours'));

console.log(`\nRANK MUSIC: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
