/* Manager legibility (branch: manager-legibility) — presentation only.
   healthBreakdown() re-derives branchHealth()'s ten-term formula for on-screen display. The
   invariant that makes the surfaced decomposition trustworthy: the terms it shows must sum,
   through the same clamp/round, back to branchHealth() in EVERY state — otherwise the ledger
   would be lying about where the number comes from. We assert that across a spread of seeded
   states (allies, feuds, strikes, a firing, a meltdown, a vacated desk, and an empty floor). */
const { createWorld } = require('./harness');
const w = createWorld(); w.startNewGame(0); w.run(3000);
const S = w.sandbox, G = w.g;
const ALLY_THRESHOLD = 45;                       // const in game
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };

const workers = () => G.NPCS.filter(n => S.isWorker(n) && n.alive && !n.gone);

// the core assertion: the displayed decomposition reconstructs branchHealth()
function check(name) {
  const bd = S.healthBreakdown();
  const h = S.branchHealth();
  const termSum = bd.terms.reduce((a, t) => a + t.pts, 0);
  const fromTerms = bd.empty ? 0 : Math.round(clamp(termSum, 0, 100));
  ck(`${name}: breakdown.health === branchHealth (${h})`, bd.health === h, `bd=${bd.health}`);
  ck(`${name}: shown terms sum → branchHealth (${h})`, fromTerms === h, `Σterms→${fromTerms}`);
  if (!bd.empty) ck(`${name}: Σterm.pts === raw`, Math.abs(termSum - bd.raw) < 1e-9, `Σ=${termSum.toFixed(4)} raw=${bd.raw.toFixed(4)}`);
  // the render helpers must not throw on this state
  let rendered = true;
  try { S.healthLedgerHTMLPaths(bd); S.healthLedgerRowsOrg(bd); } catch (e) { rendered = false; }
  ck(`${name}: ledger renderers run clean`, rendered);
  return bd;
}

// 1) natural state after warmup
G.player.rank = 5;
check('natural');

// 2) friendship is NO LONGER a health term (Branch 1 rebalance) — seeding allies must not move health
const ws = workers();
const h0 = S.branchHealth();
ws.forEach(n => n.friend = 60);                  // everyone an ally
const bd2 = check('everyone an ally');
ck('the ledger always shows Base + the Calm/stress lever',
  ['base', 'calm'].every(k => S.hlVisible(bd2).some(t => t.key === k)));
ck('there is NO allies term in the health ledger (friendship is leverage now)', !bd2.terms.some(t => t.key === 'allies'));
ck('making everyone an ally does not move branch health', S.branchHealth() === h0, `${h0} -> ${S.branchHealth()}`);

// 3) seed a feud pair, strikes, a vacated desk, a meltdown and a firing
const a = ws[0], b = ws[1];
a.feudWith = b.name; b.feudWith = a.name;        // one feud pair
ws[2].strikes = 2;
const fillDesk = G.desks.find(d => d.owner && d.owner !== 'you' && !d.mgrOffice && !d.retired && !d.reserved);
if (fillDesk) fillDesk.owner = null;             // +1 vacant
G.today.meltdowns = 1;
G.today.fired.push('Somebody');
const bd3 = check('feud+strikes+vacant+melt+fired');
ck('negative terms appear only when firing', S.hlVisible(bd3).some(t => t.key === 'feuds') && S.hlVisible(bd3).some(t => t.key === 'fired'));
ck('a firing is the heaviest single hit (-16)', bd3.terms.find(t => t.key === 'fired').pts === -16);

// 4) empty floor: branchHealth() early-returns 0; breakdown must agree
workers().forEach(n => { n.gone = true; });
const bd4 = check('empty floor');
ck('empty floor reports 0 and no term rows', bd4.empty === true && bd4.health === 0);

console.log(`\nMANAGER LEGIBILITY: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
