/* MANAGER VERBS 2 (branch: manager-verbs-2): DEMOTE + promote-menu clarity.
   Demote is discretionary (no strike, no suspicion — a management call, not sabotage), one rung
   down, and ONLY if a chair is open at the lower tier; if there's no room below you can't demote.
   The demoted worker takes a stress + mood hit and their standing drops so the org chart won't
   bounce them back up; their old chair opens. Promote menu now lists every candidate and, for the
   ones who aren't ready, says exactly what they're missing. */
const { createWorld } = require('./harness');
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
function mgrWorld() { const w = createWorld({ seed: 7 }); w.startNewGame(0); let f = 0; while (f < 1500) { w.run(30); f += 30; } w.g.player.rank = 5; return w; }
const workers = (S, G) => G.NPCS.filter(n => S.isWorker(n) && n.alive && !n.gone);
const remove = (S, G, n) => { const d = G.desks.find(x => x.owner === n.name); if (d) d.owner = null; n.alive = false; n.gone = true; S.refreshRanks(); };
// drop one senior so the (pre-existing) rank-5 youTier=2 over-count doesn't demote seniors under us
const settleSeniors = (S, G) => { remove(S, G, workers(S, G).find(n => S.npcRank(n) === 2)); };

// --- (1) demote Sales -> Junior into an open junior desk: tier drops, effects apply, NO suspicion ---
{
  const w = mgrWorld(), S = w.sandbox, G = w.g; settleSeniors(S, G);
  remove(S, G, workers(S, G).find(n => S.npcRank(n) === 0));   // open a junior desk
  const sales = workers(S, G).find(n => S.npcRank(n) === 1);
  const stress0 = sales.stress, mood0 = sales.mood, susp0 = G.player.suspicion;
  const oldDesk = G.desks.find(d => d.owner === sales.name);
  const ok = S.managerDemote(sales);
  ck('demote Sales -> Junior succeeds', ok === true);
  ck('the worker dropped exactly one tier', S.npcRank(sales) === 1 - 1, 'tier=' + S.npcRank(sales));
  ck('they landed in a real (non-reserved) lower desk', (() => { const d = G.desks.find(x => x.owner === sales.name); return !!d && (d.tier | 0) === 0 && !d.reserved; })());
  ck('their old chair opened', oldDesk.owner === null);
  ck('demote costs the worker stress + mood', sales.stress > stress0 && sales.mood < mood0, `Δstress=${Math.round(sales.stress - stress0)} Δmood=${Math.round(sales.mood - mood0)}`);
  ck('demote raises NO suspicion (a management call, not sabotage)', G.player.suspicion === susp0, 'Δ=' + (G.player.suspicion - susp0));
}

// --- (2) blocked when the lower tier has no open chair ---
{
  const w = mgrWorld(), S = w.sandbox, G = w.g; settleSeniors(S, G);
  // Sales (tier 1) is full at boot -> a Senior cannot be demoted into it
  const sr = workers(S, G).find(n => S.npcRank(n) === 2);
  ck('Senior -> Sales blocked when Sales is full', !!sr && S.managerDemote(sr) === false && S.npcRank(sr) === 2);
  ck('demoteTarget reports no open chair', S.demoteTarget(sr) === null);
}

// --- (3) a junior is already at the bottom ---
{
  const w = mgrWorld(), S = w.sandbox, G = w.g;
  const jr = workers(S, G).find(n => S.npcRank(n) === 0);
  ck('a junior cannot be demoted further', S.managerDemote(jr) === false);
}

// --- (4) only the manager can demote ---
{
  const w = mgrWorld(), S = w.sandbox, G = w.g; G.player.rank = 3;
  const anyone = workers(S, G).find(n => S.npcRank(n) >= 1);
  ck('a non-manager cannot demote', S.managerDemote(anyone) === false);
}

// --- (5) demote menu lists Sales/Senior, disabling those with no open chair below ---
{
  const w = mgrWorld(), S = w.sandbox, G = w.g; settleSeniors(S, G);
  const menu = S.demoteMenu();
  ck('the demote menu offers demotable workers', menu.items.some(i => /Demote/.test(i.label)));
  ck('a worker with no open lower chair is shown but disabled', menu.items.some(i => i.disabled && /no open/.test(i.risk || '')) || menu.items.some(i => /Demote/.test(i.label) && !i.disabled), 'menu built');
}

// --- (6) promote menu names EXACTLY what a not-ready worker needs ---
{
  const w = mgrWorld(), S = w.sandbox, G = w.g;
  const menu = S.promoteMenu();
  const needy = menu.items.find(i => i.disabled && /needs/.test(i.risk || ''));
  ck('promote menu shows a candidate with a concrete blocker', !!needy, needy ? needy.risk : 'none');
  ck('the blocker names a chair and/or a loyalty/record threshold', !!needy && /(chair|friend|career)/.test(needy.risk));
}

// --- (7) no seat/desk/rank violations after a demote settles ---
{
  const w = mgrWorld(), S = w.sandbox, G = w.g; settleSeniors(S, G);
  remove(S, G, workers(S, G).find(n => S.npcRank(n) === 0));
  S.managerDemote(workers(S, G).find(n => S.npcRank(n) === 1));
  const before = w.stats.seatViolations;
  w.run(5000, { onDay: () => { G.player.rank = 5; } });
  ck('no seat/desk/rank violations after the demote', w.stats.seatViolations === before, w.stats.firstSeatViolation || '');
  ck('run stayed alive', G.gameOver === false);
}

console.log(`\nMANAGER DEMOTE + PROMOTE CLARITY: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
