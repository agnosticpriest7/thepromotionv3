/* npcLeaving() — the one hook every NPC-removal path goes through. When a person the player has been
   investing against leaves, every dangling investment is swept and closed (feed line default, NO
   payout). The harness's investment invariant asserts it ran: after any removal, no player-held
   investment may reference a gone NPC — so a future removal path that forgets the hook fails loudly. */
const { createWorld } = require('./harness');
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
function amWorld() { const w = createWorld({ seed: 7 }); w.startNewGame(0); let f = 0; while (f < 1500) { w.run(30); f += 30; } return w; }
const workers = (G, S) => G.NPCS.filter(n => S.isWorker(n) && n.alive && !n.gone);

// --- each investment is swept when the target is fired ---
{ const w = amWorld(), S = w.sandbox, G = w.g; const x = workers(G, S)[0];
  G.player.leverage.push({ label: 'HR file: ' + x.name, target: x.name, power: 40, src: 'hrfile' });
  S.fireNPC(x);
  ck('dirt: swept when the target is fired', S.dirtsOn(x.name).length === 0); }

{ const w = amWorld(), S = w.sandbox, G = w.g; const a = workers(G, S)[0], x = workers(G, S)[1];
  a.mission = { target: x.name, coerced: true };
  S.fireNPC(x);
  ck('mission: the coerced job on a fired target is cancelled', a.mission === null); }

{ const w = amWorld(), S = w.sandbox, G = w.g; G.player.rank = 4; const x = workers(G, S)[0]; x.ptype = 'zealot';
  const t = { id: ++G.deleg.seq, kind: 'grind', phase: 510, exp: G.clock + 9999, to: null, state: 'open' }; G.deleg.q.push(t);
  ck('delegation: setup assigns the job', S.delegAssign(t, x) === true && t.state === 'assigned');
  S.fireNPC(x);
  ck('delegation: a job assigned to a fired worker becomes a miss', t.state === 'miss' && !G.deleg.q.some(q => q.state === 'assigned' && q.to === x.name)); }

{ const w = amWorld(), S = w.sandbox, G = w.g; const x = workers(G, S)[0]; G.career.championed.push(x.name);
  S.fireNPC(x);
  ck('champion: a championed worker is dropped when they leave', !G.career.championed.includes(x.name)); }

{ const w = amWorld(), S = w.sandbox, G = w.g; const x = workers(G, S)[0]; x.prankBuild = { type: 'well', stage: 1, tier: 3, armed: false };
  S.fireNPC(x);
  ck('prank: a half-built prank is cleared', !x.prankBuild); }

{ const w = amWorld(), S = w.sandbox, G = w.g; const x = workers(G, S)[0];
  G.NPCS.forEach(n => n.rival = false); x.rival = true;
  S.fireNPC(x);
  ck('rival: the floor names a new rival', G.NPCS.some(n => n.rival && n.alive && !n.gone && n !== x)); }

{ const w = amWorld(), S = w.sandbox, G = w.g; G.dale.active = true; G.dale.step = 5; G.dale.done = false;
  S.removeDale();
  ck('dale: the loyalty arc closes when Dale is reported out', G.dale.active === false && G.career.mgrGone === true); }

{ const w = amWorld(), S = w.sandbox, G = w.g; G.dale.active = true; G.dale.step = 6; G.dale.done = false;
  S.dalePromotedUp();
  ck('dale: the arc also closes on the delegation route (dalePromotedUp)', G.dale.active === false && G.career.mgrGone === true); }

{ const w = amWorld(), S = w.sandbox, G = w.g; const x = workers(G, S)[0];
  x.prankBuild = { type: 'well', stage: 1, tier: 3 }; G.player.leverage.push({ label: 'f', target: x.name, src: 'hrfile' });
  S.promoteRivalAway(x);
  ck('promoteRivalAway routes through the hook too', !x.prankBuild && S.dirtsOn(x.name).length === 0); }

// --- the invariant CATCHES a removal that bypasses the hook (the durability guarantee) ---
{ const w = amWorld(), S = w.sandbox, G = w.g; const x = workers(G, S)[0];
  G.player.leverage.push({ label: 'HR file', target: x.name, src: 'hrfile' });
  x.alive = false;                 // remove WITHOUT calling npcLeaving — a future path that forgot the hook
  const before = w.stats.investmentViolations;
  w.run(90);
  ck('invariant FIRES when a removal bypasses the hook', w.stats.investmentViolations > before, 'viol=' + w.stats.investmentViolations + ' (' + (w.stats.firstInvestmentViolation || '') + ')'); }

// --- a proper (swept) removal keeps the invariant clean over a run ---
{ const w = amWorld(), S = w.sandbox, G = w.g; const x = workers(G, S)[0];
  G.player.leverage.push({ label: 'HR file', target: x.name, src: 'hrfile' });
  S.fireNPC(x);
  const before = w.stats.investmentViolations;
  w.run(3000);
  ck('a properly-swept removal keeps the invariant clean', w.stats.investmentViolations === before, 'viol=' + w.stats.investmentViolations); }

// --- career.championed survives a save round-trip ---
{ const w = amWorld(), S = w.sandbox, G = w.g; const x = workers(G, S)[0]; G.career.championed.push(x.name);
  const save = w.rawSave(); const snap = save.buildSnapshot(false, null);
  G.career.championed = [];
  save.applySnapshot(snap);
  ck('career.championed survives a save round-trip', G.career.championed.includes(x.name)); }

console.log(`\nNPC-LEAVING SWEEP: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
