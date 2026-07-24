/* Rank-based soundtrack (branch: rank-music). One playlist per rank; a rank with no music yet
   falls back to the nearest lower rank that has some, so a promotion never goes silent and never
   restarts the same set. INTERN (rank 0) and JUNIOR SALES (rank 1) both have music; ranks 2..6
   are empty for now and chain up to JUNIOR. Audio itself is a TV read (the harness stubs Audio). */
const { createWorld } = require('./harness');
const w = createWorld(); w.startNewGame(0);
const S = w.sandbox;
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };

// INTERN and JUNIOR each have their own playlist
const r0 = S.tracksForRank(0), r1 = S.tracksForRank(1);
ck('rank 0 (INTERN) → its own set', r0.rank === 0 && r0.names.includes('Fluorescent_Hours'));
ck('rank 1 (JUNIOR SALES) → its own 4-track set (incl. Promising_Lead)', r1.rank === 1 && r1.names.length === 4 && r1.names.includes('Promising_Lead'));
// higher ranks with no music yet fall back to the nearest lower rank that has some (JUNIOR now)
ck('rank 2 (SALES, empty) falls back to JUNIOR (rank 1)', S.tracksForRank(2).rank === 1);
ck('rank 6 (CEO, empty) falls back to JUNIOR (rank 1)', S.tracksForRank(6).rank === 1);

// starts on the intern set
ck('starts on the intern set', S.musicState().rank === 0);
// promotion INTERN → JUNIOR switches the soundtrack
S.syncMusicToRank(1);
ck('promote INTERN → JUNIOR switches to the junior set', S.musicState().rank === 1 && S.musicState().names.includes('Promising_Lead'));
// a rank that falls back to the same set does NOT restart it
S.syncMusicToRank(2);
ck('rank 2 (fallback → JUNIOR) stays on the junior set (no restart)', S.musicState().rank === 1);
// back down to INTERN switches back
S.syncMusicToRank(0);
ck('back to INTERN loads the intern set', S.musicState().rank === 0 && S.musicState().names.includes('Fluorescent_Hours'));

console.log(`\nRANK MUSIC: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
