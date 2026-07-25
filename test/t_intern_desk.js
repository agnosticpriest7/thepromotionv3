/* INTERN -> JUNIOR SALES desk move (branch: intern-desk-move). The intern nook desks (x660) are
   tier 0 — the SAME tier youTier() gives Junior Sales — so movePlayerDesk() saw "already at tier 0"
   and never walked the player out of the corner on promotion. Fix: the nook desks carry intern:true;
   an intern desk never counts as "already there" and is never a move destination, so promotion to
   Junior relocates the player into a junior-area desk and the nook backfills behind them. */
const { createWorld } = require('./harness');
let pass = 0, fail = 0;
const ck = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? '  [' + x + ']' : ''}`); c ? pass++ : fail++; };
function world() { const w = createWorld({ seed: 7 }); w.startNewGame(0); let f = 0; while (f < 1500) { w.run(30); f += 30; } return w; }
const myDesk = G => G.desks.find(d => d.owner === 'you');

// --- (1) the intern starts on an intern-flagged tier-0 desk ---
{
  const w = world(), S = w.sandbox, G = w.g;
  const d0 = myDesk(G);
  ck('intern starts on an intern-flagged desk', !!d0 && d0.intern === true && (d0.tier | 0) === 0);
  ck('rank is INTERN, youTier is -1 (not on the ladder)', G.player.rank === 0 && S.youTier() === -1);
}

// --- (2) promoting Intern -> Junior Sales MOVES the desk (the bug) ---
{
  const w = world(), S = w.sandbox, G = w.g;
  const d0 = myDesk(G);
  G.player.prog = 100; S.tryPromote();
  const d1 = myDesk(G);
  ck('promoted to JUNIOR SALES', G.player.rank === 1, G.RANKS[G.player.rank]);
  ck('the player desk actually MOVED', !!d1 && d1 !== d0);
  ck('the new desk is a real junior chair, not the intern nook', !!d1 && d1.intern !== true && (d1.tier | 0) === 0);
  ck('the old intern nook is no longer the player\'s', d0.owner !== 'you');
  ck('exactly one desk is owned by you', G.desks.filter(d => d.owner === 'you').length === 1);
  const owners = G.desks.filter(d => d.owner && d.owner !== 'you').map(d => d.owner);
  ck('no desk is double-owned', new Set(owners).size === owners.length);
}

// --- (3) the floor stays consistent after the move (no seat violations, world alive) ---
{
  const w = world(), S = w.sandbox, G = w.g;
  G.player.prog = 100; S.tryPromote();
  const before = w.stats.seatViolations;
  w.run(6000);
  ck('no seat/desk/rank violations after the move + nook backfill', w.stats.seatViolations === before, w.stats.firstSeatViolation || '');
  ck('run stayed alive', G.gameOver === false);
}

// --- (4) the move survives a save round-trip; the nook keeps its intern flag ---
{
  const w = world(), S = w.sandbox, G = w.g;
  G.player.prog = 100; S.tryPromote();
  const juniorX = Math.round(myDesk(G).x), juniorY = Math.round(myDesk(G).y);
  const save = w.rawSave(); const snap = save.buildSnapshot(false, null);
  myDesk(G).owner = null;                    // clobber, then restore
  save.applySnapshot(snap);
  const back = myDesk(G);
  ck('player is still at the junior desk after save/load', !!back && Math.round(back.x) === juniorX && Math.round(back.y) === juniorY && G.player.rank === 1);
  ck('the intern nook desks still carry the intern flag after load', G.desks.some(d => d.intern === true));
}

// --- (5) higher promotions still move by tier (regression guard on the shared function) ---
{
  const w = world(), S = w.sandbox, G = w.g;
  G.player.prog = 100; S.tryPromote();                 // -> JUNIOR (tier 0)
  const jr = myDesk(G);
  // open a SALES (tier 1) chair and satisfy the gate, then promote
  const t1 = G.NPCS.find(n => S.isWorker(n) && n.alive && !n.gone && (n.tier | 0) === 1);
  if (t1) { const d = G.desks.find(x => x.owner === t1.name); if (d) d.owner = null; t1.alive = false; t1.gone = true; }
  S.refreshRanks();
  G.player.prog = 100; S.tryPromote();                 // -> SALES (tier 1) if a chair opened
  const sd = myDesk(G);
  ck('Junior -> Sales still relocates to a tier-1 desk', G.player.rank !== 2 || (!!sd && sd !== jr && (sd.tier | 0) === 1), `rank=${G.RANKS[G.player.rank]} tier=${sd && sd.tier}`);
}

console.log(`\nINTERN->JUNIOR DESK MOVE: ${fail === 0 ? 'GREEN ✅' : 'RED ❌'} (${pass} pass, ${fail} fail)`);
process.exit(fail === 0 ? 0 : 1);
