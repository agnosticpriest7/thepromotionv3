/* Manager is not a senior chair (branch: fix-manager-churn). youTier() returned 2 for a Manager,
   counting you as a 4th occupant of the 3 senior chairs. On becoming Manager, refreshRanks() then
   demoted a real senior to bring the tier back to cap — an unwanted "back down to SALES/JUNIOR"
   walk-down — and the org panel showed you as a phantom 4/3 senior. youTier(5) now returns -1, like
   Assistant Manager already does. */
const { createWorld } = require('./harness');
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
function world() { const w = createWorld({ seed: 7 }); w.startNewGame(0); let f = 0; while (f < 1500) { w.run(30); f += 30; } return w; }
const seniors = (S, G) => G.NPCS.filter(n => S.isWorker(n) && n.alive && !n.gone && (n.tier | 0) === 2).length;

// --- youTier: Manager/CEO get their own office (-1), not a senior chair ---
{
  const w = world(), S = w.sandbox, G = w.g;
  G.player.rank = 5; ck('youTier(MANAGER) === -1 (own office)', S.youTier() === -1, 'yt=' + S.youTier());
  G.player.rank = 6; ck('youTier(CEO) === -1', S.youTier() === -1);
  G.player.rank = 4; ck('youTier(ASSISTANT MANAGER) === -1 (unchanged)', S.youTier() === -1);
  G.player.rank = 3; ck('youTier(SENIOR SALES) === 2 (unchanged)', S.youTier() === 2);
  G.player.rank = 2; ck('youTier(SALES) === 1 (unchanged)', S.youTier() === 1);
}

// --- becoming Manager does NOT demote a real senior ---
{
  const w = world(), S = w.sandbox, G = w.g;
  G.player.rank = 4; S.refreshRanks();
  const before = seniors(S, G);
  ck('the floor starts with 3 seniors', before === 3, 'seniors=' + before);
  // step up to Manager and let the seat bookkeeping run
  G.player.rank = 5; S.refreshRanks();
  ck('all 3 seniors are still seniors after you become Manager', seniors(S, G) === before, 'seniors=' + seniors(S, G));
  ck('the senior tier reads full-not-over (held 3, 0 free)', G.seatsFree[2] === 0);
}

// --- a stationary Manager does not churn the seat model, and stays legal ---
{
  const w = world(), S = w.sandbox, G = w.g;
  G.player.rank = 5; S.refreshRanks();
  let mv = 0; const oMV = S.moveToDeskFor; S.moveToDeskFor = function () { mv++; return oMV.apply(this, arguments); };
  const before = w.stats.seatViolations;
  w.run(6000, { onDay: () => { G.player.rank = 5; } });
  S.moveToDeskFor = oMV;
  ck('refreshRanks does not shuffle desks under a stationary Manager', mv === 0, 'moveToDeskFor=' + mv);
  ck('no seat/desk/rank violations as Manager', w.stats.seatViolations === before, w.stats.firstSeatViolation || '');
  ck('run stayed alive', G.gameOver === false);
}

console.log(`\nMANAGER NOT A SENIOR CHAIR: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
