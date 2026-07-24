/* Rank-based soundtrack (branch: rank-music). One playlist per rank; a rank with no music yet
   falls back to the nearest lower rank that has some, so a promotion never goes silent and never
   restarts the same set. Asserts the mapping + the switch logic (the audio itself is a TV read —
   the harness stubs Audio, and syncMusicToRank only calls playTrack once real playback has begun). */
const { createWorld } = require('./harness');
const w = createWorld(); w.startNewGame(0);
const S = w.sandbox;
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };

// INTERN (rank 0) is the current playlist
const r0 = S.tracksForRank(0);
ck('rank 0 (INTERN) resolves to its own set', r0.rank === 0 && r0.names.includes('Fluorescent_Hours'));
// ranks with no music yet fall back to the nearest lower rank that has some (INTERN)
ck('rank 1 (JUNIOR, empty) falls back to rank 0', S.tracksForRank(1).rank === 0);
ck('rank 6 (CEO, empty) falls back to rank 0', S.tracksForRank(6).rank === 0);

// starts on the intern set
ck('starts on the intern set', S.musicState().rank === 0);

// promotion to a rank WITHOUT music keeps the current set (no switch, no silence)
S.syncMusicToRank(1);
ck('promote to JUNIOR (no music) → stays on the intern set', S.musicState().rank === 0 && S.musicState().names.includes('Fluorescent_Hours'));

// once JUNIOR music exists, that rank resolves to itself and empty higher ranks chain up to it
S.musicState().sets[1].push('Junior_A', 'Junior_B');
ck('after adding JUNIOR music, rank 1 → its own set', S.tracksForRank(1).rank === 1 && S.tracksForRank(1).names.length === 2);
ck('rank 2 (still empty) now falls back to rank 1', S.tracksForRank(2).rank === 1);

// syncing to JUNIOR now actually switches the loaded set
S.syncMusicToRank(1);
ck('sync to JUNIOR loads the junior set', S.musicState().rank === 1 && S.musicState().names.includes('Junior_A'));
// a rank that falls back to the same set does NOT restart it
S.syncMusicToRank(2);
ck('sync to rank 2 (fallback → 1) stays on the junior set (no restart)', S.musicState().rank === 1);
// back down to INTERN (new game / demotion) switches back
S.syncMusicToRank(0);
ck('sync back to rank 0 loads the intern set', S.musicState().rank === 0 && S.musicState().names.includes('Fluorescent_Hours'));

S.musicState().sets[1].length = 0;   // cleanup shared module state
console.log(`\nRANK MUSIC: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
