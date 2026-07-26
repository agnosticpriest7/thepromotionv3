/* TEST GAME (branch: test-game-menu). The dev menu drops a fresh round in at any rank INTERN..MANAGER
   so endgame features can be reached without grinding up. jumpToRank() places the player with the same
   office/desk plumbing a real promotion uses, keeping the seat/desk/rank model consistent. MANAGER
   means Dale is gone + the corner office is yours (merit/catfish testable); ASSISTANT MANAGER keeps
   Dale (loyalty route testable). Not CEO (that's the win). */
const { createWorld } = require('./harness');
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
function fresh() { const w = createWorld({ seed: 7 }); w.startNewGame(0); let f = 0; while (f < 1500) { w.run(30); f += 30; } return w; }
const myDesk = G => G.desks.find(d => d.owner === 'you');
const daleAlive = G => G.NPCS.some(n => n.mgr && n.alive);

// --- each worker rank seats the player at the right tier, and the floor stays legal ---
for (const [r, tier] of [[1, 0], [2, 1], [3, 2]]) {
  const w = fresh(), S = w.sandbox, G = w.g;
  S.jumpToRank(r);
  const d = myDesk(G);
  ck(`jumpToRank(${r}) → rank ${r}, seated in a tier-${tier} desk (out of the intern nook)`, G.player.rank === r && !!d && (d.tier | 0) === tier && d.intern !== true, d ? 'tier ' + (d.tier | 0) : 'no desk');
  const before = w.stats.seatViolations; w.run(3000);
  ck(`  … the floor stays consistent at rank ${r}`, w.stats.seatViolations === before && G.gameOver === false && w.stats.throws === 0, w.stats.firstSeatViolation || '');
}

// --- ASSISTANT MANAGER: own office, and Dale is still here (the loyalty route stays testable) ---
{
  const w = fresh(), S = w.sandbox, G = w.g;
  S.jumpToRank(4);
  const d = myDesk(G);
  ck('jumpToRank(4) → ASSISTANT MANAGER in the asst office (youTier -1)', G.player.rank === 4 && !!d && d.asstOffice === true && S.youTier() === -1);
  ck('Dale is still present at AM — the loyalty arc is reachable', daleAlive(G) === true);
  ck('the delegation verb is active at AM', S.delegActive() === true);
  const before = w.stats.seatViolations; w.run(3000);
  ck('  … the floor stays consistent at AM', w.stats.seatViolations === before && !G.gameOver && w.stats.throws === 0, w.stats.firstSeatViolation || '');
}

// --- MANAGER: Dale gone, corner office, the CEO endgame routes are reachable ---
{
  const w = fresh(), S = w.sandbox, G = w.g;
  S.jumpToRank(5);
  const d = myDesk(G);
  ck('jumpToRank(5) → MANAGER in the corner office (youTier -1)', G.player.rank === 5 && !!d && d.mgrOffice === true && S.youTier() === -1);
  ck('Dale is gone and the manager chair is yours (mgrGone)', daleAlive(G) === false && G.career.mgrGone === true);
  // the merit route is now reachable: a day at MERIT_TARGET sets meritReady -> the CEO gate opens
  const oHT = S.healthToday; S.healthToday = () => 90; S.scoreTheDay(); S.healthToday = oHT;
  ck('the CEO merit route is testable from here (a good day opens the gate)', G.career.meritReady === true && S.gateFor(6).ok === true);
  const before = w.stats.seatViolations; w.run(3000, { onDay: () => { G.player.rank = 5; } });
  ck('  … the floor stays consistent at MANAGER', w.stats.seatViolations === before && !G.gameOver && w.stats.throws === 0, w.stats.firstSeatViolation || '');
}

// --- a test-game jump survives a save round-trip (so it can be resumed) ---
{
  const w = fresh(), S = w.sandbox, G = w.g;
  S.jumpToRank(5);
  const save = w.rawSave(); const snap = save.buildSnapshot(false, null);
  G.player.rank = 0;                                   // clobber, then restore
  save.applySnapshot(snap);
  ck('a test-game MANAGER state round-trips through a save', G.player.rank === 5 && !!myDesk(G) && myDesk(G).mgrOffice === true);
}

console.log(`\nTEST GAME (rank jump): ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
