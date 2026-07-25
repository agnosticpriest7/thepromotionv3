/* LOYALTY ROUTE -> CEO, END-TO-END through the REAL functions.

   The 20/20 paths-to-victory run set career.vpFavor = 1 DIRECTLY to open the CEO gate — the exact
   "uncraftable recipes" shape (skip the acquisition path and you never learn it was impossible).
   This test never sets vpFavor, dale.step, dale.titled, or a rank/gate flag. It drives all 16 beats
   of Dale's arc through offerDaleFavor()/completeDaleFavor() — the real functions the game calls —
   and then drives the REAL gate/promotion machinery (gateFor + tryPromote) to see whether a CEO win
   actually lands.

   The ONE piece of scaffolding is player.prog: raising it to 100 stands in for a shift of honest
   work between rungs (the arc opens gates, it does not fill the progress bar). Every gate that must
   open — MANAGER (dale.titled, set at beat 12) and CEO (career.vpFavor, set at beat 16) — opens from
   the arc's real outputs, read by the real gateFor(). If the loyalty route to CEO is wired, this
   goes green; if it dead-ends, it fails here instead of in a player's hands. */
const { createWorld } = require('./harness');
const w = createWorld({ seed: 7 }); w.startNewGame(0);
let f = 0; while (f < 1500) { w.run(30); f += 30; }   // warm past the intro tour
const S = w.sandbox, G = w.g;
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
const daleAlive = () => G.NPCS.some(n => n.mgr && n.alive);

// --- drive the full 16-beat arc through the real functions, no flags set ---
function driveBeat() {
  if (G.dale.step >= 16 || !daleAlive()) return false;
  G.dale.todayCount = 0; G.dale.cooldown = 0; G.dale.offered = null;
  S.offerDaleFavor();                 // Dale offers the next authored beat
  if (!G.dale.offered) return false;
  S.completeDaleFavor();              // you do it; the arc advances
  return true;
}
const vpBefore = G.career.vpFavor, titledBefore = G.dale.titled;
let guard = 0;
while (G.dale.step < 16 && guard++ < 200) { if (!driveBeat()) break; }

ck('the arc reached beat 16 through the real functions', G.dale.step >= 16, `beat ${G.dale.step}/16`);
ck('the payoff fired (dale.done)', G.dale.done === true);
ck('the ARC is what sets career.vpFavor (answer (a), not the catfish only)',
   vpBefore === 0 && G.career.vpFavor >= 1, `vp ${vpBefore} -> ${G.career.vpFavor}`);
ck('the fake title opened the MANAGER gate mid-arc (dale.titled)', G.dale.titled === true);

// --- what does the arc ALONE leave you as? (does the loyalty route self-complete, like catfish?) ---
const arcRank = G.player.rank, arcProg = Math.round(G.player.prog), arcOver = G.gameOver;
console.log(`  … after the full arc, before any further work: rank=${G.RANKS[arcRank]} (idx ${arcRank}), prog=${arcProg}%, gameOver=${arcOver}`);
ck('gateFor(CEO) now reads open from the real arc output', S.gateFor(6).ok === true);

// --- the REAL gate/promotion machinery: does it carry AM -> Manager -> CEO? ---
// player.prog stands in for honest work; every gate below is the real gateFor() reading real arc state.
let climbGuard = 0;
while (G.player.rank < 6 && !G.gameOver && climbGuard++ < 12) {
  G.player.prog = 100;
  S.tryPromote();
}
ck('the real gates carry you AM -> Manager -> CEO once the arc opened them', G.player.rank === 6, `rank ${G.RANKS[G.player.rank]} (idx ${G.player.rank})`);
ck('the CEO win actually lands (checkWin set gameOver)', G.gameOver === true);

console.log(`\nLOYALTY -> CEO (end-to-end, real functions): ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
