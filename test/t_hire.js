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

console.log(`\nHIRE LOOP — commit 1 (land client): ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
