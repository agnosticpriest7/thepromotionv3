/* Manager verb #3 — promote (branch: manager-promote). Patronage, seat-gated: an explicit
   override of the vacancy race. A free chair must exist at the next tier; seating goes through the
   seat-safe moveToDeskFor(); the vacated old chair backfills day+2. Any worker can be promoted, but
   allies are cheaper (an ally costs nothing; a non-ally is politically visible = +suspicion), and
   the floor always takes a small dip. Tests: the gate, the ally/non-ally cost, the tier move +
   backfill, the floor dip, and (the brief's §4.3 requirement) seat/desk/rank holds across churn. */
const { createWorld } = require('./harness');
const w = createWorld({ seed: 7 }); w.startNewGame(0); w.run(3000);
const S = w.sandbox, G = w.g;
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
const workers = () => G.NPCS.filter(n => S.isWorker(n) && n.alive && !n.gone);
G.player.rank = 5; G.player.suspicion = 10; G.player.stress = 10;
S.refreshRanks();

// free one SALES (tier 1) chair by removing a tier-1 worker (instantaneous setup; no run on this world after)
function freeSalesSeat() {
  if (G.seatsFree[1] > 0) return;
  const t1 = workers().find(n => S.npcRank(n) === 1);
  if (t1) { const d = G.desks.find(x => x.owner === t1.name); if (d) d.owner = null; t1.alive = false; t1.gone = true; }
  S.refreshRanks();
}

// --- gate: only a manager ---
G.player.rank = 3;
{ const jr = workers().find(n => S.npcRank(n) === 0); ck('non-manager cannot promote', jr ? S.promoteWorker(jr) === false : true); }
G.player.rank = 5;

// --- gate: a SENIOR has no chair above but yours ---
{ const sr = workers().find(n => S.npcRank(n) === 2); ck('a senior cannot be promoted (no chair above)', sr ? (S.promotable(sr) === false && S.promoteWorker(sr) === false) : true); }

// --- gate: no free SALES chair blocks a junior promotion ---
{
  const freeSales = G.desks.filter(d => !d.owner && !d.mgrOffice && !d.retired && (d.tier | 0) === 1);
  freeSales.forEach(d => d.reserved = true); S.refreshRanks();
  const jr = workers().find(n => S.npcRank(n) === 0);
  ck('promote blocked when no SALES chair is free', jr ? S.promoteWorker(jr) === false : true);
  freeSales.forEach(d => d.reserved = false); S.refreshRanks();
}

// --- promote succeeds: tier up, seated at new-tier desk, old chair backfills ---
freeSalesSeat();
const jr = workers().find(n => S.npcRank(n) === 0);
ck('a junior exists to promote', !!jr);
const oldTier = S.npcRank(jr), oldDesk = G.desks.find(d => d.owner === jr.name);
// a bystander to watch for the floor dip
const bystander = workers().find(o => o !== jr);
const byMood0 = bystander ? bystander.mood : 0;
jr.friend = 20;                                   // NON-ally, to exercise the suspicion cost
const susp0 = G.player.suspicion;
const ok = S.promoteWorker(jr);
ck('promote succeeds when a chair is free', ok === true);
ck('worker moved up exactly one tier', S.npcRank(jr) === oldTier + 1, 'tier=' + S.npcRank(jr));
ck('worker is seated at a desk of their new tier', (() => { const d = G.desks.find(x => x.owner === jr.name); return !!d && (d.tier | 0) === oldTier + 1; })());
ck('the vacated old chair is queued for backfill', !!oldDesk && G.pendingHires.some(h => h.desk === oldDesk));
ck('non-ally promotion costs suspicion (+8)', G.player.suspicion === susp0 + 8, 'Δ=' + (G.player.suspicion - susp0));
ck('the floor takes a small mood dip (-4)', !bystander || bystander.mood === byMood0 - 4, bystander ? 'Δ=' + (bystander.mood - byMood0) : 'n/a');

// --- an ally promotion costs no suspicion ---
freeSalesSeat();
{
  const jr2 = workers().find(n => S.npcRank(n) === 0);
  if (jr2) {
    jr2.friend = 60;                              // ally
    const s0 = G.player.suspicion;
    const ok2 = S.promoteWorker(jr2);
    ck('ally promotion succeeds and costs no suspicion', ok2 === true && G.player.suspicion === s0, 'Δ=' + (G.player.suspicion - s0));
  } else ck('ally promotion succeeds and costs no suspicion', true, 'no junior left — skipped');
}

// --- §4.3: seat/desk/rank agreement holds across repeated promotions + backfills (fresh world;
//     free each SALES seat the seat-safe way via managerFire, then promote a junior into it) ---
const wI = createWorld({ seed: 7 }); wI.startNewGame(0); wI.run(3000);
const SI = wI.sandbox, GI = wI.g; GI.player.rank = 5;
const wk = () => GI.NPCS.filter(n => SI.isWorker(n) && n.alive && !n.gone);
let promotions = 0;
for (let i = 0; i < 3; i++) {
  SI.refreshRanks();
  if (GI.seatsFree[1] <= 0) {
    const t1 = wk().find(n => SI.npcRank(n) === 1);
    if (t1) { t1.strikes = 1; SI.managerFire(t1); GI.pendingHires.length = 0; SI.refreshRanks(); }
  }
  const jr3 = wk().find(n => SI.npcRank(n) === 0);
  if (jr3) { jr3.friend = 50; if (SI.promoteWorker(jr3)) promotions++; }
}
ck('promotions actually happened in the churn setup', promotions >= 1, 'count=' + promotions);
const seatBefore = wI.stats.seatViolations;
wI.run(95000, { onDay: () => { GI.player.rank = 5; } });
ck('seat/desk/rank agreement holds across promotions + backfills', wI.stats.seatViolations === seatBefore, wI.stats.firstSeatViolation || '');
ck('run stayed alive', GI.gameOver === false);

console.log(`\nMANAGER PROMOTE: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
