/* HR FREEZE at Manager (branch: manager-role-finish). Once you're the Manager, HR stops moving people
   on its own: rivals don't climb upstairs, open chairs don't auto-fill, and a vacated desk (fire /
   demotion / promotion) is NOT auto-backfilled — you hire to fill it, or it stays empty. Below Manager
   the autonomous churn is unchanged. (hrFrozen() = player.rank>=5.) */
const { createWorld } = require('./harness');
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
function boot() { const w = createWorld({ seed: 7 }); w.startNewGame(0); let f = 0; while (f < 1500) { w.run(30); f += 30; } return w; }
const workers = (S, G) => G.NPCS.filter(n => S.isWorker(n) && n.alive && !n.gone);

// --- MANAGER: a fire vacates the desk but queues NO auto-backfill ---
{
  const w = boot(), S = w.sandbox, G = w.g; G.player.rank = 5; G.pendingHires.length = 0;
  const v = workers(S, G)[0]; v.strikes = 1; const desk = G.desks.find(d => d.owner === v.name);
  S.managerFire(v);
  ck('MANAGER fire: the desk is vacated', desk.owner === null);
  ck('MANAGER fire: no auto-backfill is queued', !G.pendingHires.some(h => h.desk === desk));
}

// --- below MANAGER: a fire still auto-backfills (unchanged) ---
{
  const w = boot(), S = w.sandbox, G = w.g; G.player.rank = 2; G.pendingHires.length = 0;
  const v = workers(S, G)[0]; const desk = G.desks.find(d => d.owner === v.name);
  S.fireNPC(v);
  ck('below Manager: a fired desk is still queued for backfill', G.pendingHires.some(h => h.desk === desk));
}

// --- MANAGER: no rival climbs upstairs, no open chair auto-fills ---
{
  const w = boot(), S = w.sandbox, G = w.g; G.player.rank = 5;
  workers(S, G).filter(n => S.npcRank(n) === 2).forEach(n => n.career = 99);   // seniors "ready" to climb
  const before = workers(S, G).length;
  S.rivalsClimb();
  ck('MANAGER: rivalsClimb sends no one upstairs', workers(S, G).length === before);
  G.career.reqs = [{ tier: 1, day: G.day }];
  const salesBefore = workers(S, G).filter(n => S.npcRank(n) === 1).length;
  S.resolveReqs();
  ck('MANAGER: resolveReqs does not auto-fill an open chair', workers(S, G).filter(n => S.npcRank(n) === 1).length === salesBefore);
  ck('MANAGER: the open requisitions are cleared, not filled', G.career.reqs.length === 0);
}

// --- below MANAGER: a ready senior can still be taken upstairs ---
{
  const w = boot(), S = w.sandbox, G = w.g; G.player.rank = 2;
  workers(S, G).filter(n => S.npcRank(n) === 2).forEach(n => n.career = 99);
  let sent = false; for (let i = 0; i < 15 && !sent; i++) { const b = workers(S, G).length; S.rivalsClimb(); if (workers(S, G).length < b) sent = true; }
  ck('below Manager: a ready senior can still be sent upstairs', sent);
}

// --- the player's own hire (hireWorker) still lands — the freeze is only on HR's automatic moves ---
{
  const w = boot(), S = w.sandbox, G = w.g; G.player.rank = 5;
  const v = workers(S, G)[0]; v.strikes = 1; S.managerFire(v);       // open a vacancy (no auto-backfill)
  G.career.hireReqs = 1; G.pendingHires.length = 0;
  ck('your own requisition hire still files while managing', S.hireWorker() === true && G.pendingHires.length === 1);
}

// --- a Manager who fires and never hires lets the floor thin out, with no seat violations ---
{
  const w = boot(), S = w.sandbox, G = w.g; G.player.rank = 5;
  const before = w.stats.seatViolations;
  workers(S, G).slice(0, 2).forEach(n => { n.strikes = 1; S.managerFire(n); });
  w.run(6000, { onDay: () => { G.player.rank = 5; } });
  ck('the floor thins with no seat/desk/rank violations', w.stats.seatViolations === before, w.stats.firstSeatViolation || '');
  ck('run stayed alive', G.gameOver === false);
}

console.log(`\nHR FREEZE AT MANAGER: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
