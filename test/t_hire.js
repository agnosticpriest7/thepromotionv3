/* Requisition + hire loop (branch: manager-hire-requisition).
   Commit 1 — landing a client: a single call opens a requisition (career.hireReqs, which banks
   and never expires) and books persistent, capped revenue (+3, cap 12) straight into branch
   health — the formula's first revenue-flavoured input. */
const { createWorld } = require('./harness');
const w = createWorld(); w.startNewGame(0); w.run(3000);
const S = w.sandbox, G = w.g;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };

const C = G.career;
G.player.stress = 10;
C.hireReqs = 0; C.revenue = 0;

// --- gate: only a manager runs headcount ---
G.player.rank = 3;
ck('non-manager cannot land a client', S.landClient() === false && (C.hireReqs || 0) === 0);
G.player.rank = 5;

// --- landing a client: one requisition + +3 revenue ---
const h0 = S.branchHealth();
ck('land a client returns true', S.landClient() === true);
ck('exactly one requisition opened', C.hireReqs === 1, 'hireReqs=' + C.hireReqs);
ck('revenue booked +3', C.revenue === 3, 'revenue=' + C.revenue);
const h1 = S.branchHealth();
ck('branch health rose by the revenue (or clamped at 100)', h1 === Math.min(100, h0 + 3) || h1 === 100, `h0=${h0} h1=${h1}`);

// --- revenue is capped small; requisitions bank ---
for (let i = 0; i < 10; i++) S.landClient();
ck('revenue caps at 12', C.revenue === 12, 'revenue=' + C.revenue);
ck('requisitions accumulate and do not cap', C.hireReqs === 11, 'hireReqs=' + C.hireReqs);

// --- the decomposition carries revenue and still reconstructs branchHealth ---
const bd = S.healthBreakdown();
const rev = bd.terms.find(t => t.key === 'revenue');
ck('healthBreakdown carries the revenue term (+12)', !!rev && rev.pts === 12);
ck('revenue is shown in the ledger when booked', S.hlVisible(bd).some(t => t.key === 'revenue'));
const termSum = bd.terms.reduce((a, t) => a + t.pts, 0);
ck('decomposition still sums to branchHealth', Math.round(clamp(termSum, 0, 100)) === S.branchHealth());

// --- revenue PERSISTS across the nightly rollover (Kyle's call: no decay) ---
const revBefore = C.revenue, startDay = G.day;
w.run(60000, { onDay: () => { G.player.rank = 5; } });
ck('a day elapsed', G.day > startDay, `day ${startDay}->${G.day}`);
ck('revenue persists across the rollover (banks, no decay)', C.revenue === revBefore, `before=${revBefore} after=${C.revenue}`);
ck('requisitions persist across the rollover', C.hireReqs === 11, 'hireReqs=' + C.hireReqs);

/* ================= Commit 2 — hire from the manager's desk ================= */
const workers = () => G.NPCS.filter(n => S.isWorker(n) && n.alive && !n.gone);
// guarantee a genuinely vacant, non-reserved, non-office desk to hire into
function ensureVacancy() {
  let v = G.desks.find(d => !d.owner && !d.mgrOffice && !d.retired && !d.reserved);
  if (!v) { const p = workers()[0]; const d = G.desks.find(x => x.owner === p.name); if (d) { d.owner = null; p.gone = true; p.alive = false; } v = d; }
  return v;
}

// --- hiring with no requisition is blocked ---
ensureVacancy();
C.hireReqs = 0;
const phBlocked = G.pendingHires.length;
ck('hire with no requisition is blocked', S.hireWorker() === false && C.hireReqs === 0 && G.pendingHires.length === phBlocked);

// --- hiring consumes exactly one requisition and queues a hire on a vacant non-reserved desk ---
ensureVacancy();
C.hireReqs = 3;
const phBefore = G.pendingHires.length;
const ok = S.hireWorker();
ck('hire with a requisition succeeds', ok === true);
ck('hiring consumes exactly one requisition', C.hireReqs === 2, 'hireReqs=' + C.hireReqs);
ck('a pending hire was queued', G.pendingHires.length === phBefore + 1);
const ph = G.pendingHires[G.pendingHires.length - 1];
ck('the hire targets a genuinely vacant, non-reserved, non-office desk',
  !!ph && ph.desk && !ph.desk.owner && !ph.desk.mgrOffice && !ph.desk.retired && !ph.desk.reserved);

// --- requisitions (and revenue) survive a save round-trip ---
C.hireReqs = 5; C.revenue = 9;
const rawSave = w.rawSave();
const snap = rawSave.buildSnapshot(false, null);
C.hireReqs = 0; C.revenue = 0;                    // clobber, then restore from the snapshot
rawSave.applySnapshot(snap);
ck('requisitions survive a save round-trip', G.career.hireReqs === 5, 'hireReqs=' + G.career.hireReqs);
ck('revenue survives a save round-trip', G.career.revenue === 9, 'revenue=' + G.career.revenue);

// --- the requisitioned hire actually lands, and seat/desk/rank agreement holds ---
//     (fresh SEEDED world with a NATURAL vacancy — no destructive setup that would itself
//      desync the seat bookkeeping; hireWorker only fills existing vacant desks, so it can
//      never oversubscribe a tier)
//     The floor boots fully occupied, so open a seat the proven-seat-safe way (managerFire,
//     validated in t_manager_fire), clear its auto-backfill + vacancy race, then fill the seat
//     with OUR requisition hire and confirm the invariant survives.
const w2 = createWorld({ seed: 7 }); w2.startNewGame(0); w2.run(3000);
const S2 = w2.sandbox, G2 = w2.g; G2.player.rank = 5;
const v = G2.NPCS.find(n => S2.isWorker(n) && n.alive && !n.gone);
v.strikes = 1; S2.managerFire(v);
G2.pendingHires.length = 0; G2.career.reqs.length = 0;    // drop auto-backfill + vacancy race; our requisition fills it
const vac = G2.desks.find(d => !d.owner && !d.mgrOffice && !d.retired && !d.reserved);
ck('firing opened a vacancy to hire into', !!vac, vac ? 'ok' : 'none');
G2.career.hireReqs = 1;
ck('hire files against the vacancy', S2.hireWorker() === true);
const seatBefore = w2.stats.seatViolations;
w2.run(95000, { onDay: () => { G2.player.rank = 5; } });   // past the day+2 landing
ck('the requisitioned hire filled a desk', !!vac.owner, 'owner=' + (vac && vac.owner));
const owned = G2.desks.filter(d => d.owner && d.owner !== 'you').map(d => d.owner);
ck('no desk is double-owned after the hire lands', new Set(owned).size === owned.length);
ck('seat/desk/rank agreement holds across the hire + backfill', w2.stats.seatViolations === seatBefore, w2.stats.firstSeatViolation || '');
ck('run stayed alive', G2.gameOver === false);

console.log(`\nHIRE LOOP (land client + hire): ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
