/* Manager verb #3 — promote (branch: manager-promote). An explicit override of the vacancy race,
   seat-gated, and requiring a JUSTIFICATION: LOYALTY (friend>=45) or MERIT (career at the game's
   own readiness bar, 28 ->SALES / 55 ->SENIOR). A worker who is neither cannot be promoted even
   with a free chair; the menu says which route applies. Seating goes through the seat-safe
   moveToDeskFor(); the vacated old chair backfills day+2. Tests: blocked with no free seat, blocked
   with no justification, both routes work, the vacated desk is handled, seat counts stay within
   SEATS, seat/desk/rank agreement across churn, and a promotion survives a save round-trip. */
const { createWorld } = require('./harness');
const w = createWorld({ seed: 7 }); w.startNewGame(0); w.run(3000);
const S = w.sandbox, G = w.g;
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
const workers = () => G.NPCS.filter(n => S.isWorker(n) && n.alive && !n.gone);
G.player.rank = 5;
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
{ const sr = workers().find(n => S.npcRank(n) === 2); if (sr) { sr.friend = 60; ck('a senior cannot be promoted (no chair above)', S.promotable(sr) === false && S.promoteWorker(sr) === false); } else ck('a senior cannot be promoted (no chair above)', true, 'no senior — skipped'); }

// --- gate: no free SALES chair blocks a justified junior ---
{
  const freeSales = G.desks.filter(d => !d.owner && !d.mgrOffice && !d.retired && (d.tier | 0) === 1);
  freeSales.forEach(d => d.reserved = true); S.refreshRanks();
  const jr = workers().find(n => S.npcRank(n) === 0);
  if (jr) jr.friend = 60;                          // justified by loyalty — so only the SEAT gate can block it
  ck('promote blocked when no SALES chair is free', jr ? S.promoteWorker(jr) === false : true);
  freeSales.forEach(d => d.reserved = false); S.refreshRanks();
}

// --- gate: a free chair but NO justification (not an ally, weak record) is blocked ---
freeSalesSeat();
{
  const jr = workers().find(n => S.npcRank(n) === 0);
  ck('a junior exists', !!jr);
  jr.friend = 20; jr.career = 5;                   // friend<45 AND career<28 -> no route
  ck('blocked with no valid justification (free chair, but neither loyal nor strong)', S.promoteWorker(jr) === false);
  ck('promotable() agrees it is ineligible', S.promotable(jr) === false);
}

// --- route 1: LOYALTY (ally, weak record) works ---
freeSalesSeat();
{
  const jr = workers().find(n => S.npcRank(n) === 0);
  jr.friend = 60; jr.career = 5;                   // ally but low career -> loyalty route only
  const oldTier = S.npcRank(jr), oldDesk = G.desks.find(d => d.owner === jr.name);
  const bystander = workers().find(o => o !== jr); const byMood0 = bystander ? bystander.mood : 0;
  const susp0 = G.player.suspicion;
  ck('promote on LOYALTY succeeds', S.promoteWorker(jr) === true);
  ck('worker moved up exactly one tier', S.npcRank(jr) === oldTier + 1, 'tier=' + S.npcRank(jr));
  ck('seated at a desk of the new tier', (() => { const d = G.desks.find(x => x.owner === jr.name); return !!d && (d.tier | 0) === oldTier + 1; })());
  ck('the vacated old chair is queued for backfill', !!oldDesk && G.pendingHires.some(h => h.desk === oldDesk));
  ck('a promotion costs NO suspicion (no HR scrutiny)', G.player.suspicion === susp0, 'Δ=' + (G.player.suspicion - susp0));
  ck('the floor takes a small mood dip (-4)', !bystander || bystander.mood === byMood0 - 4, bystander ? 'Δ=' + (bystander.mood - byMood0) : 'n/a');
}

// --- route 2: MERIT (non-ally, strong record) works ---
freeSalesSeat();
{
  const jr = workers().find(n => S.npcRank(n) === 0);
  if (jr) {
    jr.friend = 20; jr.career = 40;                // NOT an ally, but career>=28 -> merit route
    ck('promoteRoutes flags merit, not loyalty', S.promoteRoutes(jr).merit === true && S.promoteRoutes(jr).loyal === false);
    const oldTier = S.npcRank(jr);
    ck('promote on MERIT succeeds', S.promoteWorker(jr) === true && S.npcRank(jr) === oldTier + 1);
  } else ck('promote on MERIT succeeds', true, 'no junior left — skipped');
}

// --- seat counts stay within SEATS (workers only) ---
S.refreshRanks();
{
  const t1 = workers().filter(n => S.npcRank(n) === 1).length, t2 = workers().filter(n => S.npcRank(n) === 2).length;
  ck('SALES workers within SEATS[1]', t1 <= G.SEATS[1], `${t1}/${G.SEATS[1]}`);
  ck('SENIOR workers within SEATS[2]', t2 <= G.SEATS[2], `${t2}/${G.SEATS[2]}`);
}

// --- a promotion survives a save round-trip ---
freeSalesSeat();
{
  const jr = workers().find(n => S.npcRank(n) === 0);
  if (jr) {
    jr.friend = 60;
    const nm = jr.name;
    S.promoteWorker(jr);
    const tierAfter = S.npcRank(jr);
    const save = w.rawSave(); const snap = save.buildSnapshot(false, null);
    jr.tier = 0;                                   // clobber, then restore from the snapshot
    save.applySnapshot(snap);
    const back = G.NPCS.find(n => n.name === nm);
    ck('a promotion survives a save round-trip', !!back && (back.tier | 0) === tierAfter && G.desks.some(d => d.owner === nm && (d.tier | 0) === tierAfter), 'tier=' + (back && back.tier));
  } else ck('a promotion survives a save round-trip', true, 'no junior left — skipped');
}

// --- §4.3: seat/desk/rank agreement holds across repeated promotions + backfills (fresh world;
//     open each SALES seat the seat-safe way via managerFire, then promote a junior into it) ---
const wI = createWorld({ seed: 7 }); wI.startNewGame(0); wI.run(3000);
const SI = wI.sandbox, GI = wI.g; GI.player.rank = 5;
const wk = () => GI.NPCS.filter(n => SI.isWorker(n) && n.alive && !n.gone);
let promotions = 0;
for (let i = 0; i < 3; i++) {
  SI.refreshRanks();
  if (GI.seatsFree[1] <= 0) { const t1 = wk().find(n => SI.npcRank(n) === 1); if (t1) { t1.strikes = 1; SI.managerFire(t1); GI.pendingHires.length = 0; SI.refreshRanks(); } }
  const jr = wk().find(n => SI.npcRank(n) === 0);
  if (jr) { jr.friend = 60; if (SI.promoteWorker(jr)) promotions++; }
}
ck('promotions actually happened in the churn setup', promotions >= 1, 'count=' + promotions);
const seatBefore = wI.stats.seatViolations;
wI.run(95000, { onDay: () => { GI.player.rank = 5; } });
ck('seat/desk/rank agreement holds across promotions + backfills', wI.stats.seatViolations === seatBefore, wI.stats.firstSeatViolation || '');
ck('run stayed alive', GI.gameOver === false);

console.log(`\nMANAGER PROMOTE: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
