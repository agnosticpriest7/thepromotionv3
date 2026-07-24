/* Rank-based soundtrack (branch: rank-music) + the "now playing" name formatter. One playlist per
   rank; a rank with no music yet falls back to the nearest lower rank that has some, so a promotion
   never goes silent and never restarts the same set. INTERN(0), JUNIOR(1), SALES(2), SENIOR(3) have
   music; ranks 4..6 chain up to SENIOR. Audio + the on-screen banner are TV reads (harness stubs
   Audio/DOM); here we assert the mapping, the switch logic, and prettyTrack(). */
const { createWorld } = require('./harness');
const w = createWorld(); w.startNewGame(0);
const S = w.sandbox;
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };

// each of the first four ranks has its own playlist
ck('rank 0 (INTERN) → its own set', S.tracksForRank(0).rank === 0 && S.tracksForRank(0).names.includes('Fluorescent_Hours'));
ck('rank 1 (JUNIOR SALES) → its own set', S.tracksForRank(1).rank === 1 && S.tracksForRank(1).names.includes('Promising_Lead'));
ck('rank 2 (SALES) → its own set', S.tracksForRank(2).rank === 2 && S.tracksForRank(2).names.includes('Terms_Accepted'));
ck('rank 3 (SENIOR SALES) → its own 4-track set (incl. Top_Performer)', S.tracksForRank(3).rank === 3 && S.tracksForRank(3).names.length === 4 && S.tracksForRank(3).names.includes('Top_Performer'));
// higher ranks with no music yet fall back to the nearest lower rank that has some (SENIOR now)
ck('rank 4 (ASSISTANT MANAGER, empty) falls back to SENIOR (rank 3)', S.tracksForRank(4).rank === 3);
ck('rank 6 (CEO, empty) falls back to SENIOR (rank 3)', S.tracksForRank(6).rank === 3);

// starts on the intern set, promotions walk the sets forward
ck('starts on the intern set', S.musicState().rank === 0);
S.syncMusicToRank(1); ck('promote → JUNIOR switches set', S.musicState().rank === 1 && S.musicState().names.includes('Promising_Lead'));
S.syncMusicToRank(2); ck('promote → SALES switches set', S.musicState().rank === 2 && S.musicState().names.includes('Terms_Accepted'));
S.syncMusicToRank(3); ck('promote → SENIOR switches set', S.musicState().rank === 3 && S.musicState().names.includes('Top_Performer'));
// a rank that falls back to the same set does NOT restart it
S.syncMusicToRank(4); ck('rank 4 (fallback → SENIOR) stays on the senior set (no restart)', S.musicState().rank === 3);
// back to INTERN switches back
S.syncMusicToRank(0); ck('back to INTERN loads the intern set', S.musicState().rank === 0 && S.musicState().names.includes('Fluorescent_Hours'));

// the "now playing" banner formats the file base-name for display
ck('prettyTrack: underscores → spaces', S.prettyTrack('Top_Performer') === 'Top Performer' && S.prettyTrack('Fluorescent_Hours') === 'Fluorescent Hours');

console.log(`\nRANK MUSIC: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
